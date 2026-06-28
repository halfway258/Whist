-module(whist_stage_game_over).

-include("whist.hrl").

-export([return_menu/1]).

%% @doc Resets the rules state back to lobby.
return_menu(_State) ->
    {ok, whist_rules:init(online)}.
