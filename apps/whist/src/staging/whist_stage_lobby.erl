-module(whist_stage_lobby).

-include("whist.hrl").

-export([join/4, leave/2]).

%% @doc Registers a player or bot joining the game.
join(PlayerId, Name, IsBot, State) ->
    case length(State#rules_state.players) of
        ?MAX_PLAYERS ->
            {error, room_full};
        _ ->
            Player = #{
                ~"id" => PlayerId,
                ~"name" => Name,
                ~"score" => 0,
                ~"tricks_taken" => 0,
                ~"is_turn" => false,
                ~"cards_played" => [],
                ~"bet" => null,
                ~"status" => ~"",
                ~"bot" => IsBot
            },
            NewPlayers = State#rules_state.players ++ [Player],
            NewState = State#rules_state{players = NewPlayers},
            
            %% If offline mode and first player has joined, auto-add 3 bots
            case {State#rules_state.mode, length(NewPlayers)} of
                {offline, 1} ->
                    Bots = [
                        #{~"id" => ~"p2", ~"name" => ~"Alice", ~"score" => 0, ~"tricks_taken" => 0, ~"is_turn" => false, ~"cards_played" => [], ~"bet" => null, ~"status" => ~"", ~"bot" => true},
                        #{~"id" => ~"p3", ~"name" => ~"Bob", ~"score" => 0, ~"tricks_taken" => 0, ~"is_turn" => false, ~"cards_played" => [], ~"bet" => null, ~"status" => ~"", ~"bot" => true},
                        #{~"id" => ~"p4", ~"name" => ~"Carol", ~"score" => 0, ~"tricks_taken" => 0, ~"is_turn" => false, ~"cards_played" => [], ~"bet" => null, ~"status" => ~"", ~"bot" => true}
                    ],
                    {ok, NewState#rules_state{
                        players = NewPlayers ++ Bots,
                        stage = dealing,
                        round = 1
                    }};
                {online, 4} ->
                    {ok, NewState#rules_state{
                        stage = dealing,
                        round = 1
                    }};
                _ ->
                    {ok, NewState}
            end
    end.

%% @doc Handles player disconnection or exit.
leave(PlayerId, State) ->
    case State#rules_state.mode of
        online ->
            %% Reset online game back to lobby if a player leaves
            {ok, whist_rules:init(online)};
        offline ->
            case PlayerId of
                ~"p1" ->
                    %% Stopping is handled by the process, reset rules to empty
                    {ok, whist_rules:init(offline)};
                _ ->
                    {ok, State}
            end
    end.
