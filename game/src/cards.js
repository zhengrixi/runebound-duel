// cards.js — the card pool of Runebound Duel.
// Four runes (suits), told apart by colour AND shape, never by text alone:
//   ember (red flame)   — damage
//   aegis (gold shield) — block and counterplay
//   tide  (blue wave)   — draw, energy and healing
//   hex   (violet moon) — burn and draining
// Every card is data: the duel engine reads these definitions and applies them.

export const SUITS = {
  ember: { name: 'Ember', color: '#ff5a3c', soft: '#ffd9cf', icon: 'flame' },
  aegis: { name: 'Aegis', color: '#f2b63d', soft: '#ffedbe', icon: 'shield' },
  tide: { name: 'Tide', color: '#3fa9f5', soft: '#cfeaff', icon: 'wave' },
  hex: { name: 'Hex', color: '#b06ee8', soft: '#ecd9ff', icon: 'moon' },
};

// effect kinds the engine understands:
//   damage n (hits times), block n, draw n, energy n, heal n,
//   burn n (damage over time on the foe), strength n (your hits grow), exhaust
export const CARDS = {
  'flame-strike': {
    name: 'Flame Strike', suit: 'ember', cost: 1, rarity: 'common',
    text: 'Deal 6 damage.',
    effects: [{ kind: 'damage', n: 6, hits: 1 }],
  },
  'twin-fangs': {
    name: 'Twin Fangs', suit: 'ember', cost: 1, rarity: 'common',
    text: 'Deal 4 damage twice. Strength counts both times.',
    effects: [{ kind: 'damage', n: 4, hits: 2 }],
  },
  'inferno': {
    name: 'Inferno', suit: 'ember', cost: 2, rarity: 'rare',
    text: 'Deal 11 damage.',
    effects: [{ kind: 'damage', n: 11, hits: 1 }],
  },
  'kindled-rage': {
    name: 'Kindled Rage', suit: 'ember', cost: 0, rarity: 'rare',
    text: 'Gain 1 Strength. Your attacks deal +2 damage. Exhaust.',
    effects: [{ kind: 'strength', n: 1 }, { kind: 'exhaust' }],
  },
  'bulwark': {
    name: 'Bulwark', suit: 'aegis', cost: 1, rarity: 'common',
    text: 'Gain 8 Block.',
    effects: [{ kind: 'block', n: 8 }],
  },
  'mirror-guard': {
    name: 'Mirror Guard', suit: 'aegis', cost: 1, rarity: 'common',
    text: 'Gain 5 Block. Draw 1 card.',
    effects: [{ kind: 'block', n: 5 }, { kind: 'draw', n: 1 }],
  },
  'riposte': {
    name: 'Riposte', suit: 'aegis', cost: 1, rarity: 'common',
    text: 'Deal 5 damage. Gain 5 Block.',
    effects: [{ kind: 'damage', n: 5, hits: 1 }, { kind: 'block', n: 5 }],
  },
  'tidal-surge': {
    name: 'Tidal Surge', suit: 'tide', cost: 1, rarity: 'common',
    text: 'Draw 2 cards.',
    effects: [{ kind: 'draw', n: 2 }],
  },
  'deep-breath': {
    name: 'Deep Breath', suit: 'tide', cost: 0, rarity: 'rare',
    text: 'Gain 1 Energy. Draw 1 card. Exhaust.',
    effects: [{ kind: 'energy', n: 1 }, { kind: 'draw', n: 1 }, { kind: 'exhaust' }],
  },
  'second-wind': {
    name: 'Second Wind', suit: 'tide', cost: 2, rarity: 'rare',
    text: 'Heal 7 HP.',
    effects: [{ kind: 'heal', n: 7 }],
  },
  'hex-brand': {
    name: 'Hex Brand', suit: 'hex', cost: 1, rarity: 'common',
    text: 'Brand the foe with 3 Burn. Burn bites at the start of its turn.',
    effects: [{ kind: 'burn', n: 3 }],
  },
  'soul-drain': {
    name: 'Soul Drain', suit: 'hex', cost: 2, rarity: 'rare',
    text: 'Deal 5 damage. Heal 3 HP.',
    effects: [{ kind: 'damage', n: 5, hits: 1 }, { kind: 'heal', n: 3 }],
  },
};

// The player's 20-card deck: a little of everything, so most hands hold a choice.
export const PLAYER_DECK = [
  'flame-strike', 'flame-strike', 'flame-strike',
  'twin-fangs', 'twin-fangs',
  'inferno',
  'kindled-rage',
  'bulwark', 'bulwark', 'bulwark',
  'mirror-guard', 'mirror-guard',
  'riposte', 'riposte',
  'tidal-surge', 'tidal-surge',
  'deep-breath',
  'second-wind',
  'hex-brand', 'hex-brand',
  'soul-drain',
];

// The rival's 20-card deck: heavier on attacks, lighter on patience.
export const FOE_DECK = [
  'flame-strike', 'flame-strike', 'flame-strike', 'flame-strike',
  'twin-fangs', 'twin-fangs',
  'inferno', 'inferno',
  'kindled-rage',
  'bulwark', 'bulwark', 'bulwark',
  'mirror-guard', 'mirror-guard',
  'riposte', 'riposte',
  'hex-brand', 'hex-brand',
  'second-wind',
  'soul-drain',
];

// The ladder of rivals, weakest first. Beating one unlocks the next, forever.
export const FOES = [
  { name: 'Sella', title: 'the Ash Knight', sigil: 'sword', maxHp: 34, tint: '#8a4b2a' },
  { name: 'Brother Cinder', title: 'the Burnt Monk', sigil: 'flame', maxHp: 42, tint: '#7a2d35' },
  { name: 'Vey', title: 'the Tide Oracle', sigil: 'wave', maxHp: 50, tint: '#274b73' },
  { name: 'The Hollow Regent', title: 'last of the Rune Kings', sigil: 'crown', maxHp: 60, tint: '#4b2d6e' },
];

export function foeForLevel(level) {
  const base = FOES[Math.min(level, FOES.length - 1)];
  const extra = Math.max(0, level - (FOES.length - 1));
  return {
    ...base,
    name: extra > 0 ? `${base.name} +${extra}` : base.name,
    maxHp: base.maxHp + extra * 10,
    bonusDamage: extra,
  };
}
