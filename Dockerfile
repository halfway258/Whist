# Stage 1: Build the Erlang release
FROM erlang:28-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git bash gcc musl-dev make

# Set working directory
WORKDIR /build

# Copy configuration and source files
COPY rebar.config rebar.lock ./
COPY apps ./apps
COPY config ./config

# Build production release
RUN rebar3 as prod release

# Stage 2: Create runtime image
FROM erlang:28-alpine

# Install runtime dependencies (bash is sufficient since Erlang is already present)
RUN apk add --no-cache bash

WORKDIR /app

# Copy built release from builder
COPY --from=builder /build/_build/prod/rel/whist ./whist

# Expose port (default 8080, can be overridden by PORT env)
EXPOSE 8080

# Run in foreground
ENTRYPOINT ["/app/whist/bin/whist", "foreground"]
