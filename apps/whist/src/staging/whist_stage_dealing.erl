-module(whist_stage_dealing).

-include("whist.hrl").

-export([deal/1]).

%% @doc Shuffles cards and deals 13 cards to each player.
deal(State) ->
    %% ───────────────────────────────────────────────────────────────
    %% TODO: GAME LOGIC: CARD DEALING
    %% You can customize how cards are generated, shuffled, and distributed here.
    %% ───────────────────────────────────────────────────────────────
    Deck = whist_utils:shuffle(whist_utils:make_deck()),
    Hands = whist_utils:deal_hands_helper(State#rules_state.players, Deck, #{}),
    {ok, State#rules_state{
        hands = Hands,
        table_cards = [],
        trick_winner = null,
        played_cards = [],
        voids = #{}
    }}.
