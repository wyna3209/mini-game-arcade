import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { difficulty, shufflePattern, pathProgress, swerveProgress, spinPosition, spinDestination, obstacleAt, dogRise, TOTAL_STAGES } from '../src/difficulty.js';

test('difficulty rises faster and stays bounded', () => {
  assert.equal(difficulty(1).duration, 800);
  assert.equal(TOTAL_STAGES, 5);
  assert.equal(difficulty(5).count, 20);
  assert.ok(difficulty(5).duration < 450);
  for (let round = 2; round <= TOTAL_STAGES; round++) {
    const now = difficulty(round), before = difficulty(round - 1);
    assert.ok(now.duration <= before.duration && now.duration >= 230);
    assert.ok(now.count >= before.count && now.count <= 23);
    assert.ok(now.gap >= 25);
  }
});

test('hell tuning is stronger in every stage without altering the standard rules', () => {
  for (let round = 1; round <= TOTAL_STAGES; round++) {
    const standard = difficulty(round);
    const hell = difficulty(round, true);
    assert.ok(hell.count > standard.count);
    assert.ok(hell.duration < standard.duration);
    assert.ok(hell.gap < standard.gap);
  }
  const standard = Array.from({ length: difficulty(1).count }, (_, step) => shufflePattern(1, step, difficulty(1).count, () => .99));
  const hell = Array.from({ length: difficulty(1, true).count }, (_, step) => shufflePattern(1, step, difficulty(1, true).count, () => .99, true));
  assert.ok(!standard.some(pattern => pattern.chain || pattern.obstacle || pattern.spin || pattern.twirl));
  for (const trick of ['feint', 'offbeat', 'chain', 'spin', 'twirl', 'relay']) assert.ok(hell.some(pattern => pattern[trick]), trick);
  assert.equal(hell.filter(pattern => pattern.obstacle).length, 5);
  for (const [round, trick] of [[2, 'decoy'], [3, 'rewind'], [4, 'swerve'], [5, 'relay']]) {
    const patterns = Array.from({ length: difficulty(round, true).count }, (_, step) => shufflePattern(round, step, difficulty(round, true).count, () => 0, true));
    assert.ok(patterns.some(pattern => pattern[trick]), `${round}: ${trick}`);
    assert.ok(patterns.every(pattern => !(pattern.feint && pattern.swerve)));
  }
});

test('swerve route reverses briefly before ending at the correct destination', () => {
  assert.equal(swerveProgress(0, 1000), 0);
  assert.equal(swerveProgress(400, 1000), .7);
  assert.ok(swerveProgress(620, 1000) < swerveProgress(400, 1000));
  assert.equal(swerveProgress(1000, 1000), 1);
});

test('hazards unlock cumulatively, and each is guaranteed in every eligible round', () => {
  const gates = { feint: 2, offbeat: 2, chain: 3, obstacle: 3, spin: 4, twirl: 5 };
  for (let round = 1; round <= TOTAL_STAGES; round++) {
    const { count, active } = difficulty(round);
    assert.equal(active.length, Object.values(gates).filter(gate => round >= gate).length);
    const patterns = Array.from({ length: count }, (_, step) => shufflePattern(round, step, count, () => 0.99));
    for (const [key, gate] of Object.entries(gates)) {
      assert.equal(patterns.some(pattern => pattern[key]), round >= gate, `${round}: ${key}`);
    }
  }
});

test('normal movement reaches destination while feints return to origin', () => {
  assert.equal(pathProgress(0, 500), 0);
  assert.equal(pathProgress(500, 500), 1);
  assert.ok(pathProgress(500, 500, true) < 1e-10);
  assert.equal(pathProgress(250, 500, true), 0.42);
});

test('every obstacle round includes bird, cloud and dog exactly once', () => {
  for (let round = 1; round <= TOTAL_STAGES; round++) {
    const { count } = difficulty(round);
    const types = Array.from({ length: count }, (_, step) => obstacleAt(round, step, count)).filter(Boolean);
    assert.deepEqual(types.sort(), round < 3 ? [] : ['bird', 'cloud', 'dog']);
  }
  assert.equal(dogRise(0), 0);
  assert.equal(dogRise(1), 0);
  assert.equal(dogRise(0.25), 1);
  assert.equal(dogRise(0.7), 1);
  for (let step = 0; step <= 100; step++) assert.ok(dogRise(step / 100) >= 0 && dogRise(step / 100) <= 1);
});

test('animal obstacles move across the stage and clean up before resolving', async () => {
  let source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  source = source.slice(0, source.indexOf('document.fonts.ready')) + '\nglobalThis.Scene = ShuffleScene;';
  const context = { Phaser: { Scene: class {}, Math: { Linear: (a, b, t) => a + (b - a) * t, Between: () => 1 } }, dogRise };
  vm.createContext(context); vm.runInContext(source, context);
  for (const kind of ['bird', 'dog']) for (const reverse of [false, true]) {
    const scene = new context.Scene();
    let container;
    const samples = [];
    const node = () => ({
      setDepth() { return this; }, setScale() { return this; }, setRotation() { return this; },
      add(children) { this.children = children; return this; },
      setPosition(x, y) { this.x = x; this.y = y; return this; },
      destroy() { this.destroyed = true; },
    });
    scene.add = {
      container(x, y) { container = Object.assign(node(), { x, y }); return container; },
    };
    // Fluent drawing methods do not affect movement or lifecycle checks.
    scene.add.graphics = () => { const graphic = new Proxy({}, { get: () => () => graphic }); return graphic; };
    scene.label = node;
    scene.tweens = { add(config) {
      for (let frame = 0; frame <= 100; frame++) {
        config.targets.t = frame / 100;
        config.onUpdate();
        samples.push({ x: container.x, y: container.y });
      }
      assert.ok(!container.destroyed);
      config.onComplete();
    } };
    await scene.spawnObstacle(kind, reverse);
    assert.equal(container.destroyed, true);
    if (kind === 'bird') {
      assert.equal(samples[0].x, reverse ? 1160 : -200);
      assert.equal(samples[100].x, reverse ? -200 : 1160);
      assert.ok(samples[0].y > samples[100].y);
      assert.ok(Math.abs(samples[50].x - 480) < 1e-8);
    } else {
      assert.equal(samples[0].y, 700);
      assert.equal(samples[50].y, 425);
      assert.equal(samples[100].y, 700);
    }
  }
});

test('spin paths stay on stage and land in unique slots in either direction', () => {
  for (const reverse of [false, true]) {
    const destinations = [0, 1, 2].map(slot => spinDestination(slot, reverse));
    assert.equal(new Set(destinations).size, 3);
    for (const slot of [0, 1, 2]) {
      assert.notEqual(destinations[slot], slot);
      assert.ok(Math.abs(spinPosition(slot, 0, reverse).x - [240, 480, 720][slot]) < 1e-8);
      assert.ok(Math.abs(spinPosition(slot, 1, reverse).x - [240, 480, 720][destinations[slot]]) < 1e-8);
      for (let step = 0; step <= 1000; step++) {
        const point = spinPosition(slot, step / 1000, reverse);
        assert.ok(point.x >= 200 && point.x <= 760);
        assert.ok(point.y >= 274 && point.y <= 410);
      }
    }
  }
});

test('scene rotation commits correct slots and restores depth after repeated spins', async () => {
  let source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  source = source.slice(0, source.indexOf('document.fonts.ready')) + '\nglobalThis.Scene = ShuffleScene;';
  const context = { Phaser: { Scene: class {}, Math: { Linear: (a, b, t) => a + (b - a) * t } }, spinPosition, spinDestination };
  vm.createContext(context); vm.runInContext(source, context);
  const scene = new context.Scene();
  scene.people = [0, 1, 2].map(slot => ({ slot, identity: slot,
    setDepth(depth) { this.depth = depth; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; } }));
  scene.tweens = { add(config) {
    for (let frame = 0; frame <= 100; frame++) {
      config.targets.t = frame / 100;
      config.onUpdate();
    }
    config.onComplete();
  } };
  for (const reverse of [false, false, true, true]) {
    const before = scene.people.map(person => person.slot);
    await scene.spinShuffle(reverse, 230);
    scene.people.forEach((person, i) => {
      assert.equal(person.slot, spinDestination(before[i], reverse));
      assert.equal(person.x, [240, 480, 720][person.slot]);
      assert.equal(person.y, 315);
      assert.equal(person.depth, 0);
      assert.equal(person.identity, i);
    });
  }
});

test('three-way relay moves every identity once and lands in three distinct slots', async () => {
  let source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  source = source.slice(0, source.indexOf('document.fonts.ready')) + '\nglobalThis.Scene = ShuffleScene;';
  const context = { Phaser: { Scene: class {}, Math: { Linear: (a, b, t) => a + (b - a) * t } }, spinDestination };
  vm.createContext(context); vm.runInContext(source, context);
  const scene = new context.Scene();
  scene.people = [0, 1, 2].map(slot => ({ identity: slot, slot,
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setDepth(depth) { this.depth = depth; return this; } }));
  scene.tweens = { add(config) {
    for (let frame = 0; frame <= 20; frame++) { config.targets.t = frame / 20; config.onUpdate(); }
    config.onComplete();
  } };
  for (const reverse of [false, true]) {
    const before = scene.people.map(person => person.slot);
    await scene.relayMove(reverse, 200);
    scene.people.forEach((person, index) => {
      assert.equal(person.identity, index);
      assert.equal(person.slot, spinDestination(before[index], reverse));
      assert.equal(person.x, [240, 480, 720][person.slot]);
      assert.equal(person.y, 315);
      assert.equal(person.depth, 0);
    });
  }
});

test('rewind performs two visible swaps that restore the original slots', async () => {
  let source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  source = source.slice(0, source.indexOf('document.fonts.ready')) + '\nglobalThis.Scene = ShuffleScene;';
  const context = { Phaser: { Scene: class {} } };
  vm.createContext(context); vm.runInContext(source, context);
  const scene = new context.Scene();
  const a = { slot: 0 }, b = { slot: 1 }, third = { slot: 2 };
  scene.people = [a, b, third];
  const calls = [];
  scene.swap = async (first, second, pattern) => {
    calls.push(pattern.reverse);
    [first.slot, second.slot] = [second.slot, first.slot];
  };
  await scene.shuffleMove(a, b, { rewind: true, reverse: false }, 180);
  assert.deepEqual(calls, [false, true]);
  assert.deepEqual([a.slot, b.slot, third.slot], [0, 1, 2]);
});

test('swerve swaps real characters after reversing their visible path', async () => {
  let source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  source = source.slice(0, source.indexOf('document.fonts.ready')) + '\nglobalThis.Scene = ShuffleScene;';
  const context = { Phaser: { Scene: class {}, Math: { Linear: (a, b, t) => a + (b - a) * t } }, pathProgress, swerveProgress, difficulty };
  vm.createContext(context); vm.runInContext(source, context);
  const scene = new context.Scene();
  const person = (slot, x) => ({ slot, x, y: 315,
    setPosition(nx, ny) { this.x = nx; this.y = ny; return this; },
    setDepth() { return this; }, setRotation() { return this; } });
  const a = person(0, 240), b = person(1, 480);
  const positions = [];
  scene.tweens = { add(config) {
    for (const fraction of [0, .4, .62, 1]) {
      config.targets.elapsed = config.duration * fraction;
      config.onUpdate();
      positions.push(a.x);
    }
    config.onComplete();
  } };
  await scene.swap(a, b, { swerve: true }, 1000);
  assert.ok(positions[1] > positions[2]);
  assert.equal(a.slot, 1); assert.equal(b.slot, 0);
  assert.equal(a.x, 480); assert.equal(b.x, 240);
});

test('decoy leaves no extra selectable character after its animation', async () => {
  let source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  source = source.slice(0, source.indexOf('document.fonts.ready')) + '\nglobalThis.Scene = ShuffleScene;';
  const context = { Phaser: { Scene: class {} } };
  vm.createContext(context); vm.runInContext(source, context);
  const scene = new context.Scene();
  const [a, b, third] = scene.people = [{ x: 240, y: 315 }, { x: 480, y: 315 }, { x: 720, y: 315 }];
  let ghost;
  const graphics = { fillStyle() { return this; }, fillRoundedRect() { return this; }, fillCircle() { return this; }, lineStyle() { return this; }, strokeRoundedRect() { return this; } };
  scene.add = { container(x, y) { ghost = { x, y, setDepth() { return this; }, add() { return this; }, setAlpha() { return this; }, destroy() { this.destroyed = true; } }; return ghost; }, graphics: () => graphics };
  scene.tweens = { add(config) { assert.equal(config.x, third.x); config.onComplete(); } };
  await scene.spawnDecoy(a, b, 200);
  assert.equal(ghost.destroyed, true);
  assert.equal(scene.people.length, 3);
});

test('actual scene swaps preserve character identity and slot mapping for all hazard combinations', async () => {
  let source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  source = source.slice(0, source.indexOf('document.fonts.ready')) + '\nglobalThis.Scene = ShuffleScene;';
  const context = { Phaser: { Scene: class {}, Math: { Linear: (a, b, t) => a + (b - a) * t } }, difficulty, pathProgress };
  vm.createContext(context);
  vm.runInContext(source, context);
  const scene = new context.Scene();
  const person = slot => ({ slot, identity: slot, x: [240, 480, 720][slot], y: 315,
    setDepth() { return this; }, setRotation(angle) { this.rotation = angle; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; } });
  const a = person(0), b = person(1), idle = person(2);
  let maxRotation = 0;
  scene.tweens = { add(config) {
    for (let frame = 0; frame <= 1000; frame++) {
      config.targets.elapsed = config.elapsed * frame / 1000;
      config.onUpdate();
      // Both characters follow the same progress, mirrored around their midpoint.
      assert.ok(Math.abs(a.x + b.x - 720) < 1e-8);
      assert.ok(Math.abs(a.y + b.y - 630) < 1e-8);
      assert.ok(Math.abs(a.y - 315) <= 44);
      assert.equal(idle.x, 720);
      maxRotation = Math.max(maxRotation, Math.abs(a.rotation || 0));
      assert.ok(Math.abs((a.rotation || 0) + (b.rotation || 0)) < 1e-8);
    }
    config.onComplete();
  } };
  for (let bits = 0; bits < 32; bits++) {
    maxRotation = 0;
    const pattern = { feint: !!(bits & 1), offbeat: !!(bits & 2), chain: !!(bits & 4), reverse: !!(bits & 8), twirl: !!(bits & 16) };
    const beforeA = a.slot, beforeB = b.slot;
    await scene.swap(a, b, pattern, 300);
    assert.equal(a.slot, pattern.feint ? beforeA : beforeB);
    assert.equal(b.slot, pattern.feint ? beforeB : beforeA);
    assert.equal(a.x, [240, 480, 720][a.slot]);
    assert.equal(b.x, [240, 480, 720][b.slot]);
    assert.equal(a.y, 315); assert.equal(b.y, 315);
    assert.equal(a.identity, 0); assert.equal(b.identity, 1);
    assert.ok(Math.abs(maxRotation - (pattern.twirl ? Math.PI * 2 : 0)) < 1e-8);
    assert.equal(a.rotation, 0); assert.equal(b.rotation, 0);
  }
});

test('chain waits for first swap, then immediately uses the third character at the same speed', async () => {
  let source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  source = source.slice(0, source.indexOf('document.fonts.ready')) + '\nglobalThis.Scene = ShuffleScene;';
  const context = { Phaser: { Scene: class {} } };
  vm.createContext(context); vm.runInContext(source, context);
  for (const reverse of [false, true]) {
    const scene = new context.Scene();
    const [a, b, third] = scene.people = [{}, {}, {}];
    const calls = [];
    let finishFirst;
    scene.swap = (first, second, pattern, duration) => {
      calls.push({ first, second, pattern, duration });
      if (calls.length === 1) return new Promise(resolve => { finishFirst = resolve; });
      return Promise.resolve();
    };
    scene.delay = () => assert.fail('chain must not pause between swaps');
    const pending = scene.shuffleMove(a, b, { chain: true, reverse }, 300);
    assert.equal(calls.length, 1);
    finishFirst(); await pending;
    assert.equal(calls.length, 2);
    assert.equal(calls[1].first, reverse ? b : a);
    assert.equal(calls[1].second, third);
    assert.equal(calls[1].pattern.feint, false);
    assert.equal(calls[1].duration, 300);
    calls.length = 0;
    const single = scene.shuffleMove(a, b, { chain: false }, 300);
    finishFirst(); await single;
    assert.equal(calls.length, 1);
  }
});
