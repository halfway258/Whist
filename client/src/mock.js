// ─── Mock Data ───
// Simulates backend state for development. Cycle through stages with keyboard or dev buttons.

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

function randomCard() {
  return {
    suit: SUITS[Math.floor(Math.random() * 4)],
    value: Math.floor(Math.random() * 13) + 2, // 2-14
  };
}

function hand(n) {
  const cards = [];
  for (let i = 0; i < n; i++) cards.push(randomCard());
  return cards;
}

export const MOCK_STATES = {
  LOBBY: {
    current_stage: 'LOBBY',
    game_stats: { round: 0, target_score: 100 },
    players: [
      { id: 'p1', name: 'You', score: 0, tricks_taken: 0, is_turn: false, cards_played: [], bet: null, status: '' },
    ],
    my_hand: [],
    table_cards: [],
    prompt_data: null,
    trick_winner: null,
    winner: null,
  },

  DEALING: {
    current_stage: 'DEALING',
    game_stats: { round: 1, target_score: 100 },
    players: [
      { id: 'p1', name: 'You', score: 0, tricks_taken: 0, is_turn: false, cards_played: [], bet: null, status: '' },
      { id: 'p2', name: 'Alice', score: 0, tricks_taken: 0, is_turn: false, cards_played: [], bet: null, status: '' },
      { id: 'p3', name: 'Bob', score: 0, tricks_taken: 0, is_turn: false, cards_played: [], bet: null, status: '' },
      { id: 'p4', name: 'Carol', score: 0, tricks_taken: 0, is_turn: false, cards_played: [], bet: null, status: '' },
    ],
    my_hand: hand(13),
    table_cards: [],
    prompt_data: null,
    trick_winner: null,
    winner: null,
  },

  BETTING: {
    current_stage: 'BETTING',
    game_stats: { round: 1, target_score: 100 },
    players: [
      { id: 'p1', name: 'You', score: 0, tricks_taken: 0, is_turn: true, cards_played: [], bet: null, status: '' },
      { id: 'p2', name: 'Alice', score: 0, tricks_taken: 0, is_turn: false, cards_played: [], bet: 3, status: 'Bet 3' },
      { id: 'p3', name: 'Bob', score: 0, tricks_taken: 0, is_turn: false, cards_played: [], bet: null, status: 'Thinking...' },
      { id: 'p4', name: 'Carol', score: 0, tricks_taken: 0, is_turn: false, cards_played: [], bet: 5, status: 'Bet 5' },
    ],
    my_hand: [
      { suit: 'spades', value: 14 },
      { suit: 'spades', value: 13 },
      { suit: 'hearts', value: 12 },
      { suit: 'hearts', value: 10 },
      { suit: 'hearts', value: 7 },
      { suit: 'diamonds', value: 14 },
      { suit: 'diamonds', value: 9 },
      { suit: 'diamonds', value: 5 },
      { suit: 'clubs', value: 11 },
      { suit: 'clubs', value: 8 },
      { suit: 'clubs', value: 6 },
      { suit: 'clubs', value: 3 },
      { suit: 'spades', value: 4 },
    ],
    table_cards: [],
    prompt_data: { min_bet: 0, max_bet: 13 },
    trick_winner: null,
    winner: null,
  },

  PLAYING: {
    current_stage: 'PLAYING',
    game_stats: { round: 1, target_score: 100 },
    players: [
      { id: 'p1', name: 'You', score: 12, tricks_taken: 2, is_turn: true, cards_played: [], bet: 4, status: '' },
      { id: 'p2', name: 'Alice', score: 8, tricks_taken: 1, is_turn: false, cards_played: [], bet: 3, status: '' },
      { id: 'p3', name: 'Bob', score: 15, tricks_taken: 2, is_turn: false, cards_played: [], bet: 2, status: '' },
      { id: 'p4', name: 'Carol', score: 10, tricks_taken: 3, is_turn: false, cards_played: [], bet: 5, status: '' },
    ],
    my_hand: [
      { suit: 'spades', value: 14 },
      { suit: 'hearts', value: 12 },
      { suit: 'hearts', value: 7 },
      { suit: 'diamonds', value: 14 },
      { suit: 'diamonds', value: 9 },
      { suit: 'clubs', value: 11 },
      { suit: 'clubs', value: 8 },
      { suit: 'clubs', value: 3 },
    ],
    table_cards: [
      { player_id: 'p2', card: { suit: 'clubs', value: 12 } },
      { player_id: 'p3', card: { suit: 'clubs', value: 5 } },
      { player_id: 'p4', card: { suit: 'clubs', value: 14 } },
    ],
    prompt_data: null,
    trick_winner: null,
    winner: null,
  },

  ROUND_END: {
    current_stage: 'ROUND_END',
    game_stats: { round: 1, target_score: 100 },
    players: [
      { id: 'p1', name: 'You', score: 38, tricks_taken: 4, is_turn: false, cards_played: [], bet: 4, status: '', score_change: 26 },
      { id: 'p2', name: 'Alice', score: 27, tricks_taken: 3, is_turn: false, cards_played: [], bet: 3, status: '', score_change: 19 },
      { id: 'p3', name: 'Bob', score: 5, tricks_taken: 1, is_turn: false, cards_played: [], bet: 2, status: '', score_change: -10 },
      { id: 'p4', name: 'Carol', score: 45, tricks_taken: 5, is_turn: false, cards_played: [], bet: 5, status: '', score_change: 35 },
    ],
    my_hand: [],
    table_cards: [],
    prompt_data: null,
    trick_winner: null,
    winner: null,
  },

  GAME_OVER: {
    current_stage: 'GAME_OVER',
    game_stats: { round: 8, target_score: 100 },
    players: [
      { id: 'p1', name: 'You', score: 102, tricks_taken: 0, is_turn: false, cards_played: [], bet: null, status: '' },
      { id: 'p2', name: 'Alice', score: 87, tricks_taken: 0, is_turn: false, cards_played: [], bet: null, status: '' },
      { id: 'p3', name: 'Bob', score: 64, tricks_taken: 0, is_turn: false, cards_played: [], bet: null, status: '' },
      { id: 'p4', name: 'Carol', score: 111, tricks_taken: 0, is_turn: false, cards_played: [], bet: null, status: '' },
    ],
    my_hand: [],
    table_cards: [],
    prompt_data: null,
    trick_winner: null,
    winner: { id: 'p4', name: 'Carol' },
  },
};

/**
 * Get mock state for a given stage.
 * @param {string} stage
 * @returns {object}
 */
export function getMockState(stage) {
  return structuredClone(MOCK_STATES[stage] || MOCK_STATES.LOBBY);
}
