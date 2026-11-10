import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { DAY_ORDER_COUNT, customers, services, wrap, formatTime, handAngles, adjustTime, moveHandToAngle, matches, matchesWithin, signedAngleDelta, initialTime, newOrder, repairReward, readDigitalTime } from '../src/time.js';
import { setPortrait } from '../src/pokemon.js';
import { clockThemes, paintClockFace, colorHex } from '../src/clock-themes.js';

function shop() {
  let source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  source = source.slice(0, source.indexOf('document.fonts.ready')) + '\nglobalThis.Shop = ClockShop;';
  const elements = new Map();
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const element = id => {
    assert.ok(ids.has(id), `Missing DOM element: ${id}`);
    if (!elements.has(id)) elements.set(id, { style: {}, dataset: {}, classList: { toggle() {} }, blur() {}, focus() {},
      open: false, showModal() { this.open = true; }, close() { this.open = false; } });
    return elements.get(id);
  };
  const context = { Phaser: { Scene: class {} }, fontLicenseUrl: 'font-license', DAY_ORDER_COUNT, customers, services, wrap, formatTime, handAngles, adjustTime, moveHandToAngle, matches, matchesWithin, signedAngleDelta, initialTime, setPortrait, repairReward, readDigitalTime, clockThemes, paintClockFace, colorHex,
    newOrder: order => newOrder(order, () => 0.25),
    newTarget: () => ({ hour: 3, minute: 15, second: 30 }), document: { getElementById: element } };
  vm.createContext(context); vm.runInContext(source, context);
  const scene = new context.Shop();
  Object.assign(scene, { order: 0, lives: 3, score: 0, combo: 0, bestCombo: 0, totalTips: 0, phase: 'ready', handObjects: {}, handGrips: {},
    time: { now: 1000 }, cameras: { main: { shake() {} } }, scene: { restart(data) { scene.restarted = true; scene.restartData = data; } } });
  scene.prepareOrder(false);
  return { scene, element };
}

function answerCorrect(scene, element) {
  if (scene.isReading()) {
    element('answer-hour').value = String(scene.target.hour || 12);
    element('answer-minute').value = String(scene.target.minute);
  } else scene.current = { ...scene.target };
}

test('day and night orders show requests, itemized payment, and a final summary', () => {
  const { scene, element } = shop();
  scene.act();
  for (let order = 0; order < customers.length; order++) {
    assert.equal(scene.phase, 'playing');
    assert.equal(scene.order, order);
    assert.equal(element('customer-name').textContent, customers[order].name);
    assert.match(element('customer-sprite').src, new RegExp(`/${customers[order].id}\\.png$`));
    assert.equal(element('shop-team').dataset.mood, 'working');
    answerCorrect(scene, element);
    scene.act();
    assert.equal(scene.phase, order === customers.length - 1 ? 'won' : 'success');
    assert.equal(element('shop-team').dataset.mood, scene.phase);
    assert.match(element('message').textContent, new RegExp(customers[order].thanks.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(element('order-modal').open, true);
    assert.equal(element('modal-money').hidden, false);
    assert.equal(element('modal-message').textContent, customers[order].thanks);
    assert.match(element('modal-total').textContent, /^\+[\d,]+원$/);
    const paid = scene.score;
    scene.submit();
    assert.equal(scene.score, paid, 'completion cannot pay twice');
    if (order < customers.length - 1) {
      scene.act();
      if (order === DAY_ORDER_COUNT - 1) {
        assert.equal(scene.phase, 'dusk');
        assert.equal(element('game-stage').dataset.shift, 'night');
        scene.act();
      }
      assert.equal(scene.phase, 'briefing');
      assert.equal(element('modal-money').hidden, true);
      assert.equal(element('modal-time-block').hidden, false);
      scene.act();
    }
  }
  assert.equal(scene.lives, 3);
  assert.equal(scene.combo, 15);
  assert.equal(scene.bestCombo, 15);
  assert.ok(scene.totalTips > 0);
  assert.ok(scene.score > 1500);
  assert.equal(element('modal-summary').hidden, false);
  assert.match(element('modal-summary').textContent, /주문 15건/);
  assert.equal(element('game-stage').dataset.shift, 'dawn');
  scene.act(); assert.equal(scene.restarted, true);
});

test('developer shortcut starts at the first night order with fresh lives and the night scene', () => {
  const { scene, element } = shop();
  scene.lives = 1; scene.score = 950;
  scene.jumpToNight();
  assert.equal(scene.restartData.startOrder, DAY_ORDER_COUNT);
  assert.equal(element('order-modal').open, false);
  scene.drawClock = () => {}; scene.bindControls = () => {};
  scene.create(scene.restartData);
  assert.equal(scene.order, DAY_ORDER_COUNT);
  assert.equal(scene.lives, 3);
  assert.equal(scene.score, 0);
  assert.equal(scene.phase, 'briefing');
  assert.equal(element('game-stage').dataset.shift, 'night');
  assert.equal(element('customer-name').textContent, customers[DAY_ORDER_COUNT].name);
  assert.equal(element('order-modal').open, true);
  assert.equal(element('target').textContent, '?? : ?? : ??');
});

test('wrong answers cost time and three timeouts end the run without replenishing chances', () => {
  const { scene, element } = shop();
  scene.act();
  const deadline = scene.deadline;
  answerCorrect(scene, element);
  element('answer-minute').value = String(wrap(scene.target.minute + 1, 60));
  scene.act();
  assert.equal(scene.deadline, deadline - 3000);
  assert.equal(scene.lives, 3);
  scene.time.now = scene.deadline;
  scene.update();
  assert.equal(scene.lives, 2); assert.equal(scene.phase, 'retry');
  const previousTarget = scene.target;
  scene.act(); assert.equal(scene.target, previousTarget);
  scene.act();
  answerCorrect(scene, element);
  scene.act(); scene.act(); scene.act();
  assert.equal(scene.order, 1); assert.equal(scene.lives, 2);
  for (let remaining = 1; remaining >= 0; remaining--) {
    scene.time.now = scene.deadline;
    scene.update();
    assert.equal(scene.lives, remaining);
    if (remaining) { scene.act(); scene.act(); }
  }
  assert.equal(scene.phase, 'over');
  scene.update(); assert.equal(scene.lives, 0);
});

test('a matching answer submitted after the deadline still times out', () => {
  const { scene, element } = shop();
  scene.act(); answerCorrect(scene, element);
  scene.time.now = scene.deadline + 1;
  scene.act();
  assert.equal(scene.phase, 'retry');
  assert.equal(scene.score, 0);
});

test('keyboard adjustments carry time and cannot change a completed order', () => {
  const { scene, element } = shop();
  scene.order = 1;
  scene.prepareOrder(false);
  scene.act();
  scene.current = { hour: 11, minute: 59, second: 59 };
  scene.selected = 'second';
  scene.nudge(1);
  assert.equal(formatTime(scene.current), '12 : 00 : 00');
  scene.nudge(-1);
  assert.equal(formatTime(scene.current), '11 : 59 : 59');
  scene.selected = 'minute';
  scene.nudge(5);
  assert.equal(formatTime(scene.current), '12 : 04 : 59');
  scene.phase = 'success';
  scene.nudge(1);
  assert.equal(formatTime(scene.current), '12 : 04 : 59');
});

test('offset orders display a reference but require the calculated target', () => {
  const { scene, element } = shop();
  for (const order of [1, 4, 6, 9]) {
    scene.order = order;
    scene.prepareOrder(false);
    scene.act();
    assert.equal(element('target').textContent, formatTime(scene.request.reference));
    assert.notEqual(formatTime(scene.target), formatTime(scene.request.reference));
    assert.match(element('order-label').textContent, /기준/);
    scene.current = { ...scene.request.reference };
    scene.submit();
    assert.equal(scene.phase, 'playing');
    answerCorrect(scene, element);
    scene.submit();
    assert.equal(scene.phase, order === customers.length - 1 ? 'won' : 'success');
  }
});

test('mistakes break the combo and retries retain the request without restoring first-try bonuses', () => {
  const { scene, element } = shop();
  scene.act(); answerCorrect(scene, element); scene.act();
  assert.equal(scene.combo, 1);
  assert.equal(element('modal-money').hidden, false);
  scene.act();
  assert.equal(element('modal-money').hidden, true);
  scene.act();
  scene.current = { ...scene.target, second: wrap(scene.target.second + 1, 60) };
  scene.submit();
  assert.equal(scene.combo, 0);
  assert.equal(scene.cleanOrder, false);
  const request = scene.request;
  scene.time.now = scene.deadline;
  scene.update(); scene.act(); scene.act();
  assert.equal(scene.request, request);
  assert.equal(scene.cleanOrder, false);
  const tips = scene.totalTips;
  answerCorrect(scene, element); scene.submit();
  assert.equal(scene.totalTips, tips);
  assert.equal(scene.combo, 0);
  scene.act(); scene.act(); answerCorrect(scene, element); scene.submit();
  assert.equal(scene.combo, 1);
});

test('reading requests and results never consumes time or permits editing the clock', () => {
  const { scene, element } = shop();
  assert.equal(scene.phase, 'briefing');
  assert.equal(element('order-modal').open, true);
  assert.equal(element('modal-message').textContent, services[0].request);
  const before = { ...scene.current };
  scene.selected = 'minute';
  scene.nudge(1);
  assert.equal(formatTime(scene.current), formatTime(before));
  scene.time.now += 120000;
  scene.update(); scene.submit();
  assert.equal(scene.lives, 3);
  assert.equal(scene.score, 0);
  scene.act();
  assert.equal(element('order-modal').open, false);
  assert.equal(scene.deadline - scene.time.now, customers[0].limit * 1000);
  answerCorrect(scene, element);
  scene.time.now += 1000;
  scene.act();
  assert.equal(scene.combo, 1);
  assert.match(element('modal-tip').textContent, /특별 팁/);
  const score = scene.score;
  scene.time.now += 120000;
  scene.update();
  assert.equal(scene.lives, 3);
  assert.equal(scene.score, score);
  scene.act();
  assert.equal(scene.phase, 'briefing');
  scene.time.now += 120000;
  scene.update(); scene.act();
  assert.equal(scene.deadline - scene.time.now, customers[1].limit * 1000);
});

test('the first order is a fixed analog clock with blank digital fields and no revealed answer', () => {
  const { scene, element } = shop();
  assert.equal(scene.isReading(), true);
  assert.equal(element('target').hidden, true);
  assert.equal(element('target').textContent, '');
  assert.equal(element('modal-time').textContent, '시 + 분');
  assert.equal(element('answer-hour').value, '');
  assert.equal(element('answer-minute').value, '');
  assert.equal(element('answer-hour').disabled, true);
  scene.act();
  assert.equal(element('answer-hour').disabled, false);
  const clock = formatTime(scene.current);
  scene.selected = 'hour'; scene.nudge(1); scene.dragHand('minute', 180);
  assert.equal(formatTime(scene.current), clock);
  const deadline = scene.deadline;
  scene.submit();
  assert.equal(scene.phase, 'playing', 'blank fields cannot submit the already-correct analog hands');
  assert.equal(scene.deadline, deadline, 'malformed input does not cost three seconds');
  answerCorrect(scene, element);
  element('answer-minute').value = String(wrap(scene.target.minute + 1, 60));
  scene.submit();
  assert.equal(scene.deadline, deadline - 3000);
  assert.equal(formatTime(scene.current), clock);
  answerCorrect(scene, element); scene.submit();
  assert.equal(scene.phase, 'success');
  assert.equal(element('answer-hour').disabled, true);
  scene.act();
  assert.equal(scene.isReading(), false);
  assert.equal(element('digital-entry').hidden, true);
  assert.equal(element('target').hidden, false);
  assert.equal(element('modal-time').textContent, formatTime(scene.request.reference));
});

test('digital arrows wrap, twelve is accepted, and retry keeps the same clock but clears the input', () => {
  const { scene, element } = shop();
  scene.target = { hour: 0, minute: 0, second: 0 };
  scene.prepareOrder(true);
  scene.act();
  scene.changeAnswer('hour', -1); scene.changeAnswer('minute', 1);
  assert.equal(element('answer-hour').value, '12');
  assert.equal(element('answer-minute').value, '00');
  scene.changeAnswer('hour', 1); scene.changeAnswer('minute', -1);
  assert.equal(element('answer-hour').value, '01');
  assert.equal(element('answer-minute').value, '59');
  const clock = formatTime(scene.current);
  scene.time.now = scene.deadline;
  scene.update(); scene.act();
  assert.equal(formatTime(scene.current), clock);
  assert.equal(element('answer-hour').value, '');
  assert.equal(element('answer-minute').value, '');
  scene.act();
  answerCorrect(scene, element); scene.submit();
  assert.equal(scene.phase, 'success');
  assert.equal(scene.combo, 0);
});

test('customer changes repaint one clock face without changing the time or hand objects', () => {
  const { scene } = shop();
  let clears = 0;
  const graphics = { clear() { clears++; return this; } };
  for (const method of ['fillStyle', 'lineStyle', 'fillEllipse', 'fillCircle', 'fillRoundedRect', 'strokeRoundedRect', 'strokeCircle', 'fillPoints', 'fillTriangle', 'lineBetween', 'beginPath', 'moveTo', 'lineTo', 'strokePath']) {
    graphics[method] = function (...args) {
      for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value));
      return this;
    };
  }
  const label = () => ({ setColor(color) { this.color = color; return this; }, setText(text) { this.text = text; return this; } });
  scene.clockFace = graphics;
  scene.clockNumerals = Array.from({ length: 12 }, label);
  scene.clockSignature = label(); scene.clockThemeLabel = label();
  const hands = scene.handObjects, time = formatTime(scene.current);
  const names = new Set();
  for (const customer of customers) {
    scene.applyClockTheme(customer.id);
    names.add(scene.clockThemeLabel.text);
    assert.equal(scene.clockThemeId, customer.id);
    assert.equal(scene.handObjects, hands);
    assert.equal(formatTime(scene.current), time);
  }
  assert.equal(names.size, 15);
  assert.equal(clears, 15);
  scene.applyClockTheme(customers.at(-1).id);
  assert.equal(clears, 15, 'retrying the same order does not rebuild the face');
});

test('memory order reveals its time only during the first ten seconds and resets on retry', () => {
  const { scene, element } = shop();
  scene.order = 10; scene.prepareOrder(false);
  assert.equal(element('target').textContent, '?? : ?? : ??');
  assert.equal(element('modal-time').textContent, '시작 후 10초 공개');
  scene.act();
  assert.equal(element('target').textContent, formatTime(scene.request.reference));
  scene.time.now = scene.startedAt + 9999; scene.update();
  assert.equal(element('target').textContent, formatTime(scene.request.reference));
  scene.time.now = scene.startedAt + 10000; scene.update();
  assert.equal(element('target').textContent, '?? : ?? : ??');
  scene.time.now = scene.deadline; scene.update(); scene.act(); scene.act();
  assert.equal(element('target').textContent, formatTime(scene.request.reference));
});

test('reverse controls invert both nudges and continuous pointer movement', () => {
  const { scene } = shop();
  scene.order = 11; scene.prepareOrder(false); scene.act();
  scene.current = { hour: 3, minute: 20, second: 10 };
  scene.selected = 'minute'; scene.nudge(1);
  assert.equal(scene.current.minute, 19);
  scene.dragState = { hand: 'minute', angle: 120, remainder: 0 };
  scene.dragHand('minute', 132);
  assert.equal(scene.current.minute, 17);
  scene.dragHand('minute', 126);
  assert.equal(scene.current.minute, 18);
});

test('running clock advances over missed frames and accepts one second of error', () => {
  const { scene } = shop();
  scene.order = 12; scene.prepareOrder(false); scene.act();
  scene.current = { hour: 11, minute: 59, second: 58 };
  scene.time.now = scene.startedAt + 2000;
  scene.update();
  assert.equal(formatTime(scene.current), '12 : 00 : 00');
  scene.current = adjustTime(scene.target, 'second', -1);
  scene.submit();
  assert.equal(scene.phase, 'success');
});

test('tied hands lock hour and second while a minute revolution carries the hour', () => {
  const { scene } = shop();
  scene.order = 13; scene.prepareOrder(false); scene.act();
  assert.equal(scene.selected, 'minute');
  const before = formatTime(scene.current);
  scene.select('hour');
  assert.equal(scene.selected, 'minute');
  scene.selected = 'hour'; scene.nudge(1); scene.dragHand('second', 180);
  assert.equal(formatTime(scene.current), before);
  scene.selected = 'minute';
  scene.nudge(60);
  assert.equal(scene.current.hour, wrap(scene.target.hour + 0, 12));
});

test('tablet controls expose only usable hands and follow reverse-clock rules', () => {
  const { scene, element } = shop();
  assert.equal(element('touch-controls').hidden, true);
  scene.order = 11; scene.prepareOrder(false); scene.act();
  assert.equal(element('touch-controls').hidden, false);
  scene.select('minute');
  assert.equal(element('touch-minute').dataset.selected, 'true');
  const minute = scene.current.minute;
  scene.nudge(1);
  assert.equal(scene.current.minute, wrap(minute - 1, 60));
  scene.order = 13; scene.prepareOrder(false);
  assert.equal(element('touch-hour').disabled, true);
  assert.equal(element('touch-minute').disabled, false);
  assert.equal(element('touch-second').disabled, true);
});
