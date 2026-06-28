// ─── SVG Card Renderer ───
// Pure SVG card generation — no external image assets needed.

const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS = {
  hearts: '#ef4444',
  diamonds: '#ef4444',
  clubs: '#1e293b',
  spades: '#1e293b',
};

const VALUE_LABELS = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

/**
 * Create an SVG card element.
 * @param {{ suit: string, value: number }} card
 * @param {object} [opts]
 * @param {boolean} [opts.small=false] - Render at smaller size
 * @returns {HTMLElement}
 */
export function renderCard(card, opts = {}) {
  const { suit, value } = card;
  const symbol = SUIT_SYMBOLS[suit] || '?';
  const color = SUIT_COLORS[suit] || '#1e293b';
  const label = VALUE_LABELS[value] || value;
  const w = opts.mini ? 28 : (opts.small ? 68 : 90);
  const h = opts.mini ? 40 : (opts.small ? 96 : 128);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 70 100');
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.classList.add('game-card');

  svg.innerHTML = `
    <!-- Card body -->
    <rect x="0.5" y="0.5" width="69" height="99" rx="8" ry="8"
          fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>

    <!-- Top-left value + suit -->
    <text x="5" y="21" font-family="Inter, sans-serif" font-size="20" font-weight="900" fill="${color}">${label}</text>
    <text x="5" y="36" font-family="Inter, sans-serif" font-size="15" fill="${color}">${symbol}</text>

    <!-- Center suit (large) -->
    <text x="35" y="60" font-family="Inter, sans-serif" font-size="30" fill="${color}"
          text-anchor="middle" dominant-baseline="middle">${symbol}</text>

    <!-- Bottom-right value + suit (rotated) -->
    <g transform="rotate(180, 35, 50)">
      <text x="5" y="21" font-family="Inter, sans-serif" font-size="20" font-weight="900" fill="${color}">${label}</text>
      <text x="5" y="36" font-family="Inter, sans-serif" font-size="15" fill="${color}">${symbol}</text>
    </g>
  `;

  // Store card data on the element
  svg.dataset.suit = suit;
  svg.dataset.value = value;

  return svg;
}

/**
 * Create a card-back SVG element.
 * @param {object} [opts]
 * @param {boolean} [opts.small=false]
 * @param {boolean} [opts.mini=false]
 * @returns {HTMLElement}
 */
export function renderCardBack(opts = {}) {
  const w = opts.mini ? 28 : (opts.small ? 68 : 90);
  const h = opts.mini ? 40 : (opts.small ? 96 : 128);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 70 100');
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.classList.add('game-card');

  svg.innerHTML = `
    <!-- Card body -->
    <rect x="0.5" y="0.5" width="69" height="99" rx="8" ry="8"
          fill="#1e3a5f" stroke="#334155" stroke-width="1"/>

    <!-- Pattern border -->
    <rect x="5" y="5" width="60" height="90" rx="5" ry="5"
          fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.4"/>

    <!-- Diamond pattern -->
    <g opacity="0.25" fill="#60a5fa">
      <polygon points="35,15 42,30 35,45 28,30"/>
      <polygon points="35,35 42,50 35,65 28,50"/>
      <polygon points="35,55 42,70 35,85 28,70"/>
      <polygon points="20,25 27,40 20,55 13,40"/>
      <polygon points="50,25 57,40 50,55 43,40"/>
      <polygon points="20,45 27,60 20,75 13,60"/>
      <polygon points="50,45 57,60 50,75 43,60"/>
    </g>

    <!-- Center emblem -->
    <circle cx="35" cy="50" r="10" fill="none" stroke="#60a5fa" stroke-width="1.5" opacity="0.5"/>
    <text x="35" y="54" font-family="Inter, sans-serif" font-size="10" font-weight="700"
          fill="#93c5fd" text-anchor="middle" opacity="0.6">W</text>
  `;

  return svg;
}

/**
 * Get display label for a card value.
 * @param {number} value
 * @returns {string}
 */
export function getValueLabel(value) {
  return VALUE_LABELS[value] || String(value);
}

/**
 * Get suit symbol character.
 * @param {string} suit
 * @returns {string}
 */
export function getSuitSymbol(suit) {
  return SUIT_SYMBOLS[suit] || '?';
}

/**
 * Get suit color.
 * @param {string} suit
 * @returns {string}
 */
export function getSuitColor(suit) {
  return SUIT_COLORS[suit] || '#1e293b';
}
