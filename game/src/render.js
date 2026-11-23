// render.js — turns duel state into the table you see: the foe's face-down hand
// across the top, the last card played standing in the middle, your hand fanned
// along the bottom, and every total a judge could ask for drawn big and plain.

import { CARDS, SUITS } from './cards.js';
import { foeIntent } from './ai.js';

const PATHS = {
  flame: 'M32 3c4 9 13 15 13 26a13 13 0 1 1-26 0c0-11 9-17 13-26zM32 33c2 4 5 6 5 10a5 5 0 1 1-10 0c0-4 3-6 5-10z',
  shield: 'M32 4l20 7v16c0 14-8 26-20 33C20 53 12 41 12 27V11z',
  wave: 'M4 21q14-11 28 0t28 0v9q-14 11-28 0T4 30zM4 39q14-11 28 0t28 0v9q-14 11-28 0T4 48z',
  moon: 'M42 6a26 26 0 1 0 16 40A30 30 0 0 1 42 6z',
  sword: 'M32 2l5.5 8v29h-11V10zM16 39h32v7H16zM29.5 46h5v9h-5zM32 55m-4.2 0a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0-8.4 0',
  crown: 'M8 44l-2-26 12 10L32 12l14 16 12-10-2 26zM10 50h44v6H10z',
  heart: 'M32 56S8 40 8 24a12 12 0 0 1 24-5 12 12 0 0 1 24 5c0 16-24 32-24 32z',
  gem: 'M32 4l16 18-16 38L16 22z',
};

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 64 64" fill-rule="evenodd" aria-hidden="true"><path d="${PATHS[name] || PATHS.gem}"/></svg>`;
}

function hpBar(who, label) {
  const pct = Math.max(0, Math.round((who.hp / who.maxHp) * 100));
  const low = who.hp <= who.maxHp * 0.3 ? ' low' : '';
  return `<div class="hpbar${low}"><div class="hpfill" style="width:${pct}%"></div>
    <span class="hptext">${icon('heart')} ${label} ${who.hp} / ${who.maxHp}</span></div>`;
}

function chips(who) {
  const out = [];
  if (who.block > 0) out.push(`<span class="chip block">${icon('shield')} Block ${who.block}</span>`);
  if (who.burn > 0) out.push(`<span class="chip burn">${icon('flame')} Burn ${who.burn}</span>`);
  if (who.strength > 0) out.push(`<span class="chip str">${icon('sword')} Strength ${who.strength}</span>`);
  return out.join('');
}

export function cardEl(card, { small = false, playable = false, dim = false } = {}) {
  const def = CARDS[card.id];
  const suit = SUITS[def.suit];
  return `<div class="card ${def.suit} ${def.rarity}${small ? ' small' : ''}${playable ? ' playable' : ''}${dim ? ' dim' : ''}"
      style="--suit:${suit.color};--suit-soft:${suit.soft}">
    <div class="cost">${def.cost}</div>
    <div class="card-art">${icon(suit.icon)}</div>
    <div class="card-name">${def.name}</div>
    <div class="card-suit">${icon(suit.icon)} ${suit.name}${def.rarity === 'rare' ? ' · Rare' : ''}</div>
    <div class="card-text">${def.text}</div>
  </div>`;
}

function cardBack(sigil) {
  return `<div class="cardback">${icon(sigil || 'gem')}</div>`;
}

function foeZone(state) {
  const foe = state.foe;
  const info = state.foeInfo;
  const intent = state.phase === 'player' ? foeIntent(state) : null;
  const backs = foe.hand.map(() => cardBack(info.sigil)).join('');
  return `<section class="foe-zone">
    <div class="foe-hand" title="The foe's hand">${backs || '<span class="empty-note">no cards in hand</span>'}</div>
    <div class="foe-main">
      <div class="portrait foe-portrait" id="foe-portrait" style="--tint:${info.tint}">${icon(info.sigil)}</div>
      <div class="foe-facts">
        <div class="fighter-name">${info.name} <span class="fighter-title">${info.title}</span></div>
        ${hpBar(foe, 'Foe')}
        <div class="chips">${chips(foe)}</div>
        ${intent ? `<div class="intent intent-${intent.kind}">${icon(intent.kind === 'attack' ? 'sword' : intent.kind === 'block' ? 'shield' : intent.kind === 'heal' ? 'heart' : 'moon')} ${intent.label}</div>` : ''}
      </div>
      <div class="pile foe-pile">Deck<br><b>${foe.deck.length}</b></div>
    </div>
  </section>`;
}

function stageZone(state) {
  const last = state.lastPlay;
  const card = last ? `<div class="stage-card ${last.side}">${cardEl({ id: last.cardId })}</div>` : '';
  const log = state.log.slice(-2).map((l) => `<div>${l}</div>`).join('');
  return `<section class="stage">${card}<div class="log">${log}</div></section>`;
}

function playerZone(state) {
  const me = state.player;
  const orbs = Array.from({ length: Math.max(3, me.energy) }, (_, i) =>
    `<span class="orb${i < me.energy ? ' lit' : ''}">${icon('gem')}</span>`).join('');
  const hand = me.hand.map((card, i) => {
    const playable = CARDS[card.id].cost <= me.energy && state.phase === 'player';
    return `<div class="hand-slot" data-play="${i}" style="--tilt:${(i - (me.hand.length - 1) / 2) * 4}deg;--lift:${Math.abs(i - (me.hand.length - 1) / 2) * 7}px">
      ${cardEl(card, { playable, dim: !playable })}</div>`;
  }).join('');
  return `<section class="player-zone">
    <div class="player-main">
      <div class="pile">Deck<br><b>${me.deck.length}</b></div>
      <div class="player-facts">
        <div class="fighter-name">You <span class="fighter-title">the Runebound challenger</span></div>
        ${hpBar(me, 'You')}
        <div class="chips">${chips(me)}</div>
      </div>
      <div class="portrait me-portrait" id="me-portrait">${icon('crown')}</div>
    </div>
    <div class="hand-row">${hand || '<span class="empty-note">hand is empty</span>'}</div>
    <div class="controls">
      <div class="energy" title="Energy">${orbs}<span class="energy-n">${me.energy} Energy</span></div>
      <div class="pile slim">Discard <b>${me.discard.length}</b> · Exhaust <b>${me.exhaust.length}</b></div>
      <button id="end-turn" ${state.phase !== 'player' ? 'disabled' : ''}>End Turn ⏎</button>
    </div>
  </section>`;
}

function hud(state) {
  return `<header class="hud">
    <div class="hud-left">Duel ${state.duelsWon + 1} · Turn ${state.turn}</div>
    <div class="hud-title">RUNEBOUND DUEL</div>
    <div class="hud-right">Score <b>${state.score}</b> · Won <b>${state.duelsWon}</b></div>
  </header>`;
}

function screens(state) {
  if (state.screen === 'title') {
    return `<div class="screen title-screen">
      <div class="logo-runes">${icon('flame')}${icon('shield')}${icon('wave')}${icon('moon')}</div>
      <h1>RUNEBOUND<br>DUEL</h1>
      <p class="tagline">A card duel across a tavern table. Read the foe's intent,<br>
      spend your 3 Energy wisely, and put every rival on the floor.</p>
      <button id="start-btn" class="big-btn">Begin the Duel</button>
      <p class="howto">Click a card (or press 1–5) to play it · Space ends your turn<br>
      Block fades at your next turn · Burn bites at the start of a turn · Strength makes every hit land +2</p>
    </div>`;
  }
  if (state.screen === 'victory') {
    return `<div class="screen end-screen victory">
      <div class="end-sigil">${icon('crown')}</div>
      <h1>VICTORY</h1>
      <p class="tagline">${state.foeInfo.name} is on the floor. You keep ${state.keptHp} HP for the next duel.</p>
      <div class="end-stats"><span>Score <b>${state.score}</b></span><span>Duels won <b>${state.duelsWon}</b></span><span>Damage dealt <b>${state.damageDealt}</b></span></div>
      <button id="next-btn" class="big-btn">Face the Next Rival</button>
    </div>`;
  }
  if (state.screen === 'defeat') {
    return `<div class="screen end-screen defeat">
      <div class="end-sigil">${icon('moon')}</div>
      <h1>DEFEAT</h1>
      <p class="tagline">${state.foeInfo.name} leaves you on the floorboards — after ${state.duelsWon} won duel${state.duelsWon === 1 ? '' : 's'}.</p>
      <div class="end-stats"><span>Final score <b>${state.score}</b></span><span>Duels won <b>${state.duelsWon}</b></span><span>Damage dealt <b>${state.damageDealt}</b></span></div>
      <button id="retry-btn" class="big-btn">New Run</button>
    </div>`;
  }
  return '';
}

export function render(state, root) {
  const inDuel = state.player && state.foe && state.screen !== 'title';
  root.innerHTML = `
    ${inDuel ? hud(state) : ''}
    <main class="table">
      ${inDuel ? foeZone(state) + stageZone(state) + playerZone(state) : ''}
    </main>
    ${screens(state)}
    <div class="floaters" id="floaters"></div>`;
}

export function floater(root, side, text, cls) {
  const layer = root.querySelector('#floaters');
  if (!layer) return;
  const el = document.createElement('div');
  el.className = `floater ${cls} ${side}`;
  el.textContent = text;
  el.style.left = `${side === 'foe' ? 46 + Math.random() * 8 : 46 + Math.random() * 8}%`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1250);
}

export function shake(root, side) {
  const el = root.querySelector(side === 'foe' ? '#foe-portrait' : '#me-portrait');
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}
