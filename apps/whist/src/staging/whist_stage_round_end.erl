-module(whist_stage_round_end).

-include("whist.hrl").

-export([ready_next_round/2, handle_round_end/1]).

%% @doc Handles player ready states in the round end screen.
ready_next_round(PlayerId, State) ->
    NewReady = [PlayerId | lists:delete(PlayerId, State#rules_state.ready_players)],
    NewPlayers = [
        case maps:get(~"id", P) of
            PlayerId -> P#{~"status" => ~"Ready"};
            _ -> P
        end
        || P <- State#rules_state.players
    ],
    NewState = State#rules_state{
        ready_players = NewReady,
        players = NewPlayers
    },
    
    %% Determine if we can proceed
    IsAllReady = case State#rules_state.mode of
        offline -> lists:member(~"p1", NewReady);
        online -> length(NewReady) =:= 4
    end,
    
    case IsAllReady of
        true ->
            GameOver = lists:any(fun(P) -> maps:get(~"score", P) >= State#rules_state.target_score end, NewPlayers),
            case GameOver of
                true ->
                    Winner = whist_utils:find_highest_score_player(NewPlayers),
                    {ok, NewState#rules_state{stage = game_over, winner = Winner}};
                false ->
                    %% Transition to dealing next round
                    {ok, NewState#rules_state{
                        stage = dealing,
                        round = State#rules_state.round + 1
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
