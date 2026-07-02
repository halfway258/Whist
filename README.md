# Whist Game System

Welcome to **Whist**, a modern, premium web implementation of the classic trick-taking card game. Play online with friends in multiplayer lobbies (featuring user profiles, stats tracking, and disconnection reclaims) or play offline against advanced AI bots.

*   **Play Online Directly**: [https://harand.co/whist](https://harand.co/whist)

---

## 1. Game Overview & Basic Rules

Whist is a classic 4-player trick-taking card game played with a standard 52-card deck.

### Objective
Predict exactly how many tricks you can win in each round. If you win exactly that number of tricks, you earn points. If you miss your prediction, you lose points instead. The player with the highest score at the end of the match wins.

### How to Play

1.  **Dealing**: Each player is dealt 13 cards.
2.  **Bidding**: Players take turns declaring how many tricks they think they will win (between 0 and 13). During this phase, a **Trump suit** (or No Trump) is selected, which beats all other card suits in that round.
3.  **Playing**:
    *   Players take turns playing one card, moving clockwise. The first card played sets the lead suit.
    *   You **must follow the lead suit** if you have a matching card in your hand. If you do not have a card of that suit, you may play any card (including a Trump card).
    *   The trick is won by the player who plays the highest card of the lead suit, or the highest Trump card.
    *   The winner of the trick leads the next round of card play.
4.  **Scoring**: At the end of the round, matching your prediction exactly awards a major score bonus. Missing your prediction by taking too many or too few tricks results in a penalty.

---

## 2. Quick Start: Play Locally

To run the game locally, follow these steps.

### System Requirements
*   **Node.js**: v18+ (with npm)
*   **Erlang/OTP**: v26+ (with `rebar3` installed on your system PATH)

### 1. Installation
Run the dependency installer from the project root:
```bash
chmod +x install.sh
./install.sh
```
This script installs client dependencies and compiles the Erlang backend modules.

### 2. Run in Developer Mode
To boot both the Erlang backend daemon and the Vite client dev server:
```bash
npm run run:local:dev
```
Open your browser and navigate to the address output in the terminal (typically `http://127.0.0.1:5173`). Press `Ctrl+C` in your terminal to shut down both client and server processes cleanly.

### 3. Run in Production Preview
To compile optimized client assets and preview the local production server:
```bash
npm run run:local:prod
```

---

## 3. Desktop App Compilation

You can compile native desktop builds of the client using **Tauri**.

### Build for Desktop (Tauri)
To compile native macOS, Linux, or Windows applications:
```bash
npm run build:desktop
```
This runs the Tauri CLI toolchain against the client files.
