-module(whist_room_manager).
-behaviour(gen_server).

-include("whist.hrl").

%% API
-export([start_link/0, create_room/2, join_room/4, leave_room/2, list_rooms/0]).

%% gen_server callbacks
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

create_room(Name, Password) ->
    gen_server:call(?MODULE, {create_room, Name, Password}).

join_room(RoomId, Password, Role, ConnPid) ->
    gen_server:call(?MODULE, {join_room, RoomId, Password, Role, ConnPid}).

leave_room(RoomId, ConnPid) ->
    gen_server:cast(?MODULE, {leave_room, RoomId, ConnPid}).

list_rooms() ->
    gen_server:call(?MODULE, list_rooms).

%% gen_server callbacks

init([]) ->
    ok = whist_db:init(),
    %% Load existing rooms from Mnesia
    SavedRooms = whist_db:load_rooms(),
    RoomsMap = lists:foldl(fun(R, Acc) ->
        RoomId = R#room_db.id,
        Name = R#room_db.name,
        Password = R#room_db.password,
        SavedRulesState = R#room_db.rules_state,
        
        whist_utils:log("Room Manager: Restoring room ~s (~s) from database", [RoomId, Name]),
        
        case whist_game:start_link(RoomId, online, Name, Password, SavedRulesState) of
            {ok, GamePid} ->
                _Ref = monitor(process, GamePid),
                RoomRecord = #room{
                    id = RoomId,
                    name = Name,
                    password = Password,
                    game_pid = GamePid,
                    players = [] %% Connections will join on reconnect
                },
                maps:put(RoomId, RoomRecord, Acc);
            {error, Reason} ->
                whist_utils:log("Room Manager: Failed to restore room ~s: ~p", [RoomId, Reason]),
                Acc
        end
    end, #{}, SavedRooms),
    
    %% Compute room counter from restored room IDs
    RoomCounter = lists:foldl(fun(R, Max) ->
        case binary:split(R#room_db.id, <<"-">>) of
            [_, IdBin] ->
                try
                    erlang:max(Max, binary_to_integer(IdBin))
                catch _:_ -> Max
                end;
            _ -> Max
        end
    end, 0, SavedRooms),
    
    {ok, #room_manager_state{rooms = RoomsMap, room_counter = RoomCounter}}.

handle_call({create_room, Name, Password}, _From, State) ->
    NextId = State#room_manager_state.room_counter + 1,
    RoomId = <<~"room-"/binary, (integer_to_binary(NextId))/binary>>,
    whist_utils:log("Room Manager: Creating Room: ~s (ID: ~s, Private: ~p)", [Name, RoomId, Password =/= null]),
    %% Start the game session server in online mode with name and password
    case whist_game:start_link(RoomId, online, Name, Password) of
        {ok, GamePid} ->
            whist_utils:log("Room Manager: Spawned whist_game process: ~p", [GamePid]),
            _Ref = monitor(process, GamePid),
            Room = #room{
                id = RoomId,
                name = Name,
                password = Password,
                game_pid = GamePid,
                players = []
            },
            NewRooms = maps:put(RoomId, Room, State#room_manager_state.rooms),
            {reply, {ok, RoomId}, State#room_manager_state{rooms = NewRooms, room_counter = NextId}};
        {error, StartReason} ->
            whist_utils:log("Room Manager: Failed to start whist_game process: ~p", [StartReason]),
            {reply, {error, StartReason}, State}
    end;

handle_call({join_room, RoomId, Password, Role, ConnPid}, _From, State) ->
    whist_utils:log("Room Manager: Join Request for room ~s, Role: ~s, Pid: ~p", [RoomId, Role, ConnPid]),
    case maps:find(RoomId, State#room_manager_state.rooms) of
        {ok, Room} ->
            case check_password(Password, Room#room.password) of
                true ->
                    %% Ask the game session server to register the player connection
                    case gen_server:call(Room#room.game_pid, {join, ConnPid, Role}) of
                        ok ->
                            whist_utils:log("Room Manager: Successfully joined room ~s, game pid ~p", [RoomId, Room#room.game_pid]),
                            NewPlayers = case lists:member(ConnPid, Room#room.players) of
                                true -> Room#room.players;
                                false -> [ConnPid | Room#room.players]
                            end,
                            NewRoom = Room#room{players = NewPlayers},
                            NewRooms = maps:put(RoomId, NewRoom, State#room_manager_state.rooms),
                            {reply, {ok, Room#room.game_pid}, State#room_manager_state{rooms = NewRooms}};
                        {error, Reason} ->
                            whist_utils:log("Room Manager: Game session refused join: ~p", [Reason]),
                            {reply, {error, Reason}, State}
                    end;
                false ->
                    whist_utils:log("Room Manager: Invalid password for room ~s", [RoomId]),
                    {reply, {error, invalid_password}, State}
            end;
        error ->
            whist_utils:log("Room Manager: Room ID ~s not found", [RoomId]),
            {reply, {error, room_not_found}, State}
    end;

handle_call(list_rooms, _From, State) ->
    List = [#{
        id => R#room.id,
        name => R#room.name,
        players => length(R#room.players),
        maxPlayers => ?MAX_PLAYERS,
        hasPassword => R#room.password =/= null
    } || R <- maps:values(State#room_manager_state.rooms)],
    {reply, List, State};

handle_call(_Request, _From, State) ->
    {reply, ok, State}.

handle_cast({leave_room, RoomId, ConnPid}, State) ->
    whist_utils:log("Room Manager: Leave Request for room ~s from Pid: ~p", [RoomId, ConnPid]),
    NewRooms = case maps:find(RoomId, State#room_manager_state.rooms) of
        {ok, Room} ->
            NewPlayers = lists:delete(ConnPid, Room#room.players),
            %% Notify game of leave
            gen_server:cast(Room#room.game_pid, {leave, ConnPid}),
            %% If room is empty, we check if the game has started.
            %% If it is still in the lobby, we clean it up.
            %% If it has started, we keep the process alive so players can reconnect!
            RulesState = gen_server:call(Room#room.game_pid, get_rules_state),
            IsLobby = RulesState#rules_state.stage =:= lobby,
            case {NewPlayers, IsLobby} of
                {[], true} ->
                    whist_utils:log("Room Manager: Room ~s is empty in lobby, stopping game pid ~p", [RoomId, Room#room.game_pid]),
                    %% Stop the game process
                    catch gen_server:stop(Room#room.game_pid),
                    maps:remove(RoomId, State#room_manager_state.rooms);
                _ ->
                    maps:put(RoomId, Room#room{players = NewPlayers}, State#room_manager_state.rooms)
            end;
        error ->
            whist_utils:log("Room Manager: Room ~s not found for leave request", [RoomId]),
            State#room_manager_state.rooms
    end,
    {noreply, State#room_manager_state{rooms = NewRooms}};

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'DOWN', _Ref, process, Pid, Reason}, State) ->
    whist_utils:log("Room Manager: whist_game process down: ~p, Reason: ~p", [Pid, Reason]),
    %% Clean up room if its game process crashed/stopped
    NewRooms = maps:filter(
        fun(_, R) -> R#room.game_pid =/= Pid end,
        State#room_manager_state.rooms
    ),
    {noreply, State#room_manager_state{rooms = NewRooms}};

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.

%% Helpers
check_password(null, null) -> true;
check_password(P, P) -> true;
check_password(_, _) -> false.
