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
    {ok, #room_manager_state{}}.

handle_call({create_room, Name, Password}, _From, State) ->
    NextId = State#room_manager_state.room_counter + 1,
    RoomId = <<~"room-"/binary, (integer_to_binary(NextId))/binary>>,
    %% Start the game session server in online mode
    {ok, GamePid} = whist_game:start_link(RoomId, online),
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

handle_call({join_room, RoomId, Password, Role, ConnPid}, _From, State) ->
    case maps:find(RoomId, State#room_manager_state.rooms) of
        {ok, Room} ->
            case check_password(Password, Room#room.password) of
                true ->
                    %% Ask the game session server to register the player connection
                    case gen_server:call(Room#room.game_pid, {join, ConnPid, Role}) of
                        ok ->
                            NewRoom = Room#room{players = [ConnPid | Room#room.players]},
                            NewRooms = maps:put(RoomId, NewRoom, State#room_manager_state.rooms),
                            {reply, {ok, Room#room.game_pid}, State#room_manager_state{rooms = NewRooms}};
                        {error, Reason} ->
                            {reply, {error, Reason}, State}
                    end;
                false ->
                    {reply, {error, invalid_password}, State}
            end;
        error ->
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
    NewRooms = case maps:find(RoomId, State#room_manager_state.rooms) of
        {ok, Room} ->
            NewPlayers = lists:delete(ConnPid, Room#room.players),
            %% Notify game of leave
            gen_server:cast(Room#room.game_pid, {leave, ConnPid}),
            %% If room is empty, we clean it up.
            case NewPlayers of
                [] ->
                    %% Stop the game process
                    catch gen_server:stop(Room#room.game_pid),
                    maps:remove(RoomId, State#room_manager_state.rooms);
                _ ->
                    maps:put(RoomId, Room#room{players = NewPlayers}, State#room_manager_state.rooms)
            end;
        error ->
            State#room_manager_state.rooms
    end,
    {noreply, State#room_manager_state{rooms = NewRooms}};

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'DOWN', _Ref, process, Pid, _Reason}, State) ->
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
