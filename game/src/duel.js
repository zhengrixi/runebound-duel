// duel.js — the rules of Runebound Duel, with no DOM in sight.
// A duel is two fighters, each with HP, Block, a deck, a hand and a discard pile.
// On your turn you get 3 Energy and a fresh hand of 5. Block fades when your next
// turn begins. Burn bites at the start of the burned fighter's turn, then fades by 1.
// Strength makes every hit of your attack cards land +2 harder, and it stacks.

import { CARDS, PLAYER_DECK, FOE_DECK, foeForLevel } from './cards.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(ids, rng) {
  const pile = ids.map((id, i) => ({ uid: `${id}#${i}`, id }));
  for (let i = pile.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pile[i], pile[j]] = [pile[j], pile[i]];
  }
  return pile;
}

function fighter(maxHp, deckIds, rng) {
  return {
    hp: maxHp, maxHp, block: 0, burn: 0, strength: 0, energy: 0,
    deck: shuffled(deckIds, rng), hand: [], discard: [], exhaust: [],
  };
}

export function newRun(rng) {
  return {
    screen: 'title', // title | duel | victory | defeat
    level: 0, turn: 0, score: 0, duelsWon: 0, damageDealt: 0,
    phase: 'player', // player | foe | over
    player: null, foe: null, foeInfo: null,
    lastPlay: null, // { side, cardId } — the card shown in the middle of the table
    log: [],
    rng,
  };
}

export function startDuel(state) {
  const info = foeForLevel(state.level);
  state.foeInfo = info;
  state.player = fighter(state.player ? state.player.maxHp : 30, PLAYER_DECK, state.rng);
  if (state.duelsWon > 0 && state.keptHp) state.player.hp = state.keptHp;
  state.foe = fighter(info.maxHp, FOE_DECK, state.rng);
  state.foe.bonusDamage = info.bonusDamage || 0;
  state.turn = 1;
  state.phase = 'player';
  state.screen = 'duel';
  state.lastPlay = null;
  state.log = [`${info.name}, ${info.title}, takes the far side of the table.`];
  drawCards(state, state.foe, 5);
  beginPlayerTurn(state, true);
  return state;
}

export function drawCards(state, who, n) {
  for (let i = 0; i < n; i++) {
    if (who.deck.length === 0) {
      who.deck = shuffled(who.discard.map((c) => c.id), state.rng);
      who.discard = [];
      if (who.deck.length === 0) return;
    }
    who.hand.push(who.deck.pop());
  }
}

function dealDamage(state, from, to, base, hits) {
  const per = base + (from.strength || 0) * 2 + (from.bonusDamage || 0);
  let total = 0;
  for (let h = 0; h < hits; h++) {
    let dmg = per;
    const blocked = Math.min(to.block, dmg);
    to.block -= blocked;
    dmg -= blocked;
    to.hp = Math.max(0, to.hp - dmg);
    total += dmg;
    if (to.hp <= 0) break;
  }
  if (from === state.player) {
    state.damageDealt += total;
    state.score += total;
  }
  return total;
}

function tickBurn(state, who) {
  if (who.burn <= 0) return 0;
  const dmg = who.burn;
  who.hp = Math.max(0, who.hp - dmg);
  who.burn = Math.max(0, who.burn - 1);
  if (who === state.foe) { state.damageDealt += dmg; state.score += dmg; }
  return dmg;
}

// Applies one card for `who` against `foe`. Returns a list of event strings
// the renderer turns into floaters and sounds. Assumes the cost was paid.
export function applyCard(state, who, foe, cardId) {
  const def = CARDS[cardId];
  const events = [];
  let exhausted = false;
  for (const fx of def.effects) {
    if (fx.kind === 'damage') {
      const dealt = dealDamage(state, who, foe, fx.n, fx.hits);
      events.push({ kind: 'damage', side: foe === state.player ? 'player' : 'foe', n: dealt });
    } else if (fx.kind === 'block') {
      who.block += fx.n;
      events.push({ kind: 'block', side: who === state.player ? 'player' : 'foe', n: fx.n });
    } else if (fx.kind === 'draw') {
      drawCards(state, who, fx.n);
      events.push({ kind: 'draw', side: who === state.player ? 'player' : 'foe', n: fx.n });
    } else if (fx.kind === 'energy') {
      who.energy += fx.n;
      events.push({ kind: 'energy', side: who === state.player ? 'player' : 'foe', n: fx.n });
    } else if (fx.kind === 'heal') {
      const healed = Math.min(fx.n, who.maxHp - who.hp);
      who.hp += healed;
      events.push({ kind: 'heal', side: who === state.player ? 'player' : 'foe', n: healed });
    } else if (fx.kind === 'burn') {
      foe.burn += fx.n;
      events.push({ kind: 'burn', side: foe === state.player ? 'player' : 'foe', n: fx.n });
    } else if (fx.kind === 'strength') {
      who.strength += fx.n;
      events.push({ kind: 'strength', side: who === state.player ? 'player' : 'foe', n: fx.n });
    } else if (fx.kind === 'exhaust') {
      exhausted = true;
    }
  }
  return { events, exhausted };
}

export function canPlay(state, card) {
  return state.phase === 'player' && state.screen === 'duel'
    && CARDS[card.id].cost <= state.player.energy;
}

export function playCard(state, handIndex) {
  const me = state.player;
  const card = me.hand[handIndex];
  if (!card || !canPlay(state, card)) return null;
  me.energy -= CARDS[card.id].cost;
  me.hand.splice(handIndex, 1);
  const { events, exhausted } = applyCard(state, me, state.foe, card.id);
  (exhausted ? me.exhaust : me.discard).push(card);
  state.lastPlay = { side: 'player', cardId: card.id };
  state.log.push(`You play ${CARDS[card.id].name}.`);
  checkEnd(state);
  return events;
}

export function beginPlayerTurn(state, first = false) {
  const me = state.player;
  if (!first) {
    state.turn += 1;
    me.block = 0;
    const burn = tickBurn(state, me);
    if (burn) state.log.push(`Burn bites you for ${burn}.`);
  }
  me.energy = 3;
  drawCards(state, me, 5);
  state.phase = 'player';
  checkEnd(state);
}

export function endPlayerTurn(state) {
  const me = state.player;
  me.discard.push(...me.hand);
  me.hand = [];
  state.phase = 'foe';
}

export function beginFoeTurn(state) {
  const foe = state.foe;
  foe.block = 0;
  const burn = tickBurn(state, foe);
  if (burn) state.log.push(`Burn bites ${state.foeInfo.name} for ${burn}.`);
  foe.energy = 3;
  // No draw here: the foe already holds the hand it drew at the end of its
  // last turn, so the player could read its size — and its intent — all turn.
  checkEnd(state);
}

export function endFoeTurn(state) {
  const foe = state.foe;
  foe.discard.push(...foe.hand);
  foe.hand = [];
  drawCards(state, foe, 5); // the foe's next hand, face down on the table
  if (state.screen === 'duel') beginPlayerTurn(state);
}

export function checkEnd(state) {
  if (state.screen !== 'duel') return;
  if (state.foe.hp <= 0) {
    state.screen = 'victory';
    state.phase = 'over';
    state.duelsWon += 1;
    const bonus = Math.max(0, 60 - state.turn * 3) + state.player.hp;
    state.score += bonus;
    state.keptHp = Math.min(state.player.maxHp, state.player.hp + 8);
    state.log.push(`Victory over ${state.foeInfo.name}. Bonus +${bonus}.`);
  } else if (state.player.hp <= 0) {
    state.screen = 'defeat';
    state.phase = 'over';
    state.log.push(`${state.foeInfo.name} leaves you on the floor.`);
  }
}
