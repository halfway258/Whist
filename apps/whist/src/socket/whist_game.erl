-module(whist_game).
-behaviour(gen_server).

-include("whist.hrl").

%% API
-export([start_link/2]).

%% gen_server callbacks
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

%% ===================================================================
%% API Functions
%% ===================================================================

start_link(RoomId, Mode) ->
    gen_server:start_link(?MODULE, [RoomId, Mode], []).

%% ===================================================================
%% gen_server Callbacks
%% ===================================================================

init([RoomId, Mode]) ->
    RulesState = whist_rules:init(Mode),
    {ok, #game_session_state{
        room_id = RoomId,
        mode = Mode,
        rules_state = RulesState
    }}.

%% @doc Handles client connection joins.
%% Expected Payload: {join, ConnPid, Role}
%% Expected Output: ok | {error, Reason}
%% @doc Handles client connection joins.
%% Expected Payload: {join, ConnPid, Role}
%% Expected Output: ok | {error, Reason}
handle_call({join, ConnPid, Role}, _From, State) ->
    whist_utils:log("whist_game (~s): Join requested by Pid: ~p, Role: ~s", [State#game_session_state.room_id, ConnPid, Role]),
    case Role of
        ~"spectator" ->
            NewSpecs = [ConnPid | State#game_session_state.spectators],
            NewState = State#game_session_state{spectators = NewSpecs},
            
            %% Send initial state to the spectator
            StateMap = whist_rules:make_state_map(State#game_session_state.rules_state, ~"spectator"),
            ConnPid ! {send_state, json:encode(StateMap)},
            
            {reply, ok, NewState};
        _ ->
            PlayersCount = length(whist_rules:players(State#game_session_state.rules_state)),
            case PlayersCount of
                ?MAX_PLAYERS ->
                    whist_utils:log("whist_game (~s): Room full, refusing join", [State#game_session_state.room_id]),
                    {reply, {error, room_full}, State};
                _ ->
                    PlayerId = list_to_binary(io_lib:format("p~p", [PlayersCount + 1])),
                    Name = case State#game_session_state.mode of
                        offline -> ~"You";
                        online -> list_to_binary(io_lib:format("Player ~p", [PlayersCount + 1]))
                    end,
                    whist_utils:log("whist_game (~s): Assigning ID: ~s, Name: ~s", [State#game_session_state.room_id, PlayerId, Name]),
                    case whist_rules:join(PlayerId, Name, false, State#game_session_state.rules_state) of
                        {ok, NewRulesState} ->
                            NewConns = maps:put(PlayerId, ConnPid, State#game_session_state.connections),
                            NewState = State#game_session_state{
                                rules_state = NewRulesState,
                                connections = NewConns
                            },
                            
                            broadcast_state(NewState),
                            
                            %% If we transitioned into the dealing phase (due to room full or offline mode starting),
                            %% schedule the transition to the betting phase.
                            case whist_rules:stage(NewRulesState) of
                                dealing ->
                                    whist_utils:log("whist_game (~s): stage = dealing, scheduling start_betting", [State#game_session_state.room_id]),
                                    erlang:send_after(?DEALING_DELAY, self(), start_betting);
                                _ ->
                                    ok
                            end,
                            
                            {reply, ok, NewState};
                        {error, Reason} ->
                            whist_utils:log("whist_game (~s): whist_rules:join failed: ~p", [State#game_session_state.room_id, Reason]),
                            {reply, {error, Reason}, State}
                    end
            end
    end;

handle_call(_Request, _From, State) ->
    {reply, ok, State}.

%% @doc Handles client disconnects and explicit actions.
handle_cast({leave, ConnPid}, State) ->
    whist_utils:log("whist_game (~s): leave request from Pid: ~p", [State#game_session_state.room_id, ConnPid]),
    case lists:member(ConnPid, State#game_session_state.spectators) of
        true ->
            NewSpecs = lists:delete(ConnPid, State#game_session_state.spectators),
            {noreply, State#game_session_state{spectators = NewSpecs}};
        false ->
            case find_player_id_by_conn(ConnPid, State#game_session_state.connections) of
                {ok, PlayerId} ->
                    case State#game_session_state.mode of
                        online ->
                            RulesState = State#game_session_state.rules_state,
                            NewConns = maps:remove(PlayerId, State#game_session_state.connections),
                            case maps:size(NewConns) of
                                0 ->
                                    %% No more human players left in the session! Terminate the session process!
                                    whist_utils:log("whist_game (~s): No human players remaining. Stopping game process.", [State#game_session_state.room_id]),
                                    {stop, normal, State};
                                _ ->
                                    %% There are still other human players connected!
                                    case RulesState#rules_state.stage of
                                        lobby ->
                                            %% Remove the player from the lobby's players list
                                            NewPlayers = lists:filter(
                                                fun(P) -> maps:get(~"id", P) =/= PlayerId end,
                                                RulesState#rules_state.players
                                            ),
                                            %% Update remaining player IDs contiguously and re-index connections
                                            {UpdatedPlayers, UpdatedConns} = reindex_players_and_conns(NewPlayers, NewConns),
                                            NewRulesState = RulesState#rules_state{players = UpdatedPlayers},
                                            NewState = State#game_session_state{
                                                rules_state = NewRulesState,
                                                connections = UpdatedConns
                                            },
                                            broadcast_state(NewState),
                                            {noreply, NewState};
                                        _ ->
                                            %% Game in progress: replace leaving player with a bot
                                            NewRulesState = whist_rules:replace_with_bot(PlayerId, RulesState),
                                            NewState = State#game_session_state{
                                                rules_state = NewRulesState,
                                                connections = NewConns
                                            },
                                            broadcast_state(NewState),
                                            %% Triggers automated action if it is now the bot's turn
                                            schedule_bot_action(NewRulesState),
                                            {noreply, NewState}
                                    end
                            end;
                        offline ->
                            %% Stopping the process since offline user disconnected
                            {stop, normal, State}
                    end;
                error ->
                    {noreply, State}
            end
    end;

%% @doc Handles room chat messages
handle_cast({action, ~"chat", ConnPid, Msg}, State) ->
    case find_player_id_by_conn(ConnPid, State#game_session_state.connections) of
        {ok, PlayerId} ->
            RulesState = State#game_session_state.rules_state,
            Players = RulesState#rules_state.players,
            PlayerName = case lists:search(fun(P) -> maps:get(~"id", P) =:= PlayerId end, Players) of
                {value, P} -> maps:get(~"name", P);
                false -> ~"Unknown"
            end,
            Message = maps:get(~"message", Msg, ~""),
            ChatMsg = #{
                ~"type" => ~"chat_message",
                ~"player_name" => PlayerName,
                ~"message" => Message
            },
            broadcast_json(ChatMsg, State),
            {noreply, State};
        error ->
            %% Spectator chat
            case lists:member(ConnPid, State#game_session_state.spectators) of
                true ->
                    Message = maps:get(~"message", Msg, ~""),
                    ChatMsg = #{
                        ~"type" => ~"chat_message",
                        ~"player_name" => ~"Spectator",
                        ~"message" => Message
                    },
                    broadcast_json(ChatMsg, State),
                    {noreply, State};
                false ->
                    {noreply, State}
            end
    end;

%% @doc Handles ready toggle in waiting room
handle_cast({action, ~"ready_toggle", ConnPid, _Msg}, State) ->
    case find_player_id_by_conn(ConnPid, State#game_session_state.connections) of
        {ok, PlayerId} ->
            RulesState = State#game_session_state.rules_state,
            Players = RulesState#rules_state.players,
            NewPlayers = lists:map(
                fun(P) ->
                    case maps:get(~"id", P) of
                        PlayerId ->
                            CurrentStatus = maps:get(~"status", P, ~""),
                            NewStatus = case CurrentStatus of
                                ~"Ready" -> ~"";
                                _ -> ~"Ready"
                            end,
                            P#{~"status" => NewStatus};
                        _ ->
                            P
                    end
                end,
                Players
            ),
            NewRulesState = RulesState#rules_state{players = NewPlayers},
            NewState = State#game_session_state{rules_state = NewRulesState},
            broadcast_state(NewState),
            {noreply, NewState};
        error ->
            {noreply, State}
    end;

%% @doc Handles room closure by owner
handle_cast({action, ~"close_room", ConnPid, _Msg}, State) ->
    case find_player_id_by_conn(ConnPid, State#game_session_state.connections) of
        {ok, ~"p1"} ->
            %% Kick everyone back to lobby first
            broadcast_json(#{~"type" => ~"room_closed"}, State),
            {stop, normal, State};
        _ ->
            {noreply, State}
    end;

%% @doc Handles starting room early with bots by owner
handle_cast({action, ~"start_game", ConnPid, _Msg}, State) ->
    whist_utils:log("whist_game (~s): start_game early requested by Pid: ~p", [State#game_session_state.room_id, ConnPid]),
    case find_player_id_by_conn(ConnPid, State#game_session_state.connections) of
        {ok, ~"p1"} ->
            RulesState = State#game_session_state.rules_state,
            case RulesState#rules_state.stage of
                lobby ->
                    CurrentPlayers = RulesState#rules_state.players,
                    NumPlayers = length(CurrentPlayers),
                    whist_utils:log("whist_game (~s): starting game with ~p players. Filling with ~p bots.", [State#game_session_state.room_id, NumPlayers, 4 - NumPlayers]),
                    BotsNeeded = 4 - NumPlayers,
                    Bots = generate_bots(BotsNeeded, NumPlayers + 1),
                    AllPlayers = CurrentPlayers ++ Bots,
                    NewRulesState = RulesState#rules_state{
                        players = AllPlayers,
                        stage = dealing,
                        round = 1
                    },
                    NewState = State#game_session_state{rules_state = NewRulesState},
                    broadcast_state(NewState),
                    whist_utils:log("whist_game (~s): Dealing phase started, scheduling start_betting", [State#game_session_state.room_id]),
                    erlang:send_after(?DEALING_DELAY, self(), start_betting),
                    {noreply, NewState};
                _ ->
                    whist_utils:log("whist_game (~s): start_game early ignored since stage is ~p", [State#game_session_state.room_id, RulesState#rules_state.stage]),
                    {noreply, State}
            end;
        _ ->
            whist_utils:log("whist_game (~s): start_game early ignored (sender is not p1)", [State#game_session_state.room_id]),
            {noreply, State}
    end;

%% Expected client actions forwarded from websocket:
%% 1. BET:
%%    { "action": "bet", "takes": 5, "suit": "clubs" }
%% 2. PLAY CARD:
%%    { "action": "play_card", "card": { "suit": "hearts", "value": 14 } }
%% 3. READY NEXT ROUND:
%%    { "action": "ready_next_round" }
%% 4. RETURN MENU:
%%    { "action": "return_menu" }
handle_cast({action, Action, ConnPid, Msg}, State) ->
    case find_player_id_by_conn(ConnPid, State#game_session_state.connections) of
        {ok, PlayerId} ->
            handle_player_action(Action, PlayerId, Msg, State);
        error ->
            {noreply, State}
    end;

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(start_betting, State) ->
    whist_utils:log("whist_game (~s): start_betting event fired", [State#game_session_state.room_id]),
    {ok, ShuffledState} = whist_rules:deal(State#game_session_state.rules_state),
    {ok, BettingState} = whist_rules:start_betting(ShuffledState),
    NewState = State#game_session_state{rules_state = BettingState},
    broadcast_state(NewState),
    schedule_bot_action(BettingState),
    {noreply, NewState};

handle_info(clear_trick, State) ->
    {ok, ClearedRulesState} = whist_rules:clear_trick(State#game_session_state.rules_state),
    NewState = State#game_session_state{rules_state = ClearedRulesState},
    broadcast_state(NewState),
    
    %% If we transitioned into a new dealing phase (round completed), schedule next round betting
    case whist_rules:stage(ClearedRulesState) of
        dealing ->
            erlang:send_after(?DEALING_DELAY, self(), start_betting);
        _ ->
            schedule_bot_action(ClearedRulesState)
    end,
    {noreply, NewState};

handle_info(bot_bet, State) ->
    RulesState = State#game_session_state.rules_state,
    case whist_rules:stage(RulesState) of
        betting ->
            BotId = whist_rules:current_turn(RulesState),
            case whist_rules:is_bot_turn(RulesState) of
                true ->
                    {ok, NewRulesState} = whist_rules:bot_bid(BotId, RulesState),
                    NewState = State#game_session_state{rules_state = NewRulesState},
                    broadcast_state(NewState),
                    schedule_bot_action(NewRulesState),
                    {noreply, NewState};
                false ->
                    {noreply, State}
            end;
        _ ->
            {noreply, State}
    end;

handle_info(bot_play, State) ->
    RulesState = State#game_session_state.rules_state,
    case whist_rules:stage(RulesState) of
        playing ->
            BotId = whist_rules:current_turn(RulesState),
            case whist_rules:is_bot_turn(RulesState) of
                true ->
                    case whist_rules:bot_play_card(BotId, RulesState) of
                        {ok, Card} ->
                            {noreply, apply_card_play(BotId, Card, State)};
                        {error, _Reason} ->
                            {noreply, State}
                    end;
                false ->
                    {noreply, State}
            end;
        _ ->
            {noreply, State}
    end;

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.

%% ===================================================================
%% Internal Helpers
%% ===================================================================

find_player_id_by_conn(ConnPid, Connections) ->
    maps:fold(
        fun(Id, Pid, Acc) ->
            if Pid =:= ConnPid -> {ok, Id};
               true -> Acc
            end
        end,
        error,
        Connections
    ).

handle_player_action(~"update_settings", PlayerId, Msg, State) ->
    RulesState = State#game_session_state.rules_state,
    IsAllowed = (RulesState#rules_state.stage =:= lobby) andalso (PlayerId =:= ~"p1"),
    case IsAllowed of
        true ->
            ClientSettings = maps:get(~"settings", Msg, #{}),
            CurrentSettings = RulesState#rules_state.settings,
            NewSettings = maps:merge(CurrentSettings, ClientSettings),
            NewRulesState = RulesState#rules_state{
                settings = NewSettings
            },
            NewState = State#game_session_state{rules_state = NewRulesState},
            broadcast_state(NewState),
            {noreply, NewState};
        false ->
            {noreply, State}
    end;

handle_player_action(~"bet", PlayerId, Msg, State) ->
    %% Expected format: { "action": "bet", "takes": Integer, "suit": String }
    Takes = maps:get(~"takes", Msg),
    Suit = maps:get(~"suit", Msg, null),
    
    RulesState = State#game_session_state.rules_state,
    case whist_rules:stage(RulesState) =:= betting andalso whist_rules:current_turn(RulesState) =:= PlayerId of
        true ->
            case whist_rules:bet(PlayerId, Takes, Suit, RulesState) of
                {ok, NewRulesState} ->
                    NewState = State#game_session_state{rules_state = NewRulesState},
                    broadcast_state(NewState),
                    schedule_bot_action(NewRulesState),
                    {noreply, NewState};
                 {error, _Reason} ->
                    {noreply, State}
            end;
        false ->
            {noreply, State}
    end;

handle_player_action(~"exchange_cards", PlayerId, Msg, State) ->
    %% Expected format: { "action": "exchange_cards", "cards": [Card1, Card2] }
    Cards = maps:get(~"cards", Msg),
    RulesState = State#game_session_state.rules_state,
    case whist_rules:stage(RulesState) =:= betting andalso RulesState#rules_state.bidding_stage =:= exchange of
        true ->
            case whist_rules:exchange_cards(PlayerId, Cards, RulesState) of
                {ok, NewRulesState} ->
                    NewState = State#game_session_state{rules_state = NewRulesState},
                    broadcast_state(NewState),
                    case whist_rules:stage(NewRulesState) of
                        dealing ->
                            erlang:send_after(?DEALING_DELAY, self(), start_betting);
                        _ ->
                            ok
                    end,
                    {noreply, NewState};
                {error, _Reason} ->
                    {noreply, State}
            end;
        false ->
            {noreply, State}
    end;

handle_player_action(~"play_card", PlayerId, Msg, State) ->
    %% Expected format: { "action": "play_card", "card": { "suit": String, "value": Integer } }
    Card = maps:get(~"card", Msg),
    RulesState = State#game_session_state.rules_state,
    
    case whist_rules:stage(RulesState) =:= playing andalso whist_rules:current_turn(RulesState) =:= PlayerId of
        true ->
            Hand = whist_rules:get_hand(PlayerId, RulesState),
            case lists:member(Card, Hand) of
                true ->
                    {noreply, apply_card_play(PlayerId, Card, State)};
                false ->
                    send_error_to_player(PlayerId, ~"non_playable", ~"card_not_in_hand", State),
                    {noreply, State}
            end;
        false ->
            send_error_to_player(PlayerId, ~"non_playable", ~"not_your_turn", State),
            {noreply, State}
    end;

handle_player_action(~"ready_next_round", PlayerId, _Msg, State) ->
    RulesState = State#game_session_state.rules_state,
    case whist_rules:stage(RulesState) =:= round_end of
        true ->
            {ok, NewRulesState} = whist_rules:ready_next_round(PlayerId, RulesState),
            NewState = State#game_session_state{rules_state = NewRulesState},
            broadcast_state(NewState),
            
            case whist_rules:stage(NewRulesState) of
                dealing ->
                    erlang:send_after(?DEALING_DELAY, self(), start_betting);
                _ ->
                    ok
            end,
            {noreply, NewState};
        false ->
            {noreply, State}
    end;

handle_player_action(~"return_menu", _PlayerId, _Msg, State) ->
    RulesState = State#game_session_state.rules_state,
    case whist_rules:stage(RulesState) =:= game_over of
        true ->
            {ok, NewRulesState} = whist_rules:return_menu(RulesState),
            NewState = State#game_session_state{rules_state = NewRulesState},
            broadcast_state(NewState),
            {noreply, NewState};
        false ->
            {noreply, State}
    end;

handle_player_action(_Action, _PlayerId, _Msg, State) ->
    {noreply, State}.

apply_card_play(PlayerId, Card, State) ->
    case whist_rules:play_card(PlayerId, Card, State#game_session_state.rules_state) of
        {ok, NewRulesState, trick_complete} ->
            NewState = State#game_session_state{rules_state = NewRulesState},
            broadcast_state(NewState),
            erlang:send_after(?CLEAR_TRICK_DELAY, self(), clear_trick),
            NewState;
        {ok, NewRulesState} ->
            NewState = State#game_session_state{rules_state = NewRulesState},
            broadcast_state(NewState),
            schedule_bot_action(NewRulesState),
            NewState;
        {error, Reason} ->
            ReasonBin = list_to_binary(atom_to_list(Reason)),
            send_error_to_player(PlayerId, ~"non_playable", ReasonBin, State),
            State
    end.

send_error_to_player(PlayerId, ErrorType, Reason, State) ->
    case maps:find(PlayerId, State#game_session_state.connections) of
        {ok, ConnPid} ->
            ErrorMap = #{
                ~"type" => ~"error",
                ~"error_type" => ErrorType,
                ~"reason" => Reason
            },
            ConnPid ! {send_state, json:encode(ErrorMap)};
        error ->
            ok
    end.

schedule_bot_action(RulesState) ->
    case whist_rules:stage(RulesState) of
        betting ->
            case whist_rules:is_bot_turn(RulesState) of
                true -> erlang:send_after(?BOT_DELAY, self(), bot_bet);
                false -> ok
            end;
        playing ->
            case whist_rules:is_bot_turn(RulesState) of
                true -> erlang:send_after(?BOT_DELAY, self(), bot_play);
                false -> ok
            end;
        _ ->
            ok
    end.

broadcast_state(State) ->
    Players = whist_rules:players(State#game_session_state.rules_state),
    lists:foreach(
        fun(P) ->
            Id = maps:get(~"id", P),
            case maps:find(Id, State#game_session_state.connections) of
                {ok, ConnPid} ->
                    StateMap = whist_rules:make_state_map(State#game_session_state.rules_state, Id),
                    ConnPid ! {send_state, json:encode(StateMap)};
                error ->
                    ok
            end
        end,
        Players
    ),
    lists:foreach(
        fun(SpecPid) ->
            StateMap = whist_rules:make_state_map(State#game_session_state.rules_state, ~"spectator"),
            SpecPid ! {send_state, json:encode(StateMap)}
        end,
        State#game_session_state.spectators
    ).

broadcast_json(JsonMap, State) ->
    JsonStr = json:encode(JsonMap),
    %% Send to all player connections
    lists:foreach(
        fun(ConnPid) ->
            ConnPid ! {send_state, JsonStr}
        end,
        maps:values(State#game_session_state.connections)
    ),
    %% Send to all spectator connections
    lists:foreach(
        fun(SpecPid) ->
            SpecPid ! {send_state, JsonStr}
        end,
        State#game_session_state.spectators
    ).

generate_bots(0, _) -> [];
generate_bots(Count, Index) ->
    BotId = <<~"p"/binary, (integer_to_binary(Index))/binary>>,
    BotNames = [~"Alice", ~"Bob", ~"Carol", ~"David", ~"Eve"],
    BotName = lists:nth(((Index - 1) rem length(BotNames)) + 1, BotNames),
    Bot = #{
        ~"id" => BotId,
        ~"name" => <<BotName/binary, ~" (Bot)"/binary>>,
        ~"score" => 0,
        ~"tricks_taken" => 0,
        ~"is_turn" => false,
        ~"cards_played" => [],
        ~"bet" => null,
        ~"status" => ~"",
        ~"bot" => true
    },
    [Bot | generate_bots(Count - 1, Index + 1)].

reindex_players_and_conns(Players, Conns) ->
    {UpdatedPlayers, _, UpdatedConns} = lists:foldl(
        fun(P, {PAcc, Index, CAcc}) ->
            OldId = maps:get(~"id", P),
            NewId = <<~"p"/binary, (integer_to_binary(Index))/binary>>,
            NewP = P#{~"id" => NewId},
            NewCAcc = case maps:find(OldId, Conns) of
                {ok, ConnPid} -> maps:put(NewId, ConnPid, CAcc);
                error -> CAcc
            end,
            {PAcc ++ [NewP], Index + 1, NewCAcc}
        end,
        {[], 1, #{}},
        Players
    ),
    {UpdatedPlayers, UpdatedConns}.
