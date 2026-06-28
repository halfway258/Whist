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
handle_call({join, ConnPid, Role}, _From, State) ->
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
                    {reply, {error, room_full}, State};
                _ ->
                    PlayerId = list_to_binary(io_lib:format("p~p", [PlayersCount + 1])),
                    Name = case State#game_session_state.mode of
                        offline -> ~"You";
                        online -> list_to_binary(io_lib:format("Player ~p", [PlayersCount + 1]))
                    end,
                    
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
                                    erlang:send_after(?DEALING_DELAY, self(), start_betting);
                                _ ->
                                    ok
                            end,
                            
                            {reply, ok, NewState};
                        {error, Reason} ->
                            {reply, {error, Reason}, State}
                    end
            end
    end;

handle_call(_Request, _From, State) ->
    {reply, ok, State}.

%% @doc Handles client disconnects and explicit actions.
handle_cast({leave, ConnPid}, State) ->
    %% Find if leaving connection was a spectator
    case lists:member(ConnPid, State#game_session_state.spectators) of
        true ->
            NewSpecs = lists:delete(ConnPid, State#game_session_state.spectators),
            {noreply, State#game_session_state{spectators = NewSpecs}};
        false ->
            case find_player_id_by_conn(ConnPid, State#game_session_state.connections) of
                {ok, PlayerId} ->
                    case State#game_session_state.mode of
                        online ->
                            %% Reset online lobby and notify remaining players
                            {ok, NewRulesState} = whist_rules:leave(PlayerId, State#game_session_state.rules_state),
                            NewState = State#game_session_state{
                                rules_state = NewRulesState,
                                connections = #{}
                            },
                            broadcast_state(NewState),
                            {noreply, NewState};
                        offline ->
                            %% Stopping the process since offline user disconnected
                            {stop, normal, State}
                    end;
                error ->
                    {noreply, State}
            end
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

%% @doc Handles timer-based bot actions and state animations.
handle_info(start_betting, State) ->
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
