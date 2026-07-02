-module(whist_stage_round_end).

-include("whist.hrl").

-export([ready_next_round/2, ready_next_round/3, handle_round_end/1]).

%% @doc Handles player ready states in the round end screen.
ready_next_round(PlayerId, State) ->
    ready_next_round(PlayerId, #{}, State).

ready_next_round(PlayerId, Msg, State) ->
    Vote = maps:get(~"vote", Msg, ~"continue"),
    NewPlayers = [
        case maps:get(~"id", P) of
            PlayerId -> P#{~"status" => ~"Ready", ~"vote" => Vote};
            _ -> P
        end
        || P <- State#rules_state.players
    ],
    NewReady = [PlayerId | lists:delete(PlayerId, State#rules_state.ready_players)],
    NewState = State#rules_state{
        ready_players = NewReady,
        players = NewPlayers
    },
    
    %% Determine if we can proceed
    HumanPlayerIds = [maps:get(~"id", P) || P <- State#rules_state.players, maps:get(~"bot", P, false) =:= false],
    IsAllReady = lists:all(fun(HId) -> lists:member(HId, NewReady) end, HumanPlayerIds),
    
    case IsAllReady of
        true ->
            %% Check if any human player voted to end (only relevant if target_rounds = 0)
            AnyEndVote = lists:any(
                fun(P) ->
                    IsHuman = maps:get(~"bot", P, false) =:= false,
                    IsHuman andalso maps:get(~"vote", P, ~"continue") =:= ~"end"
                end,
                NewPlayers
            ),

            TargetRounds = maps:get(~"target_rounds", State#rules_state.settings, 0),
            
            GameOver = case TargetRounds of
                0 -> AnyEndVote;
                _ ->
                    EndCondition = maps:get(~"end_condition", State#rules_state.settings, ~"score"),
                    case EndCondition of
                        ~"rounds" ->
                            State#rules_state.round >= TargetRounds;
                        _ ->
                            TargetScore = maps:get(~"target_score", State#rules_state.settings, State#rules_state.target_score),
                            lists:any(fun(P) -> maps:get(~"score", P) >= TargetScore end, NewPlayers)
                    end
            end,
            case GameOver of
                true ->
                    Winner = whist_utils:find_highest_score_player(NewPlayers),
                    {ok, NewState#rules_state{stage = game_over, winner = Winner}};
                false ->
                    %% Transition to dealing next round
                    ClearedPlayers = [P#{~"status" => ~"", ~"vote" => null} || P <- NewPlayers],
                    {ok, NewState#rules_state{
                        stage = dealing,
                        round = State#rules_state.round + 1,
                        players = ClearedPlayers
                    }}
            end;
        false ->
            {ok, NewState}
    end.

%% @doc Calculates score updates for each player at the end of a round.
handle_round_end(State) ->
    PlayStyle = State#rules_state.play_style,
    NewPlayers = [
        begin
            BetMap = maps:get(~"bet", P),
            
            %% Retrieve takes count from bet map or defaults to 0
            BetTakes = case BetMap of
                null -> 0;
                ~"skip" -> 0;
                _ -> maps:get(~"takes", BetMap, 0)
            end,
            
            TricksTaken = maps:get(~"tricks_taken", P, 0),
            
            ScoreChange = calculate_score_change(BetTakes, TricksTaken, PlayStyle),
            CurrentScore = maps:get(~"score", P, 0),
            P#{
                ~"score" => CurrentScore + ScoreChange,
                ~"score_change" => ScoreChange,
                ~"status" => ~""
            }
        end
        || P <- State#rules_state.players
    ],
    {ok, State#rules_state{
        stage = round_end,
        players = NewPlayers,
        ready_players = []
    }}.

%% Internal Helpers

calculate_score_change(0, 0, over) -> 20;
calculate_score_change(0, 0, under) -> 50;
calculate_score_change(0, Tricks, _) -> -50 + (Tricks - 1) * 10;
calculate_score_change(Bet, Tricks, _) when Bet =:= Tricks -> Bet * Bet + 10;
calculate_score_change(Bet, Tricks, _) -> -10 * abs(Tricks - Bet).
