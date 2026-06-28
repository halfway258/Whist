%%%-------------------------------------------------------------------
%% @doc whist public API
%% @end
%%%-------------------------------------------------------------------

-module(whist_app).

-behaviour(application).

-export([start/2, stop/1]).

-include("whist.hrl").

start(_StartType, _StartArgs) ->
    Dispatch = cowboy_router:compile([
        {'_', [
            {"/", whist_ws_handler, []}
        ]}
    ]),
    {ok, _} = cowboy:start_clear(whist_http_listener,
        [{port, ?DEFAULT_PORT}],
        #{env => #{dispatch => Dispatch}}
    ),
    whist_sup:start_link().

stop(_State) ->
    ok.

%% internal functions
