-module(whist_bot_strategy).

-include("whist.hrl").

-export([bot_play_card/2]).

%% @doc Evaluates the bot's hand and selects the best card to play to win exactly the bid.
bot_play_card(BotId, State) ->
    Hand = maps:get(BotId, State#rules_state.hands, []),
    case Hand of
        [] ->
            {error, empty_hand};
        _ ->
            %% Find tricks needed
            {value, BotPlayer} = lists:search(fun(P) -> maps:get(~"id", P) =:= BotId end, State#rules_state.players),
            TricksTaken = maps:get(~"tricks_taken", BotPlayer, 0),
            BetMap = maps:get(~"bet", BotPlayer),
            Bid = case BetMap of
                null -> 0;
                ~"skip" -> 0;
                _ -> maps:get(~"takes", BetMap, 0)
            end,
            TricksNeeded = Bid - TricksTaken,
            
            %% Get trump suit
            MaxBid = State#rules_state.max_bid,
            TrumpSuit = case MaxBid of null -> ~"no_trump"; M -> maps:get(~"suit", M) end,
            
            %% Filter playable cards
            TableCards = State#rules_state.table_cards,
            Playable = get_playable_cards(Hand, TableCards),
            
            CardToPlay = case TableCards of
                [] ->
                    %% Bot is leading the trick
                    lead_trick(Playable, TricksNeeded, TrumpSuit);
                _ ->
                    %% Bot is following the trick
                    follow_trick(BotId, Playable, TableCards, TricksNeeded, TrumpSuit)
            end,
            {ok, CardToPlay}
    end.

%% Internal Helpers

get_playable_cards(Hand, TableCards) ->
    case TableCards of
        [] ->
            Hand;
        [#{~"card" := FirstCard} | _] ->
            LeadSuit = maps:get(~"suit", FirstCard),
            LeadCards = [C || C <- Hand, maps:get(~"suit", C) =:= LeadSuit],
            case LeadCards of
                [] -> Hand; %% Void, can play anything
                _ -> LeadCards
            end
    end.

lead_trick(Playable, TricksNeeded, TrumpSuit) ->
    case TricksNeeded > 0 of
        true ->
            %% Want to win: play highest card. Prefer highest trump if available or highest non-trump
            sort_by_strength(Playable, TrumpSuit, desc);
        false ->
            %% Want to lose: play lowest card
            sort_by_strength(Playable, TrumpSuit, asc)
    end.

follow_trick(BotId, Playable, TableCards, TricksNeeded, TrumpSuit) ->
    %% Find current best card played on table
    [First | Rest] = TableCards,
    FirstCard = maps:get(~"card", First),
    FirstPlayerId = maps:get(~"player_id", First),
    LeadSuit = maps:get(~"suit", FirstCard),
    
    BestPlayed = find_best_played(Rest, LeadSuit, TrumpSuit, {FirstCard, FirstPlayerId}),
    {BestCard, BestPlayerId} = BestPlayed,
    
    case TricksNeeded > 0 of
        true ->
            %% Want to win: find playable cards that beat the current best card
            WinningCards = [
                C || C <- Playable,
                is_better(C, BotId, BestCard, BestPlayerId, LeadSuit, TrumpSuit)
            ],
            case WinningCards of
                [] ->
                    %% Cannot win: play lowest card to discard
                    sort_by_strength(Playable, TrumpSuit, asc);
                _ ->
                    %% Can win: play the lowest card that can win
                    sort_by_strength(WinningCards, TrumpSuit, asc)
            end;
            
        false ->
            %% Want to lose: find playable cards that do NOT beat the current best card
            LosingCards = [
                C || C <- Playable,
                not is_better(C, BotId, BestCard, BestPlayerId, LeadSuit, TrumpSuit)
            ],
            case LosingCards of
                [] ->
                    %% Forced to win: play lowest card to minimize impact
                    sort_by_strength(Playable, TrumpSuit, asc);
                _ ->
                    %% Can lose: play the highest card that still loses
                    sort_by_strength(LosingCards, TrumpSuit, desc)
            end
    end.

find_best_played([], _, _, Best) ->
    Best;
find_best_played([Played | Rest], LeadSuit, TrumpSuit, {BestCard, BestPlayerId}) ->
    ChalCard = maps:get(~"card", Played),
    ChalPlayerId = maps:get(~"player_id", Played),
    case is_better(ChalCard, ChalPlayerId, BestCard, BestPlayerId, LeadSuit, TrumpSuit) of
        true -> find_best_played(Rest, LeadSuit, TrumpSuit, {ChalCard, ChalPlayerId});
        false -> find_best_played(Rest, LeadSuit, TrumpSuit, {BestCard, BestPlayerId})
    end.

is_better(ChalCard, _ChalPlayerId, BestCard, _BestPlayerId, LeadSuit, TrumpSuit) ->
    ChalSuit = maps:get(~"suit", ChalCard),
    ChalVal = maps:get(~"value", ChalCard),
    BestSuit = maps:get(~"suit", BestCard),
    BestVal = maps:get(~"value", BestCard),
    
    if
        ChalSuit =:= TrumpSuit andalso BestSuit =/= TrumpSuit -> true;
        ChalSuit =:= TrumpSuit andalso BestSuit =:= TrumpSuit andalso ChalVal > BestVal -> true;
        ChalSuit =:= LeadSuit andalso BestSuit =/= TrumpSuit andalso BestSuit =/= LeadSuit -> true;
        ChalSuit =:= LeadSuit andalso BestSuit =:= LeadSuit andalso ChalVal > BestVal -> true;
        true -> false
    end.

sort_by_strength([First | Rest], TrumpSuit, Order) ->
    Sorted = lists:sort(
        fun(A, B) ->
            ValA = card_strength_value(A, TrumpSuit),
            ValB = card_strength_value(B, TrumpSuit),
            case Order of
                asc -> ValA =< ValB;
                desc -> ValA >= ValB
            end
        end,
        [First | Rest]
    ),
    lists:nth(1, Sorted).

card_strength_value(Card, TrumpSuit) ->
    Suit = maps:get(~"suit", Card),
    Val = maps:get(~"value", Card),
    case Suit =:= TrumpSuit of
        true -> Val + 100; %% Trumps are valued higher
        false -> Val
    end.
