-module(whist_ws_handler).
-behaviour(cowboy_websocket).

-include("whist.hrl").

-export([init/2]).
-export([websocket_init/1]).
-export([websocket_handle/2]).
-export([websocket_info/2]).
-export([terminate/3]).

%% @doc Upgrade the HTTP connection to WebSocket.
init(Req, _State) ->
    QsVals = cowboy_req:parse_qs(Req),
    Mode = case lists:keyfind(~"mode", 1, QsVals) of
        {_, ~"offline"} -> offline;
        _ -> online
    end,
    Username = case lists:keyfind(~"username", 1, QsVals) of
        {_, UserVal} when UserVal =/= <<>> -> UserVal;
        _ -> null
    end,
    Opts = #{idle_timeout => 86400000},
    {cowboy_websocket, Req, #ws_state{mode = Mode, username = Username}, Opts}.

%% @doc Initialize the WebSocket state. Spawns offline bot game immediately if requested.
websocket_init(#ws_state{mode = offline, username = Username} = State) ->
    {ok, GamePid} = whist_game:start_link(~"offline", offline),
    Role = case Username of
        null -> ~"You";
        User -> User
    end,
    ok = gen_server:call(GamePid, {join, self(), Role}),
    {ok, State#ws_state{game_pid = GamePid, room_id = ~"offline"}};
websocket_init(State) ->
    {ok, State}.

%% @doc Receives and decodes incoming JSON WebSocket frames from the client.
websocket_handle({text, FrameData}, State) ->
    log_server_interaction(io_lib:format("WS Received: ~s", [FrameData])),
    try
        Map = json:decode(FrameData),
        handle_action(Map, State)
    catch
        Class:Reason:Stacktrace ->
            io:format("Error decoding/handling WS message: ~p:~p~n~p~n", [Class, Reason, Stacktrace]),
            {ok, State}
    end;
websocket_handle(_Frame, State) ->
    {ok, State}.

%% @doc Receives Erlang process mailbox messages and pushes them down to the client as WebSocket frames.
websocket_info({send_state, StateJson}, State) ->
    log_server_interaction(io_lib:format("WS Sent: ~s", [StateJson])),
    {reply, {text, StateJson}, State};
websocket_info({'DOWN', _Ref, process, GamePid, _Reason}, #ws_state{game_pid = GamePid} = State) when GamePid =/= nil ->
    whist_utils:log("WS Handler: Game process ~p terminated. Clearing game state.", [GamePid]),
    %% Notify client that the room was closed
    self() ! {send_state, json:encode(#{~"type" => ~"room_closed"})},
    {ok, State#ws_state{game_pid = nil, room_id = nil}};
websocket_info({'DOWN', _Ref, process, _, _}, State) ->
    {ok, State};
websocket_info(_Info, State) ->
    {ok, State}.

%% @doc Cleans up and notifies room manager or terminates session upon socket disconnect.
terminate(_Reason, _Req, #ws_state{game_pid = GamePid, room_id = RoomId}) when GamePid =/= nil ->
    case RoomId of
        ~"offline" ->
            catch gen_server:stop(GamePid);
        _ ->
            whist_room_manager:leave_room(RoomId, self())
    end,
    ok;
terminate(_Reason, _Req, _State) ->
    ok.

%% ===================================================================
%% Internal Handlers for JSON Actions
%% ===================================================================

%% @doc Client message: create a new room
%% Expected JSON: { "action": "create_room", "name": "Room Name", "password": null }
handle_action(#{~"action" := ~"client_log", ~"message" := Msg}, State) ->
    log_server_interaction(io_lib:format("Client Log: ~s", [Msg])),
    {ok, State};

handle_action(#{~"action" := ~"ping"}, State) ->
    self() ! {send_state, json:encode(#{~"type" => ~"pong"})},
    {ok, State};

handle_action(#{~"action" := ~"register", ~"username" := Username, ~"password" := Password}, State) ->
    Response = case whist_db:register_profile(Username, Password) of
        ok ->
            #{~"type" => ~"register_response", ~"status" => ~"ok"};
        {error, Reason} ->
            #{~"type" => ~"register_response", ~"status" => ~"error", ~"reason" => list_to_binary(io_lib:format("~p", [Reason]))}
    end,
    self() ! {send_state, json:encode(Response)},
    {ok, State};

handle_action(#{~"action" := ~"login", ~"username" := Username, ~"password" := Password}, State) ->
    case whist_db:login_profile(Username, Password) of
        {ok, Profile} ->
            Response = #{
                ~"type" => ~"login_response",
                ~"status" => ~"ok",
                ~"username" => Profile#player_profile.username,
                ~"games_played" => Profile#player_profile.games_played,
                ~"games_won" => Profile#player_profile.games_won,
                ~"total_score" => Profile#player_profile.total_score
            },
            self() ! {send_state, json:encode(Response)},
            {ok, State#ws_state{username = Username}};
        {error, Reason} ->
            Response = #{
                ~"type" => ~"login_response",
                ~"status" => ~"error",
                ~"reason" => list_to_binary(io_lib:format("~p", [Reason]))
            },
            self() ! {send_state, json:encode(Response)},
            {ok, State}
    end;

handle_action(#{~"action" := ~"create_room", ~"name" := Name} = Msg, State) ->
    Password = maps:get(~"password", Msg, null),
    Role = case State#ws_state.username of
        null -> ~"player";
        User -> User
    end,
    case whist_room_manager:create_room(Name, Password) of
        {ok, RoomId} ->
            %% Automatically join the player to the room they created
            case whist_room_manager:join_room(RoomId, Password, Role, self()) of
                {ok, GamePid} ->
                    _ = monitor(process, GamePid),
                    {ok, State#ws_state{game_pid = GamePid, room_id = RoomId}};
                {error, Reason} ->
                    send_error(~"failed_to_join_created_room", Reason),
                    {ok, State}
            end;
        {error, Reason} ->
            send_error(~"create_room_failed", Reason),
            {ok, State}
    end;

%% @doc Client message: join an existing room
%% Expected JSON: { "action": "join_room", "room_id": "room-1", "password": null, "role": "player" }
handle_action(#{~"action" := ~"join_room", ~"room_id" := RoomId} = Msg, State) ->
    Password = maps:get(~"password", Msg, null),
    RoleInput = maps:get(~"role", Msg, ~"player"),
    Role = case RoleInput of
        ~"spectator" -> ~"spectator";
        _ ->
            case State#ws_state.username of
                null -> ~"player";
                User -> User
            end
    end,
    case whist_room_manager:join_room(RoomId, Password, Role, self()) of
        {ok, GamePid} ->
            _ = monitor(process, GamePid),
            {ok, State#ws_state{game_pid = GamePid, room_id = RoomId}};
        {error, Reason} ->
            send_error(~"join_room_failed", Reason),
            {ok, State}
    end;

%% @doc Client message: leave current room
%% Expected JSON: { "action": "leave_room" }
handle_action(#{~"action" := ~"leave_room"}, #ws_state{room_id = RoomId} = State) when RoomId =/= nil ->
    case RoomId of
        ~"offline" ->
            catch gen_server:stop(State#ws_state.game_pid);
        _ ->
            whist_room_manager:leave_room(RoomId, self())
    end,
    %% Send clean initial server selection state back to client
    InitialState = #{
        ~"current_stage" => ~"LOBBY",
        ~"players" => [],
        ~"my_hand" => [],
        ~"table_cards" => [],
        ~"prompt_data" => null,
        ~"trick_winner" => null,
        ~"winner" => null
    },
    self() ! {send_state, json:encode(InitialState)},
    {ok, State#ws_state{game_pid = nil, room_id = nil}};

%% @doc Client message: request list of available rooms
handle_action(#{~"action" := ~"list_rooms"}, State) ->
    Rooms = whist_room_manager:list_rooms(),
    Response = #{
        ~"type" => ~"rooms_list",
        ~"rooms" => Rooms
    },
    self() ! {send_state, json:encode(Response)},
    {ok, State};

%% @doc Forward game-stage actions (e.g. bet, play_card, ready_next_round) to the session coordinator
handle_action(#{~"action" := Action} = Msg, #ws_state{game_pid = GamePid} = State) when GamePid =/= nil ->
    gen_server:cast(GamePid, {action, Action, self(), Msg}),
    {ok, State};

handle_action(Msg, State) ->
    io:format("Unrecognized or unrouted WS message: ~p~n", [Msg]),
    {ok, State}.

send_error(Type, Reason) ->
    ErrorMap = #{
        ~"type" => ~"error",
        ~"error_type" => Type,
        ~"reason" => io_lib:format("~p", [Reason])
    },
    self() ! {send_state, json:encode(ErrorMap)}.

get_timestamp_str() ->
    {{Year, Month, Day}, {Hour, Min, Sec}} = calendar:local_time(),
    lists:flatten(io_lib:format("~4..0B-~2..0B-~2..0B ~2..0B:~2..0B:~2..0B", [Year, Month, Day, Hour, Min, Sec])).

log_server_interaction(Msg) ->
    LogLine = io_lib:format("~s [Server] ~s~n", [get_timestamp_str(), Msg]),
    file:write_file("interactions.log", LogLine, [append]).
