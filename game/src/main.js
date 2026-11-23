// main.js — boots Runebound Duel, wires the mouse and keyboard to the engine,
// and choreographs the foe's turn so each of its cards lands one at a time.
// Screenshot hooks (?shot=title|duel|victory|defeat) set up real game states
// with a fixed seed so the maker's screenshots are honest renders of the game.

import { newRun, startDuel, playCard, endPlayerTurn, beginFoeTurn, endFoeTurn, checkEnd, mulberry32 } from './duel.js';
import { foePlayOne } from './ai.js';
import { render, floater, shake } from './render.js';
import { sfx } from './audio.js';

const root = document.getElementById('app');
const shot = new URLSearchParams(location.search).get('shot');
const seed = shot ? 20261123 : (Date.now() % 2147483647);
let state = newRun(mulberry32(seed));
let busy = false;

function showEvents(events) {
  if (!events) return;
  for (const ev of events) {
    if (ev.kind === 'damage' && ev.n > 0) { floater(root, ev.side, `-${ev.n}`, 'dmg'); shake(root, ev.side); sfx('hit'); }
    else if (ev.kind === 'block') { floater(root, ev.side, `+${ev.n} Block`, 'blk'); sfx('block'); }
    else if (ev.kind === 'heal' && ev.n > 0) { floater(root, ev.side, `+${ev.n} HP`, 'heal'); sfx('heal'); }
    else if (ev.kind === 'burn') { floater(root, ev.side, `Burn ${ev.n}`, 'brn'); sfx('burn'); }
    else if (ev.kind === 'draw') sfx('draw');
    else if (ev.kind === 'strength') floater(root, ev.side, 'Strength +1', 'str');
    else if (ev.kind === 'energy') floater(root, ev.side, '+1 Energy', 'str');
  }
}

function endSfx() {
  if (state.screen === 'victory') sfx('win');
  if (state.screen === 'defeat') sfx('lose');
}

function doPlay(index) {
  if (busy || state.phase !== 'player') return;
  const events = playCard(state, index);
  if (!events) return;
  sfx('play');
  render(state, root);
  showEvents(events);
  endSfx();
}

function doEndTurn() {
  if (busy || state.phase !== 'player' || state.screen !== 'duel') return;
  busy = true;
  endPlayerTurn(state);
  render(state, root);
  sfx('turn');
  beginFoeTurn(state);
  render(state, root);
  endSfx();
  const step = () => {
    if (state.screen !== 'duel') { busy = false; render(state, root); endSfx(); return; }
    const events = foePlayOne(state);
    if (!events) {
      endFoeTurn(state);
      busy = false;
      render(state, root);
      sfx('turn');
      endSfx();
      return;
    }
    sfx('play');
    render(state, root);
    showEvents(events);
    if (state.screen !== 'duel') { busy = false; endSfx(); return; }
    setTimeout(step, 700);
  };
  setTimeout(step, 650);
}

function startRun() {
  state = newRun(mulberry32(Date.now() % 2147483647));
  startDuel(state);
  render(state, root);
  sfx('draw');
}

root.addEventListener('click', (e) => {
  const slot = e.target.closest('[data-play]');
  if (slot) { doPlay(Number(slot.dataset.play)); return; }
  if (e.target.id === 'end-turn') doEndTurn();
  else if (e.target.id === 'start-btn') startRun();
  else if (e.target.id === 'next-btn') { state.level += 1; startDuel(state); render(state, root); sfx('draw'); }
  else if (e.target.id === 'retry-btn') startRun();
});

document.addEventListener('keydown', (e) => {
  if (state.screen === 'title' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startRun(); return; }
  if (state.screen !== 'duel') return;
  if (e.key >= '1' && e.key <= '7') doPlay(Number(e.key) - 1);
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); doEndTurn(); }
});

// --- screenshot setups: real states of the real engine, fixed seed ---------
function card(id, n) { return { uid: `${id}#shot${n}`, id }; }

function shotDuel() {
  startDuel(state);
  state.turn = 4;
  state.score = 148;
  state.damageDealt = 96;
  state.player.hp = 22;
  state.player.block = 5;
  state.player.strength = 1;
  state.player.energy = 2;
  state.player.hand = [card('inferno', 1), card('bulwark', 2), card('tidal-surge', 3), card('flame-strike', 4), card('hex-brand', 5)];
  state.player.discard = [card('flame-strike', 6), card('riposte', 7), card('mirror-guard', 8)];
  state.foe.hp = 15;
  state.foe.burn = 2;
  state.foe.hand = [card('flame-strike', 9), card('bulwark', 10), card('inferno', 11), card('hex-brand', 12)];
  state.lastPlay = { side: 'player', cardId: 'twin-fangs' };
  state.log = ['You play Twin Fangs.', 'Sella raises her guard — the Brand still bites for 2.'];
}

function shotVictory() {
  startDuel(state);
  state.turn = 6;
  state.score = 231;
  state.damageDealt = 158;
  state.player.hp = 17;
  state.foe.hp = 0;
  checkEnd(state);
}

function shotDefeat() {
  state.level = 1;
  startDuel(state);
  state.turn = 5;
  state.score = 187;
  state.damageDealt = 121;
  state.duelsWon = 1;
  state.player.hp = 0;
  state.foe.hp = 9;
  checkEnd(state);
}

if (shot === 'duel') shotDuel();
else if (shot === 'victory') shotVictory();
else if (shot === 'defeat') shotDefeat();

render(state, root);
