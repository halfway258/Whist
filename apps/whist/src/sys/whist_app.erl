%%%-------------------------------------------------------------------
%% @doc whist public API
%% @end
%%%-------------------------------------------------------------------

-module(whist_app).

-behaviour(application).

-export([start/2, stop/1]).

-include("whist.hrl").

start(_StartType, _StartArgs) ->
    Port = case os:getenv("PORT") of
        false ->
            case os:getenv("WHIST_PORT") of
                false -> ?DEFAULT_PORT;
                PStr -> list_to_integer(PStr)
            end;
        PStr -> list_to_integer(PStr)
    end,
    Dispatch = cowboy_router:compile([
        {'_', [
            {"/", whist_ws_handler, []}
        ]}
    ]),
    {ok, _} = cowboy:start_clear(whist_http_listener,
        [{port, Port}, {ip, {0,0,0,0}}],
        #{env => #{dispatch => Dispatch}}
    ),
    whist_sup:start_link().

stop(_State) ->
    ok.

%% internal functions
