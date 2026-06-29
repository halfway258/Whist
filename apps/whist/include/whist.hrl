%%%-------------------------------------------------------------------
%%% @doc
%%% Header file containing records and constants for the Whist game application.
%%% @end
%%%-------------------------------------------------------------------

%% Constants
-define(TARGET_SCORE, 100).
-define(MAX_PLAYERS, 4).
-define(DEFAULT_PORT, 8080).
-define(DEALING_DELAY, 3000).
-define(BOT_DELAY, 1000).
-define(CLEAR_TRICK_DELAY, 2000).

%% Records

%% @doc The functional rules state record used by whist_rules.erl
-record(rules_state, {
    stage = lobby :: lobby | dealing | betting | playing | round_end | game_over,
    bidding_stage = suit :: suit | takes | exchange, %% suit = Stage 1, takes = Stage 2, exchange = Card Exchange
    max_bid = null :: map() | null,                  %% e.g., #{~"takes" => 5, ~"suit" => ~"spades", ~"player_id" => ~"p1"}
    consecutive_skips = 0 :: integer(),
    all_pass_count = 0 :: integer(),
    exchange_cards = #{} :: #{binary() => [map()]},  %% Chosen cards to exchange: #{~"p1" => [Card1, Card2]}
    play_style = over :: over | under,
    played_cards = [] :: [map()],                    %% Memory of cards played this round
    voids = #{} :: #{binary() => [binary()]},        %% Track voids: #{~"p2" => [~"hearts"]}
    players = [] :: [map()],
    hands = #{} :: #{binary() => [map()]},
    table_cards = [] :: [map()],
    prompt_data = null :: map() | null,
    trick_winner = null :: binary() | null,
    winner = null :: binary() | null,
    round = 0 :: integer(),
    target_score = ?TARGET_SCORE :: integer(),
    current_turn = <<>> :: binary(),
    ready_players = [] :: [binary()],
    mode = online :: offline | online,
    settings = #{} :: map()
}).

%% @doc The gen_server state record for whist_game.erl (game session coordinator)
-record(game_session_state, {
    room_id :: binary(),
    mode :: offline | online,
    rules_state :: #rules_state{},
    connections = #{} :: #{binary() => pid()},
    spectators = [] :: [pid()]
}).

%% @doc The room record used by whist_room_manager.erl
-record(room, {
    id :: binary(),
    name :: binary(),
    password :: binary() | null,
    game_pid :: pid(),
    players = [] :: [pid()]
}).

%% @doc The gen_server state record for whist_room_manager.erl
-record(room_manager_state, {
    rooms = #{} :: #{binary() => #room{}},
    room_counter = 0 :: integer()
}).

%% @doc The websocket connection state record for whist_ws_handler.erl
-record(ws_state, {
    game_pid = nil :: pid() | nil,
    room_id = nil :: binary() | nil,
    mode = online :: offline | online
}).
