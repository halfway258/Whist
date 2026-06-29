-module(whist_stage_betting).

-include("whist.hrl").

-export([
    start_betting/1,
    bet/4,
    exchange_cards/3,
    bot_bid/2
]).

%% @doc Triggers the transition into the betting phase.
start_betting(State) ->
    %% Reset player tricks taken and bids, and set first betting turn to "p1"
    NewPlayers = [P#{
        ~"tricks_taken" => 0,
        ~"bet" => null,
        ~"status" => ~"",
        ~"is_turn" => (maps:get(~"id", P) =:= ~"p1")
    } || P <- State#rules_state.players],
    
    {ok, State#rules_state{
        stage = betting,
        bidding_stage = suit,
        max_bid = null,
        consecutive_skips = 0,
        players = NewPlayers,
        current_turn = ~"p1",
        prompt_data = #{~"bidding_stage" => ~"suit", ~"min_bet" => 5, ~"max_bet" => 13}
    }}.

%% @doc Handles bot betting by delegating to Stage 1 or Stage 2 bot algorithms.
bot_bid(BotId, State) ->
    case State#rules_state.bidding_stage of
        suit ->
            case make_bot_stage1_bid(BotId, State) of
                skip ->
                    bet(BotId, 0, ~"skip", State);
                {bid, Takes, Suit} ->
                    bet(BotId, Takes, Suit, State)
            end;
        takes ->
            Takes = make_bot_stage2_bid(BotId, State),
            bet(BotId, Takes, null, State)
    end.

%% @doc Applies a player bid.
%% Expected incoming JSON structure for betting:
%% {
%%     "action": "bet",
%%     "takes": 5,
%%     "suit": "spades"  // Stage 1: "hearts" | "diamonds" | "clubs" | "spades" | "no_trump" | "skip"
%% }
bet(PlayerId, Takes, Suit, State) ->
    case State#rules_state.bidding_stage of
        suit ->
            bet_stage1(PlayerId, Takes, Suit, State);
        takes ->
            bet_stage2(PlayerId, Takes, State);
        _ ->
            {error, invalid_stage}
    end.

%% Stage 1: Suit & Max Bet Selection (Bridge-like)
bet_stage1(PlayerId, Takes, Suit, State) ->
    IsSkip = (Suit =:= ~"skip" orelse Takes =:= 0 orelse Suit =:= null),
    
    case IsSkip of
        true ->
            NewConsecutiveSkips = State#rules_state.consecutive_skips + 1,
            
            %% Update player status to Skip
            NewPlayers = [
                case maps:get(~"id", P) of
                    PlayerId -> P#{~"status" => ~"Skip", ~"bet" => ~"skip"};
                    _ -> P
                end
                || P <- State#rules_state.players
            ],
            
            TempState = State#rules_state{
                players = NewPlayers,
                consecutive_skips = NewConsecutiveSkips
            },
            
            %% Check if Stage 1 is complete (3 passes after a bid)
            case NewConsecutiveSkips =:= 3 andalso State#rules_state.max_bid =/= null of
                true ->
                    %% Transition to Stage 2 (Takes Bidding)
                    transition_to_stage2(TempState);
                false ->
                    %% Check if all 4 skipped at the start
                    case NewConsecutiveSkips =:= 4 andalso State#rules_state.max_bid =:= null of
                        true ->
                            ExchangeCount = maps:get(~"exchange_cards_count", TempState#rules_state.settings, 2),
                            case ExchangeCount > 0 of
                                true ->
                                    enter_exchange_phase(TempState);
                                false ->
                                    {ok, TempState#rules_state{
                                        stage = dealing,
                                        bidding_stage = suit,
                                        all_pass_count = 0,
                                        consecutive_skips = 0,
                                        max_bid = null
                                    }}
                            end;
                        false ->
                            %% Next player turn
                            advance_stage1_turn(PlayerId, TempState)
                    end
            end;
            
        false when Takes >= 5 ->
            %% Validate if bid is higher than current max_bid
            IsValid = case State#rules_state.max_bid of
                null -> true;
                MaxBid ->
                    MaxTakes = maps:get(~"takes", MaxBid),
                    MaxSuit = maps:get(~"suit", MaxBid),
                    is_higher_bid(Takes, Suit, MaxTakes, MaxSuit)
            end,
            
            case IsValid of
                true ->
                    NewMaxBid = #{
                        ~"takes" => Takes,
                        ~"suit" => Suit,
                        ~"player_id" => PlayerId
                    },
                    
                    StatusText = io_lib:format("~p ~s", [Takes, whist_utils:capitalize_suit(Suit)]),
                    BinStatus = list_to_binary(StatusText),
                    
                    NewPlayers = [
                        case maps:get(~"id", P) of
                            PlayerId -> P#{
                                ~"bet" => #{~"takes" => Takes, ~"suit" => Suit},
                                ~"status" => BinStatus
                            };
                            _ -> P
                        end
                        || P <- State#rules_state.players
                    ],
                    
                    TempState = State#rules_state{
                        players = NewPlayers,
                        max_bid = NewMaxBid,
                        consecutive_skips = 0
                    },
                    
                    advance_stage1_turn(PlayerId, TempState);
                    
                false ->
                    {error, invalid_bid}
            end;
            
        _ ->
            {error, invalid_bid}
    end.

%% Stage 2: Takes Bidding (Sum != 13)
bet_stage2(PlayerId, Takes, State) ->
    MaxBid = State#rules_state.max_bid,
    MakerId = maps:get(~"player_id", MaxBid),
    LastPlayerId = get_prev_player_id(MakerId),
    LeadingSuit = maps:get(~"suit", MaxBid),

    %% Maker bid cannot be lowered
    case PlayerId =:= MakerId andalso Takes < maps:get(~"takes", MaxBid) of
        true ->
            {error, invalid_bid};
        false ->
            IsLast = (PlayerId =:= LastPlayerId),
            %% Calculate sum of other players' bets
            Sum = lists:sum([
                case maps:get(~"id", P) of
                    PlayerId -> 0;
                    _ ->
                        case maps:get(~"bet", P) of
                            null -> 0;
                            ~"skip" -> 0;
                            B -> maps:get(~"takes", B, 0)
                        end
                end
                || P <- State#rules_state.players
            ]),
            
            case IsLast andalso (Takes + Sum =:= 13) of
                true ->
                    {error, sum_equals_13};
                false ->
                    BetInfo = #{
                        ~"takes" => Takes,
                        ~"suit" => LeadingSuit
                    },
                    BinStatus = list_to_binary(integer_to_list(Takes)),
                    
                    NewPlayers = [
                        case maps:get(~"id", P) of
                            PlayerId -> P#{~"bet" => BetInfo, ~"status" => BinStatus};
                            _ -> P
                        end
                        || P <- State#rules_state.players
                    ],
                    
                    TempState = State#rules_state{players = NewPlayers},
                    
                    case IsLast of
                        true ->
                            %% Bidding complete! Calculate total sum and play style
                            TotalSum = Sum + Takes,
                            PlayStyle = case TotalSum > 13 of
                                true -> over;
                                false -> under
                            end,
                            
                            %% Update players for playing: turn goes to maker
                            FinalPlayers = [
                                P#{
                                    ~"is_turn" => (maps:get(~"id", P) =:= MakerId),
                                    ~"status" => ~""
                                }
                                || P <- NewPlayers
                            ],
                            
                            {ok, TempState#rules_state{
                                stage = playing,
                                bidding_stage = suit, %% reset
                                play_style = PlayStyle,
                                players = FinalPlayers,
                                current_turn = MakerId,
                                prompt_data = null
                            }};
                        false ->
                            %% Advance turn
                            NextId = whist_utils:get_next_player_id(PlayerId),
                            FinalPlayers = [
                                case maps:get(~"id", P) of
                                    NextId ->
                                        case maps:get(~"bot", P) of
                                            true -> P#{~"is_turn" => true, ~"status" => ~"Thinking..."};
                                            false -> P#{~"is_turn" => true}
                                        end;
                                    _ ->
                                        P#{~"is_turn" => false}
                                end
                                || P <- NewPlayers
                            ],
                            
                            NextIsLast = (NextId =:= LastPlayerId),
                            NextIsMaker = (NextId =:= MakerId),
                            NextPrompt = if
                                NextIsLast ->
                                    Restricted = 13 - (Sum + Takes),
                                    #{~"bidding_stage" => ~"takes", ~"min_bet" => 0, ~"max_bet" => 13, ~"restricted_bet" => Restricted};
                                NextIsMaker ->
                                    #{~"bidding_stage" => ~"takes", ~"min_bet" => maps:get(~"takes", MaxBid), ~"max_bet" => 13};
                                true ->
                                    #{~"bidding_stage" => ~"takes", ~"min_bet" => 0, ~"max_bet" => 13}
                            end,
                            
                            {ok, TempState#rules_state{
                                players = FinalPlayers,
                                current_turn = NextId,
                                prompt_data = NextPrompt
                            }}
                    end
            end
    end.

%% Card Exchange Phase
exchange_cards(PlayerId, CardList, State) ->
    ExchangeCount = maps:get(~"exchange_cards_count", State#rules_state.settings, 2),
    case State#rules_state.bidding_stage =:= exchange andalso length(CardList) =:= ExchangeCount of
        true ->
            Hand = maps:get(PlayerId, State#rules_state.hands, []),
            HasCards = lists:all(fun(C) -> lists:member(C, Hand) end, CardList),
            case HasCards of
                true ->
                    NewExchange = maps:put(PlayerId, CardList, State#rules_state.exchange_cards),
                    NewPlayers = [
                        case maps:get(~"id", P) of
                            PlayerId -> P#{~"status" => ~"Submitted", ~"is_turn" => false};
                            _ -> P
                        end
                        || P <- State#rules_state.players
                    ],
                    TempState = State#rules_state{
                        exchange_cards = NewExchange,
                        players = NewPlayers
                    },
                    
                    case maps:size(NewExchange) =:= 4 of
                        true -> perform_card_transfer(TempState);
                        false -> {ok, TempState}
                    end;
                false ->
                    {error, card_not_in_hand}
            end;
        false ->
            {error, invalid_exchange}
    end.

%% Internal Helpers

is_higher_bid(Takes1, Suit1, Takes2, Suit2) ->
    case Takes1 > Takes2 of
        true -> true;
        false ->
            case Takes1 == Takes2 of
                true -> suit_rank(Suit1) > suit_rank(Suit2);
                false -> false
            end
    end.

suit_rank(~"no_trump") -> 5;
suit_rank(~"spades") -> 4;
suit_rank(~"hearts") -> 3;
suit_rank(~"diamonds") -> 2;
suit_rank(~"clubs") -> 1;
suit_rank(_) -> 0.

get_prev_player_id(~"p1") -> ~"p4";
get_prev_player_id(~"p2") -> ~"p1";
get_prev_player_id(~"p3") -> ~"p2";
get_prev_player_id(~"p4") -> ~"p3".

advance_stage1_turn(PlayerId, State) ->
    NextId = whist_utils:get_next_player_id(PlayerId),
    NewPlayers = [
        case maps:get(~"id", P) of
            NextId ->
                case maps:get(~"bot", P) of
                    true -> P#{~"is_turn" => true, ~"status" => ~"Thinking..."};
                    false -> P#{~"is_turn" => true}
                end;
            _ ->
                P#{~"is_turn" => false}
        end
        || P <- State#rules_state.players
    ],
    
    %% Next turn prompt
    MaxBid = State#rules_state.max_bid,
    MinTakes = case MaxBid of
        null -> 5;
        M -> maps:get(~"takes", M)
    end,
    
    {ok, State#rules_state{
        players = NewPlayers,
        current_turn = NextId,
        prompt_data = #{~"bidding_stage" => ~"suit", ~"min_bet" => MinTakes, ~"max_bet" => 13}
    }}.

transition_to_stage2(State) ->
    MaxBid = State#rules_state.max_bid,
    MakerId = maps:get(~"player_id", MaxBid),
    MakerTakes = maps:get(~"takes", MaxBid),
    MakerSuit = maps:get(~"suit", MaxBid),
    
    %% Clear statuses and bets
    NewPlayers = [
        begin
            IsMaker = (maps:get(~"id", P) =:= MakerId),
            P#{
                ~"bet" => case IsMaker of
                    true -> #{~"takes" => MakerTakes, ~"suit" => MakerSuit};
                    false -> null
                end,
                ~"status" => case IsMaker of
                    true -> list_to_binary(integer_to_list(MakerTakes));
                    false -> ~""
                end,
                ~"is_turn" => IsMaker
            }
        end
        || P <- State#rules_state.players
    ],
    
    {ok, State#rules_state{
        players = NewPlayers,
        current_turn = MakerId,
        bidding_stage = takes,
        consecutive_skips = 0,
        prompt_data = #{~"bidding_stage" => ~"takes", ~"min_bet" => MakerTakes, ~"max_bet" => 13}
    }}.

enter_exchange_phase(State) ->
    ExchangeCount = maps:get(~"exchange_cards_count", State#rules_state.settings, 2),
    %% Auto-select cards for each bot and store them in exchange_cards
    Bots = [P || P <- State#rules_state.players, maps:get(~"bot", P) =:= true],
    ExchangeMap = lists:foldl(
        fun(Bot, Acc) ->
            BotId = maps:get(~"id", Bot),
            Hand = maps:get(BotId, State#rules_state.hands, []),
            {Chosen, _} = case length(Hand) >= ExchangeCount of
                true -> lists:split(ExchangeCount, whist_utils:shuffle(Hand));
                false -> {Hand, []}
            end,
            maps:put(BotId, Chosen, Acc)
        end,
        #{},
        Bots
    ),
    
    StatusText = list_to_binary(io_lib:format("Select ~p cards to exchange", [ExchangeCount])),
    NewPlayers = [
        case maps:get(~"bot", P) of
            true -> P#{~"status" => ~"Submitted", ~"is_turn" => false};
            false -> P#{~"status" => StatusText, ~"is_turn" => true}
        end
        || P <- State#rules_state.players
    ],
    
    {ok, State#rules_state{
        bidding_stage = exchange,
        exchange_cards = ExchangeMap,
        players = NewPlayers,
        current_turn = ~"p1",
        prompt_data = #{~"bidding_stage" => ~"exchange", ~"select_cards_to_exchange" => ExchangeCount}
    }}.

perform_card_transfer(State) ->
    ExchangeMap = State#rules_state.exchange_cards,
    Hands = State#rules_state.hands,
    
    NewHands = maps:fold(
        fun(PlayerId, Hand, Acc) ->
            PrevPlayerId = get_prev_player_id(PlayerId),
            ToRemove = maps:get(PlayerId, ExchangeMap),
            ToAdd = maps:get(PrevPlayerId, ExchangeMap),
            NewHand = lists:foldl(fun(C, H) -> lists:delete(C, H) end, Hand, ToRemove) ++ ToAdd,
            maps:put(PlayerId, NewHand, Acc)
        end,
        #{},
        Hands
    ),
    
    NewAllPassCount = State#rules_state.all_pass_count + 1,
    
    case NewAllPassCount =:= 3 of
        true ->
            %% Reshuffle and redeal!
            {ok, State#rules_state{
                stage = dealing,
                bidding_stage = suit,
                all_pass_count = 0,
                consecutive_skips = 0,
                max_bid = null,
                exchange_cards = #{}
            }};
        false ->
            %% Restart Stage 1 bidding
            NewPlayers = [P#{
                ~"bet" => null,
                ~"status" => ~"",
                ~"is_turn" => (maps:get(~"id", P) =:= ~"p1")
            } || P <- State#rules_state.players],
            
            {ok, State#rules_state{
                bidding_stage = suit,
                all_pass_count = NewAllPassCount,
                consecutive_skips = 0,
                max_bid = null,
                exchange_cards = #{},
                players = NewPlayers,
                hands = NewHands,
                current_turn = ~"p1",
                prompt_data = #{~"bidding_stage" => ~"suit", ~"min_bet" => 5, ~"max_bet" => 13}
            }}
    end.

%% Bot logic: Stage 1 Suit Selection
make_bot_stage1_bid(BotId, State) ->
    BotDifficulty = maps:get(~"bot_difficulty", State#rules_state.settings, ~"hard"),
    case BotDifficulty of
        ~"easy" ->
            case rand:uniform(100) =< 25 of
                true ->
                    Hand = maps:get(BotId, State#rules_state.hands, []),
                    LongestSuit = find_longest_suit(Hand),
                    case State#rules_state.max_bid of
                        null -> {bid, 5, LongestSuit};
                        MaxBid ->
                            MaxTakes = maps:get(~"takes", MaxBid),
                            MaxSuit = maps:get(~"suit", MaxBid),
                            case is_higher_suit(LongestSuit, MaxSuit) of
                                true when MaxTakes =:= 5 -> {bid, 5, LongestSuit};
                                _ -> skip
                            end
                    end;
                false ->
                    skip
            end;
        _ ->
            Hand = maps:get(BotId, State#rules_state.hands, []),
            LongestSuit = find_longest_suit(Hand),
            LongestCount = length([C || C <- Hand, maps:get(~"suit", C) =:= LongestSuit]),
            
            case LongestCount >= 5 of
                true ->
                    case State#rules_state.max_bid of
                        null ->
                            {bid, 5, LongestSuit};
                        MaxBid ->
                            MaxTakes = maps:get(~"takes", MaxBid),
                            MaxSuit = maps:get(~"suit", MaxBid),
                            CanSameTakes = is_higher_suit(LongestSuit, MaxSuit),
                            case CanSameTakes of
                                true when LongestCount >= MaxTakes ->
                                    {bid, MaxTakes, LongestSuit};
                                _ ->
                                    case LongestCount > MaxTakes of
                                        true -> {bid, MaxTakes + 1, LongestSuit};
                                        false -> skip
                                    end
                            end
                    end;
                false ->
                    skip
            end
    end.

find_longest_suit(Hand) ->
    Suits = [~"hearts", ~"diamonds", ~"clubs", ~"spades"],
    Counts = [{length([C || C <- Hand, maps:get(~"suit", C) =:= S]), S} || S <- Suits],
    {_, BestSuit} = lists:max(Counts),
    BestSuit.

is_higher_suit(Suit1, Suit2) ->
    suit_rank(Suit1) > suit_rank(Suit2).

%% Bot logic: Stage 2 Takes Selection
make_bot_stage2_bid(BotId, State) ->
    BotDifficulty = maps:get(~"bot_difficulty", State#rules_state.settings, ~"hard"),
    Hand = maps:get(BotId, State#rules_state.hands, []),
    MaxBid = State#rules_state.max_bid,
    TrumpSuit = maps:get(~"suit", MaxBid),
    
    EstimatedTakes = case BotDifficulty of
        ~"easy" ->
            rand:uniform(5) - 1;
        _ ->
            HighCardsCount = length([C || C <- Hand, maps:get(~"value", C) >= 12]),
            TrumpCount = length([C || C <- Hand, maps:get(~"suit", C) =:= TrumpSuit]),
            BaseEstimate = HighCardsCount div 2 + TrumpCount div 3,
            erlang:max(0, erlang:min(13, BaseEstimate))
    end,
    
    MakerId = maps:get(~"player_id", MaxBid),
    case BotId =:= MakerId of
        true ->
            erlang:max(EstimatedTakes, maps:get(~"takes", MaxBid));
        false ->
            LastPlayerId = get_prev_player_id(MakerId),
            case BotId =:= LastPlayerId of
                true ->
                    Sum = lists:sum([
                        case maps:get(~"id", P) of
                            BotId -> 0;
                            _ ->
                                case maps:get(~"bet", P) of
                                    null -> 0;
                                    ~"skip" -> 0;
                                    B -> maps:get(~"takes", B, 0)
                                end
                        end
                        || P <- State#rules_state.players
                    ]),
                    case EstimatedTakes + Sum =:= 13 of
                        true ->
                            case EstimatedTakes > 0 of
                                true -> EstimatedTakes - 1;
                                false -> EstimatedTakes + 1
                            end;
                        false ->
                            EstimatedTakes
                    end;
                false ->
                    EstimatedTakes
            end
    end.
