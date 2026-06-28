-module(whist_utils).

-include("whist.hrl").

%% API
-export([
    make_deck/0,
    shuffle/1,
    deal_hands_helper/3,
    get_next_player_id/1,
    find_highest_score_player/1,
    rotate_players/2,
    capitalize_suit/1,
    is_bot_turn/1,
    log/1,
    log/2
]).

%% @doc Generates a standard deck of 52 cards (2 to 14, where 14 is Ace)
make_deck() ->
    Suits = [~"hearts", ~"diamonds", ~"clubs", ~"spades"],
    Values = lists:seq(2, 14),
    [#{~"suit" => S, ~"value" => V} || S <- Suits, V <- Values].

%% @doc Randomly shuffles a list using uniform distribution
shuffle(List) ->
    [X || {_, X} <- lists:sort([{rand:uniform(), N} || N <- List])].

%% @doc Helper to deal hands of 13 cards each
deal_hands_helper([], _, Hands) -> Hands;
deal_hands_helper([#{~"id" := Id} | Rest], Deck, Hands) ->
    {Hand, RemainingDeck} = lists:split(13, Deck),
    deal_hands_helper(Rest, RemainingDeck, maps:put(Id, Hand, Hands)).

%% @doc Get next player ID in round-robin order
get_next_player_id(~"p1") -> ~"p2";
get_next_player_id(~"p2") -> ~"p3";
get_next_player_id(~"p3") -> ~"p4";
get_next_player_id(~"p4") -> ~"p1".

%% @doc Evaluates the highest score player at game over
find_highest_score_player([First | Rest]) ->
    find_highest_score_player_helper(Rest, maps:get(~"id", First), maps:get(~"score", First)).

find_highest_score_player_helper([], WinnerId, _MaxScore) ->
    WinnerId;
find_highest_score_player_helper([P | Rest], WinnerId, MaxScore) ->
    Score = maps:get(~"score", P),
    case Score > MaxScore of
        true -> find_highest_score_player_helper(Rest, maps:get(~"id", P), Score);
        false -> find_highest_score_player_helper(Rest, WinnerId, MaxScore)
    end.

%% @doc Rotates player list so the specified player is at index 0
rotate_players(PlayerId, Players) ->
    case split_at_player(PlayerId, Players, []) of
        {Found, Front, Back} -> Found ++ Back ++ Front;
        false -> Players
    end.

split_at_player(Id, [#{~"id" := Id} = P | Rest], Acc) ->
    {[P], lists:reverse(Acc), Rest};
split_at_player(Id, [P | Rest], Acc) ->
    split_at_player(Id, Rest, [P | Acc]);
split_at_player(_, [], _) ->
    false.

%% @doc Capitalize suit strings for display
capitalize_suit(~"hearts") -> "Hearts";
capitalize_suit(~"diamonds") -> "Diamonds";
capitalize_suit(~"clubs") -> "Clubs";
capitalize_suit(~"spades") -> "Spades";
capitalize_suit(~"no_trump") -> "No Trump";
capitalize_suit(Suit) when is_binary(Suit) -> binary_to_list(Suit).

%% @doc Checks if the current turn player is a bot
is_bot_turn(State) ->
    PlayerId = State#rules_state.current_turn,
    case lists:search(fun(P) -> maps:get(~"id", P) =:= PlayerId end, State#rules_state.players) of
        {value, Player} ->
            maps:get(~"bot", Player, false);
        false ->
            false
    end.

log(Msg) ->
    log("~s", [Msg]).

log(Fmt, Args) ->
    {{Year, Month, Day}, {Hour, Min, Sec}} = calendar:local_time(),
    Timestamp = lists:flatten(io_lib:format("~4..0B-~2..0B-~2..0B ~2..0B:~2..0B:~2..0B", [Year, Month, Day, Hour, Min, Sec])),
    Content = io_lib:format(Fmt, Args),
    LogLine = io_lib:format("~s [Server] ~s~n", [Timestamp, Content]),
    file:write_file("interactions.log", LogLine, [append]),
    io:format("~s [Server] ~s~n", [Timestamp, Content]).
