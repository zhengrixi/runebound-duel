// ai.js — the rival across the table.
// The foe plays greedily, one card at a time, so the renderer can animate each
// play: free cards and setup first, heals when hurt, block when your Strength
// says you are about to hit hard, and attacks aimed through your Block.
// Its intent — what it threatens to do with the hand it is holding — is computed
// from that same hand, so a player who reads it can block, burn or race it.

import { CARDS } from './cards.js';
import { applyCard, checkEnd } from './duel.js';

function damageOf(state, cardId) {
  const foe = state.foe;
  let total = 0;
  for (const fx of CARDS[cardId].effects) {
    if (fx.kind === 'damage') total += (fx.n + foe.strength * 2 + (foe.bonusDamage || 0)) * fx.hits;
  }
  return total;
}

function scoreCard(state, card) {
  const foe = state.foe;
  const me = state.player;
  const def = CARDS[card.id];
  let score = 0;
  for (const fx of def.effects) {
    if (fx.kind === 'damage') {
      const raw = damageOf(state, card.id);
      const through = Math.max(0, raw - me.block);
      score += through * 2;
      if (through >= me.hp) score += 1000; // a killing blow beats everything
      if (me.block > 0 && raw <= me.block) score -= 4; // wasted on a wall
    } else if (fx.kind === 'block') {
      const threat = 6 + me.strength * 4 + Math.min(8, state.turn);
      score += Math.min(fx.n, threat) * (foe.hp <= 12 ? 1.6 : 1.0);
    } else if (fx.kind === 'heal') {
      score += foe.hp <= foe.maxHp - fx.n ? fx.n * (foe.hp <= 10 ? 2.2 : 1.1) : -6;
    } else if (fx.kind === 'burn') {
      score += fx.n * (state.turn <= 3 ? 3 : 1.5);
    } else if (fx.kind === 'strength' || fx.kind === 'energy' || fx.kind === 'draw') {
      score += 9; // setup pays for itself; play it early
    }
  }
  return score - def.cost; // cheaper cards win ties
}

// One step of the foe's turn: pick its best affordable card and play it.
// Returns the events for the renderer, or null when the foe is done.
export function foePlayOne(state) {
  const foe = state.foe;
  if (state.screen !== 'duel') return null;
  let best = -1;
  let bestScore = -Infinity;
  foe.hand.forEach((card, i) => {
    if (CARDS[card.id].cost > foe.energy) return;
    const s = scoreCard(state, card);
    if (s > bestScore) { bestScore = s; best = i; }
  });
  if (best < 0 || bestScore <= -8) return null;
  const card = foe.hand[best];
  foe.energy -= CARDS[card.id].cost;
  foe.hand.splice(best, 1);
  const { events, exhausted } = applyCard(state, foe, state.player, card.id);
  (exhausted ? foe.exhaust : foe.discard).push(card);
  state.lastPlay = { side: 'foe', cardId: card.id };
  state.log.push(`${state.foeInfo.name} plays ${CARDS[card.id].name}.`);
  checkEnd(state);
  return events;
}

// What the foe threatens with the hand it now holds, in one readable line:
// the damage its greedy plays would push through your current Block, or the
// shape of its plan when it holds no attack at all.
export function foeIntent(state) {
  const foe = state.foe;
  const me = state.player;
  let energy = 3;
  let damage = 0;
  let blocks = 0;
  let heals = 0;
  const hand = [...foe.hand].sort((a, b) => scoreCard(state, b) - scoreCard(state, a));
  for (const card of hand) {
    const def = CARDS[card.id];
    if (def.cost > energy) continue;
    energy -= def.cost;
    damage += damageOf(state, card.id);
    for (const fx of def.effects) {
      if (fx.kind === 'block') blocks += fx.n;
      if (fx.kind === 'heal') heals += fx.n;
    }
  }
  const through = Math.max(0, damage - me.block);
  if (through > 0) return { kind: 'attack', n: through, label: `Intends to strike for ${through}` };
  if (blocks > 0) return { kind: 'block', n: blocks, label: `Intends to raise ${blocks} Block` };
  if (heals > 0) return { kind: 'heal', n: heals, label: `Intends to mend ${heals} HP` };
  return { kind: 'scheme', n: 0, label: 'Scheming — drawing and kindling' };
}
