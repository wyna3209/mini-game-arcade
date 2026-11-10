import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { TOTAL_STAGES } from '../src/difficulty.js';

function game() {
  let source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  source = source.slice(0, source.indexOf('document.fonts.ready')) + '\nglobalThis.Scene = ShuffleScene;';
  const context = { Phaser: { Scene: class {} }, TOTAL_STAGES, localStorage: { setItem() {} } };
  vm.createContext(context); vm.runInContext(source, context);
  const scene = new context.Scene();
  const node = () => ({ setScale() { return this; }, setVisible() { return this; },
    setText(text) { this.text = text; return this; }, setColor() { return this; } });
  Object.assign(scene, { round: 1, lives: 3, score: 0, best: 0, nextStage: false, phase: 'guess', target: 0,
    people: [0, 1, 2].map(slot => Object.assign(node(), { slot, cake: node(), tag: node() })),
    button: node(), buttonText: node(), tweens: { add() {} }, cameras: { main: { shake() {} } },
    updateHud() {}, announce(title, hint) { this.message = `${title} ${hint}`; },
    startRound() { this.phase = 'guess'; },
    showVictory() { this.victoryShown = true; },
    scene: { restart(data) { scene.restarted = data; } },
  });
  return scene;
}

test('five correct answers win once without starting stage six', () => {
  const scene = game();
  for (let stage = 1; stage <= 5; stage++) {
    assert.equal(scene.round, stage);
    scene.choose(0);
    const score = scene.score;
    scene.choose(0); // Duplicate clicks cannot award points or advance twice.
    assert.equal(scene.score, score);
    if (stage < 5) scene.advance();
  }
  assert.equal(scene.phase, 'won');
  assert.equal(scene.round, 5);
  assert.equal(scene.score, 1500);
  assert.equal(scene.lives, 3);
  assert.equal(scene.victoryShown, true);
  scene.advance();
  assert.equal(scene.restarted.round, 1);
  assert.equal(scene.restarted.autoStart, true);
});

test('three retries are shared across stages, and a fourth failure ends the run', () => {
  const scene = game();
  for (let failure = 1; failure <= 3; failure++) {
    scene.choose(1);
    assert.equal(scene.phase, 'result');
    assert.equal(scene.lives, 3 - failure);
    const stage = scene.round;
    scene.advance();
    assert.equal(scene.round, stage);
    scene.choose(0);
    scene.advance();
    assert.equal(scene.lives, 3 - failure);
  }
  assert.equal(scene.round, 4);
  scene.choose(1);
  assert.equal(scene.phase, 'over');
  assert.equal(scene.lives, 0);
  assert.ok(!scene.victoryShown);
  scene.advance();
  assert.equal(scene.restarted.round, 1);
});

test('the final allowed retry can still finish all five stages with zero retries remaining', () => {
  const scene = game();
  for (let failure = 0; failure < 3; failure++) { scene.choose(1); scene.advance(); }
  assert.equal(scene.lives, 0);
  for (let stage = 1; stage <= 5; stage++) {
    scene.choose(0);
    if (stage < 5) scene.advance();
  }
  assert.equal(scene.phase, 'won');
  assert.equal(scene.victoryShown, true);
  assert.equal(scene.lives, 0);
});
