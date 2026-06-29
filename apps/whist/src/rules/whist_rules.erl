-module(whist_rules).

-include("whist.hrl").

%% API
-export([
    init/1,
    join/4,
    leave/2,
    deal/1,
    start_betting/1,
    bet/4,
    play_card/3,
    clear_trick/1,
    ready_next_round/2,
    return_menu/1,
    is_bot_turn/1,
    get_next_player_id/1,
    stage/1,
    players/1,
    make_state_map/2,
    current_turn/1,
    get_hand/2,
    exchange_cards/3,
    bot_bid/2,
    bot_play_card/2,
    replace_with_bot/2
]).

-export_type([rules_state/0]).

-type rules_state() :: #rules_state{}.

%% ===================================================================
%% API Functions (Delegated to Stage Modules)
%% ===================================================================

%% @doc Initializes the functional rules state.
init(Mode) ->
    #rules_state{
        mode = Mode,
        settings = default_settings()
    }.

default_settings() ->
    #{
        ~"end_condition" => ~"score",
        ~"target_score" => 100,
        ~"target_rounds" => 8,
        ~"exchange_cards_count" => 2,
        ~"bot_difficulty" => ~"hard"
    }.

%% @doc Registers a player or bot joining the game (Delegated to whist_stage_lobby).
join(PlayerId, Name, IsBot, State) ->
    whist_stage_lobby:join(PlayerId, Name, IsBot, State).

%% @doc Handles player disconnection or exit (Delegated to whist_stage_lobby).
leave(PlayerId, State) ->
    whist_stage_lobby:leave(PlayerId, State).

%% @doc Shuffles cards and deals 13 cards to each player (Delegated to whist_stage_dealing).
deal(State) ->
    whist_stage_dealing:deal(State).

%% @doc Triggers the transition into the betting phase (Delegated to whist_stage_betting).
start_betting(State) ->
    whist_stage_betting:start_betting(State).

%% @doc Applies a player bid (Delegated to whist_stage_betting).
bet(PlayerId, Takes, Suit, State) ->
    whist_stage_betting:bet(PlayerId, Takes, Suit, State).

%% @doc Registers a card played by a player (Delegated to whist_stage_playing).
play_card(PlayerId, Card, State) ->
    whist_stage_playing:play_card(PlayerId, Card, State).

%% @doc Clears the cards on the table after a trick completes (Delegated to whist_stage_playing).
clear_trick(State) ->
    whist_stage_playing:clear_trick(State).

%% @doc Handles player ready states in the round end screen (Delegated to whist_stage_round_end).
ready_next_round(PlayerId, State) ->
    whist_stage_round_end:ready_next_round(PlayerId, State).

%% @doc Resets the rules state back to lobby (Delegated to whist_stage_game_over).
return_menu(State) ->
    whist_stage_game_over:return_menu(State).

%% @doc Handles card exchange in the betting phase (Delegated to whist_stage_betting).
exchange_cards(PlayerId, CardList, State) ->
    whist_stage_betting:exchange_cards(PlayerId, CardList, State).

%% @doc Triggers automated bot betting (Delegated to whist_stage_betting).
bot_bid(BotId, State) ->
    whist_stage_betting:bot_bid(BotId, State).

%% @doc Triggers automated bot card play (Delegated to whist_bot_strategy).
bot_play_card(BotId, State) ->
    whist_bot_strategy:bot_play_card(BotId, State).

%% ===================================================================
%% Utility Getters & Facade Functions
%% ===================================================================

%% @doc Utility to check if a turn belongs to a bot (Delegated to whist_utils).
is_bot_turn(State) ->
    whist_utils:is_bot_turn(State).

%% @doc Get next player ID in round-robin order (Delegated to whist_utils).
get_next_player_id(PlayerId) ->
    whist_utils:get_next_player_id(PlayerId).

%% @doc Getter for current stage.
stage(State) ->
    State#rules_state.stage.

%% @doc Getter for players list.
players(State) ->
    State#rules_state.players.

%% @doc Getter for current turn player ID.
current_turn(State) ->
    State#rules_state.current_turn.

%% @doc Getter for a player's hand.
get_hand(PlayerId, State) ->
    maps:get(PlayerId, State#rules_state.hands, []).

%% @doc Builds the customized JSON-serializable map for a player or spectator view.
make_state_map(State, ViewerId) ->
    %% ───────────────────────────────────────────────────────────────
    %% TODO: GAME VIEWER: STATE MAP CUSTOMIZATION
    %% Customize state serialization or filter secret information (like other players' hands)
    %% before sending to client.
    %% ───────────────────────────────────────────────────────────────
    PlayersWithHandSize = lists:map(
        fun(P) ->
            PId = maps:get(~"id", P),
            PHand = maps:get(PId, State#rules_state.hands, []),
            P#{~"hand_size" => length(PHand)}
        end,
        State#rules_state.players
    ),
    RotatedPlayers = whist_utils:rotate_players(ViewerId, PlayersWithHandSize),
    StageStr = case State#rules_state.stage of
        lobby -> ~"LOBBY";
        dealing -> ~"DEALING";
        betting -> ~"BETTING";
        playing -> ~"PLAYING";
        round_end -> ~"ROUND_END";
        game_over -> ~"GAME_OVER"
    end,
    WinnerFormatted = case State#rules_state.winner of
        null -> null;
        WinnerId ->
            case lists:search(fun(P) -> maps:get(~"id", P) =:= WinnerId end, State#rules_state.players) of
                {value, WinnerP} -> #{~"id" => WinnerId, ~"name" => maps:get(~"name", WinnerP)};
                false -> null
            end
    end,
    Hand = case ViewerId of
        ~"spectator" -> [];
        _ -> maps:get(ViewerId, State#rules_state.hands, [])
    end,
    #{
        ~"current_stage" => StageStr,
        ~"game_stats" => #{
            ~"round" => State#rules_state.round,
            ~"target_score" => maps:get(~"target_score", State#rules_state.settings, State#rules_state.target_score),
            ~"play_style" => case State#rules_state.play_style of over -> ~"OVER"; under -> ~"UNDER" end,
            ~"bidding_stage" => case State#rules_state.bidding_stage of suit -> ~"SUIT"; takes -> ~"TAKES"; exchange -> ~"EXCHANGE" end,
            ~"trump_suit" => case State#rules_state.max_bid of null -> ~"no_trump"; M -> maps:get(~"suit", M) end
        },
        ~"players" => RotatedPlayers,
        ~"my_hand" => Hand,
        ~"table_cards" => State#rules_state.table_cards,
        ~"prompt_data" => State#rules_state.prompt_data,
        ~"trick_winner" => State#rules_state.trick_winner,
        ~"winner" => WinnerFormatted,
        ~"settings" => State#rules_state.settings
    }.

%% @doc Replaces a player with a bot in rules state.
replace_with_bot(PlayerId, State) ->
    NewPlayers = lists:map(
        fun(P) ->
            case maps:get(~"id", P) of
                PlayerId ->
                    P#{~"bot" => true, ~"name" => <<(maps:get(~"name", P))/binary, ~" (Bot)"/binary>>};
                _ ->
                    P
            end
        end,
        State#rules_state.players
    ),
    State#rules_state{players = NewPlayers}.
