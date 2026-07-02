# Whist Frontend Client Documentation

This document describes the technical architecture and features of the Whist single-page web application client, built using Vanilla JavaScript, HTML, CSS (via Tailwind CSS v4 and modern CSS features), and Vite.

---

## 1. Directory Structure & Key Files

The client source code is organized within the `client/` directory:

```
client/
├── index.html           # Main SPA layout and stage containers
├── package.json         # Scripts and dependencies (Vite)
├── public/              # Static assets (favicons, etc.)
└── src/
    ├── assets/          # Card assets, icons, etc.
    ├── components/
    │   └── hud.js       # Persistent HUD component
    ├── stages/
    │   ├── lobby.js      # Lobby stage (auth, room creation, waiting room)
    │   ├── dealing.js    # Dealing animation stage
    │   ├── betting.js    # Bidding & card exchange stage
    │   ├── playing.js    # Main card table gameplay stage
    │   ├── round-end.js  # Round score recap and ready stage
    │   └── game-over.js  # Final results and podium stage
    ├── logger.js        # User interaction logger
    ├── main.js          # App bootstrapper, inactivity manager, and toast system
    ├── network.js       # WebSocket Connection Manager with backoff reconnect
    ├── router.js        # DOM-swapping page router
    ├── state.js         # Reactive central store (Single Source of Truth)
    └── style.css        # Core stylesheet (Tailwind v4 imports, design tokens)
```

---

## 2. Core Architecture Modules

### A. State Manager (`src/state.js`)
The client follows a **Single Source of Truth** architecture. The entire game state is owned by the backend. When a state update frame is received over the WebSocket, it replaces the local state.
*   **API**:
    *   `updateState(newState)`: Merges new properties, updates `gameState`, and alerts subscribers.
    *   `getState()`: Returns a snapshot of the current state.
    *   `subscribe(callback)`: Registers a callback to trigger on updates. Returns an unsubscribe function.

### B. Connection Manager (`src/network.js`)
Wraps the HTML5 browser WebSocket API to handle connection state, heartbeats, and re-connections.
*   **Exponential Backoff**: If disconnected, it schedules a reconnection, starting at a 1000ms delay and doubling up to a maximum of 10000ms. Upon successful connection, the delay resets to 1000ms.
*   **Heartbeat Ping/Pong**: Sends a `{"action": "ping"}` frame every 15 seconds to keep the TCP/WebSocket channel alive and detect dead connections.
*   **Automatic Re-joining**: When a reconnection completes, if `state.room_id` is defined, the manager automatically sends a `join_room` request to reclaim the player's seat.

### C. Client Router (`src/router.js`)
Performs page navigation by caching DOM selectors for all stage sections (`lobby`, `dealing`, `betting`, `playing`, `round_end`, `game_over`) and toggling the `.active` class.
*   **Routing**: On each state change, `routeState(state)` is triggered, which identifies the new active stage, adds/removes `.active`, displays the HUD if appropriate, and executes the designated stage renderer.

---

## 3. Stage Renderers (`src/stages/`)

Stage renderers are functional modules that compile HTML templates, bind event listeners, and render elements dynamically.

### lobby.js (Lobby Stage)
Manages user profiles, room directories, and waiting lobbies.
1.  **Authentication Mode**: Registers or logs in players, validating credential hashes via Mnesia database queries.
2.  **Room Selection**: Renders a list of active rooms. Shows lock icons for password-protected rooms and prompts password modals when clicked.
3.  **Room Creation**: Configures new room creation parameters (room name, password).
4.  **Waiting Room**: Displays player seating slots, toggles player ready states, and allows chat messaging.
5.  **Room Configuration Settings**: Accessible to the host (`p1`), enabling configuration of:
    *   *End Condition*: Play until target score is reached, or play for a set number of rounds.
    *   *Target Score*: Target points needed to win (up to 500).
    *   *Target Rounds*: Target rounds to play (up to 20).
    *   *Card Exchange Count*: Cards passed on All-Pass rounds (0 to 4 cards).
    *   *Bot Difficulty*: Easy or Hard mode.
6.  **Spectator Restrictions**: If the user is spectating the room, lobby actions (Settings, Refresh, and player cards profile modal clicks) are disabled and styled as unclickable. The spectator can only use the chat and Exit Room buttons.

### dealing.js (Dealing Animation Stage)
Displays a dealing animation. Cards fly from the center deck into players' respective hands.
*   Uses CSS custom properties (`--deal-x`, `--deal-y`, `--deal-rot`, `--deal-delay`) to calculate coordinates for the 4 seats, executing smooth translate animations.

### betting.js (Betting Phase)
Aggregates the user interface for the three betting sub-phases:
1.  **Stage 1 Suit Selection**: Shows contract options (trick prediction count $5-13$ and Trump suit/No Trump). Disables options lower than the current highest bid. Includes a "Pass" button.
2.  **Stage 2 Takes Selection**: Predicted trick selectors ($0-13$). Highlight restrictions for the last bidder (e.g. locks the value that would make the sum of all bids equal exactly 13).
3.  **Card Exchange Selection**: Active on all-pass rounds. Prompts the user to select $N$ cards from their hand to swap, highlighting selected cards and unlocking the swap button once the quota is reached.

### playing.js (Card Table Gameplay Stage)
Renders the game table felt.

```
                  Seat 3 (Partner / Opponent)
                         [Card Slot]
   Seat 4 (Opponent)                    Seat 2 (Opponent)
      [Card Slot]                          [Card Slot]
                         [Card Slot]
                     Seat 1 (Local Player)
                      [Fanned Player Hand]
```

*   **Seat Rotation**: Dynamically rotates players relative to the viewer. The local player (`p1`) is always rendered at the bottom, with subsequent players rotating clockwise.
*   **Fanned Hand**: Positions the hand in a fan using trigonometry and CSS offsets (`--card-offset` and `--card-rot`).
*   **Playability Filters**: Validates cards. Cards that do not match the lead suit (when the player holds matching suits) are greyed out (`.unplayable`) and disabled. Playable cards lift and highlight on hover.
*   **Played Slots**: Displays the cards played on the table.
*   **Last Trick**: Displays a summary of the last resolved trick.

### round-end.js (Round Recap)
Displays a scoreboard listing each player's prediction, actual tricks won, and the score changes (e.g. $+35$ or $-20$). Features a ready button to continue to the next round.

### game-over.js (Podium)
Displays the final winner, ranks all players on a leaderboard, and provides a return button to go back to the lobby.

---

## 4. HUD Overlay (`src/components/hud.js`)

A persistent overlay visible during active gameplay stages:
*   Displays the current round number.
*   Shows the active trump suit icon and its corresponding color.
*   Displays the active play style (**OVER** in gold or **UNDER** in blue).
*   Displays spectator icons when viewing as a spectator.
*   Includes a slide-over settings drawer to toggle local display settings, such as adjusting text size or changing card sizes.

---

## 5. Inactivity Timers, Bot Takeovers & Page Reloads

### Turn Inactivity & Bot Takeover
To keep online matches moving, `main.js` manages turn inactivity timeouts:
1.  When it becomes the local player's turn (during bidding, card exchanges, or playing phases), a 60-second inactivity timer begins.
2.  If 60 seconds pass without user activity, a modal overlay appears: **"Are you still there?"**, accompanied by a 30-second audio-visual countdown.
3.  If the user clicks "Yes, I'm here!", the countdown stops and the timer resets.
4.  If the countdown reaches 0, the client automatically sends a `{"action": "set_bot_mode", "bot": true}` command to the backend.
5.  A bot takes over the player's turns. An emerald banner displays on the user's screen: **"Bot Takeover Active"**.
6.  The user can click **"Resume Control"** at any time to toggle bot mode off and resume playing.

### Page Reload / Refresh Button
To facilitate troubleshooting, a hard reload option is provided inside the settings menu:
*   **Settings Menu**: Visible at the bottom of the actions container under both start-rules mode and normal mode.
*   *Action*: Clicking this button performs a clean application reload (`window.location.reload()`), equivalent to pressing the F5 key.

### Round End Voting
For games configured with "Choose after each round" (target_rounds = 0), a vote selection container is rendered:
*   **Persistent Vote Buttons**: Unlike the standard ready button, the "Vote Continue" and "Vote End Game" buttons remain visible and enabled.
*   **Vote Changing**: Players can toggle or change their vote at any time. Clicking the other option highlights it and registers the new vote on the backend.
*   **Unanimous Decision progression**: The backend will only transition the stage (either next round dealing or final game over standings) once all human players have reached a unanimous consensus. If votes are split, the game remains on the recap screen, allowing players to coordinate and change their selections.

---

## 6. Styling, Theming, and Glassmorphism

Styling is located in [style.css](file:///home/hc/Documents/whist/client/src/style.css). It uses Tailwind CSS v4 features, CSS custom properties, and modern animations:

*   **Design Tokens**: Themes variables like `--color-felt` (dark green), `--color-felt-light` (medium green), and `--color-glass` (slate glass).
*   **Glassmorphism**: `.glass` cards use `backdrop-filter: blur(16px)` combined with subtle translucent borders.
*   **Fanning Transitions**: Fanned cards use smooth cubic-bezier translations. When a card is hovered, adjacent cards slide left or right and tilt slightly using the `:has()` sibling CSS selector:
    ```css
    .fanned-hand .game-card.playable:hover + .game-card {
      transform: translateX(calc(-50% + var(--card-offset, 0px) + 20px)) rotate(calc(var(--card-rot, 0deg) + 6deg));
    }
    .fanned-hand .game-card.playable:has(+ .game-card:hover) {
      transform: translateX(calc(-50% + var(--card-offset, 0px) - 20px)) rotate(calc(var(--card-rot, 0deg) - 6deg));
    }
    ```
*   **Responsive Scaling**: The base font size defaults to `18px` for larger typography and scales down to `14px` on mobile displays to fit card templates. Cards adjust dynamically from a width of `90px` on desktop to `54px` on mobile.
