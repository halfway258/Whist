-module(whist_stage_playing).

-include("whist.hrl").

-export([play_card/3, clear_trick/1]).

%% @doc Registers a card played by a player.
play_card(PlayerId, Card, State) ->
    Hand = maps:get(PlayerId, State#rules_state.hands, []),
    
    %% 1. Validate card exists in hand
    case lists:member(Card, Hand) of
        false ->
            {error, card_not_in_hand};
        true ->
            %% 2. Validate follow-suit rules
            TableCards = State#rules_state.table_cards,
            IsValidPlay = case TableCards of
                [] ->
                    %% Start of trick, any card is valid
                    true;
                [#{~"card" := FirstCard} | _] ->
                    LeadSuit = maps:get(~"suit", FirstCard),
                    PlayedSuit = maps:get(~"suit", Card),
                    case PlayedSuit =:= LeadSuit of
                        true ->
                            true;
                        false ->
                            %% Player didn't follow suit. Valid only if void of LeadSuit in hand.
                            HasLeadSuit = lists:any(fun(C) -> maps:get(~"suit", C) =:= LeadSuit end, Hand),
                            not HasLeadSuit
                    end
            end,
            
            case IsValidPlay of
                false ->
                    {error, must_follow_suit};
                true ->
                    %% Card is valid!
                    NewHand = lists:delete(Card, Hand),
                    NewHands = maps:put(PlayerId, NewHand, State#rules_state.hands),
                    
                    TableCard = #{
                        ~"player_id" => PlayerId,
                        ~"card" => Card
                    },
                    NewTableCards = TableCards ++ [TableCard],
                    
                    %% Memory of played cards
                    NewPlayedCards = State#rules_state.played_cards ++ [Card],
                    
                    %% Track voids
                    NewVoids = case TableCards of
                        [] ->
                            State#rules_state.voids;
                        [#{~"card" := FirstC} | _] ->
                            LeadS = maps:get(~"suit", FirstC),
                            PlayedS = maps:get(~"suit", Card),
                            case PlayedS =/= LeadS of
                                true ->
                                    CurrentVoids = maps:get(PlayerId, State#rules_state.voids, []),
                                    maps:put(PlayerId, lists:usort([LeadS | CurrentVoids]), State#rules_state.voids);
                                false ->
                                    State#rules_state.voids
                            end
                    end,
                    
                    NewPlayers = [P#{~"is_turn" => false} || P <- State#rules_state.players],
                    
                    TempState = State#rules_state{
                        hands = NewHands,
                        players = NewPlayers,
                        table_cards = NewTableCards,
                        played_cards = NewPlayedCards,
                        voids = NewVoids
                    },
                    
                    case length(NewTableCards) of
                        4 ->
                            %% Trick is complete. Determine winner
                            MaxBid = State#rules_state.max_bid,
                            TrumpSuit = case MaxBid of null -> ~"no_trump"; M -> maps:get(~"suit", M) end,
                            WinnerId = determine_trick_winner(NewTableCards, TrumpSuit),
                            
                            FinalPlayers = [
                                case maps:get(~"id", P) of
                                    WinnerId -> P#{~"tricks_taken" => maps:get(~"tricks_taken", P) + 1};
                                    _ -> P
                                end
                                || P <- NewPlayers
                            ],
                            
                            FinalState = TempState#rules_state{
                                players = FinalPlayers,
                                trick_winner = WinnerId,
                                current_turn = WinnerId
                            },
                            {ok, FinalState, trick_complete};
                            
                        _ ->
                            %% Next player
                            NextId = whist_utils:get_next_player_id(PlayerId),
                            FinalPlayers = [
                                P#{~"is_turn" => (maps:get(~"id", P) =:= NextId)}
                                || P <- NewPlayers
                            ],
                            FinalState = TempState#rules_state{
                                players = FinalPlayers,
                                current_turn = NextId
                            },
                            {ok, FinalState}
                    end
            end
    end.

%% @doc Clears the cards on the table after a trick completes.
clear_trick(State) ->
    NewState = State#rules_state{
        table_cards = [],
        trick_winner = null
    },
    %% Check if round is finished (all players out of cards)
    P1Hand = maps:get(~"p1", NewState#rules_state.hands, []),
    case P1Hand of
        [] ->
            whist_stage_round_end:handle_round_end(NewState);
        _ ->
            NextId = NewState#rules_state.current_turn,
            NewPlayers = [
                P#{~"is_turn" => (maps:get(~"id", P) =:= NextId)}
                || P <- NewState#rules_state.players
            ],
            {ok, NewState#rules_state{players = NewPlayers}}
    end.

%% Internal Helpers

determine_trick_winner([First | Rest], TrumpSuit) ->
    FirstPlayerId = maps:get(~"player_id", First),
    FirstCard = maps:get(~"card", First),
    LeadSuit = maps:get(~"suit", FirstCard),
    determine_trick_winner_loop(Rest, LeadSuit, TrumpSuit, {FirstCard, FirstPlayerId}).

determine_trick_winner_loop([], _, _, {_, WinnerId}) ->
    WinnerId;
determine_trick_winner_loop([Played | Rest], LeadSuit, TrumpSuit, {BestCard, BestPlayerId}) ->
    ChalCard = maps:get(~"card", Played),
    ChalPlayerId = maps:get(~"player_id", Played),
    case is_challenger_better(ChalCard, ChalPlayerId, BestCard, BestPlayerId, LeadSuit, TrumpSuit) of
        true -> determine_trick_winner_loop(Rest, LeadSuit, TrumpSuit, {ChalCard, ChalPlayerId});
        false -> determine_trick_winner_loop(Rest, LeadSuit, TrumpSuit, {BestCard, BestPlayerId})
    end.

is_challenger_better(ChalCard, _ChalPlayerId, BestCard, _BestPlayerId, LeadSuit, TrumpSuit) ->
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
