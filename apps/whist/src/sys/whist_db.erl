-module(whist_db).
-export([init/0, save_room/4, delete_room/1, load_rooms/0]).
-export([register_profile/2, login_profile/2, update_profile_stats/3]).

-include("whist.hrl").

init() ->
    %% Ensure Mnesia directory is set
    MnesiaDir = case os:getenv("MNESIA_DIR") of
        false -> "mnesia_data";
        Path -> Path
    end,
    application:set_env(mnesia, dir, MnesiaDir),
    
    %% Create schema on this node if not already present
    case mnesia:create_schema([node()]) of
        ok -> ok;
        {error, {_, {already_exists, _}}} -> ok;
        Other -> exit(Other)
    end,
    
    ok = mnesia:start(),
    
    %% Create room_db table if it does not exist
    case mnesia:create_table(room_db, [
        {disc_copies, [node()]},
        {attributes, record_info(fields, room_db)},
        {type, set}
    ]) of
        {atomic, ok} -> ok;
        {aborted, {already_exists, room_db}} -> ok;
        {aborted, Reason1} -> exit(Reason1)
    end,

    %% Create player_profile table if it does not exist
    case mnesia:create_table(player_profile, [
        {disc_copies, [node()]},
        {attributes, record_info(fields, player_profile)},
        {type, set}
    ]) of
        {atomic, ok} -> ok;
        {aborted, {already_exists, player_profile}} -> ok;
        {aborted, Reason2} -> exit(Reason2)
    end,
    case mnesia:wait_for_tables([room_db, player_profile], 5000) of
        ok -> ok;
        {timeout, BadTabs} -> exit({timeout_waiting_for_tables, BadTabs});
        {error, ErrReason} -> exit({error_waiting_for_tables, ErrReason})
    end.

save_room(RoomId, Name, Password, RulesState) ->
    Record = #room_db{
        id = RoomId,
        name = Name,
        password = Password,
        rules_state = RulesState
    },
    mnesia:dirty_write(room_db, Record).

delete_room(RoomId) ->
    mnesia:dirty_delete(room_db, RoomId).

load_rooms() ->
    Keys = mnesia:dirty_all_keys(room_db),
    lists:filtermap(fun(Key) ->
        case mnesia:dirty_read(room_db, Key) of
            [#room_db{} = R] -> {true, R};
            _ -> false
        end
    end, Keys).

%% Profile APIs

register_profile(Username, Password) ->
    Hash = crypto:hash(sha256, Password),
    Record = #player_profile{
        username = Username,
        password_hash = Hash,
        games_played = 0,
        games_won = 0,
        total_score = 0
    },
    F = fun() ->
        case mnesia:read(player_profile, Username) of
            [] ->
                mnesia:write(Record),
                ok;
            [_] ->
                {error, already_exists}
        end
    end,
    case mnesia:transaction(F) of
        {atomic, ok} -> ok;
        {atomic, {error, Reason}} -> {error, Reason};
        {aborted, Reason} -> {error, Reason}
    end.

login_profile(Username, Password) ->
    Hash = crypto:hash(sha256, Password),
    case mnesia:dirty_read(player_profile, Username) of
        [#player_profile{password_hash = Hash} = Profile] ->
            {ok, Profile};
        _ ->
            {error, invalid_credentials}
    end.

update_profile_stats(Username, Won, Score) ->
    F = fun() ->
        case mnesia:read(player_profile, Username) of
            [P] ->
                NewWon = case Won of true -> P#player_profile.games_won + 1; false -> P#player_profile.games_won end,
                NewGames = P#player_profile.games_played + 1,
                NewScore = P#player_profile.total_score + Score,
                Updated = P#player_profile{
                    games_played = NewGames,
                    games_won = NewWon,
                    total_score = NewScore
                },
                mnesia:write(Updated);
            [] ->
                ok
        end
    end,
    mnesia:transaction(F).
