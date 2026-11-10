import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrap, formatTime, handAngles, valueFromAngle, adjustTime, moveHandToAngle, matches, newTarget, newOrder, repairReward, customers, readDigitalTime } from '../src/time.js';

test('all clock hand angles convert back to the original time, including near midnight', () => {
  for (let hour = 0; hour < 12; hour++) for (let minute = 0; minute < 60; minute++) for (const second of [0, 1, 29, 59]) {
    const time = { hour, minute, second };
    const angles = handAngles(time);
    for (const hand of ['hour', 'minute', 'second']) {
      assert.equal(valueFromAngle(hand, wrap(angles[hand], 360), time), time[hand]);
    }
  }
});

test('clock labels and wraparound handle 12 oclock and both rotation directions', () => {
  assert.equal(formatTime({ hour: 0, minute: 0, second: 0 }), '12 : 00 : 00');
  assert.equal(formatTime({ hour: 3, minute: 7, second: 9 }), '03 : 07 : 09');
  assert.equal(wrap(-1, 60), 59);
  assert.equal(wrap(60, 60), 0);
  assert.equal(wrap(-1, 12), 11);
  assert.ok(matches({ hour: 1, minute: 2, second: 3 }, { hour: 1, minute: 2, second: 3 }));
  assert.ok(!matches({ hour: 1, minute: 2, second: 3 }, { hour: 1, minute: 2, second: 4 }));
});

test('fifteen distinct customer orders preserve day precision and night rules', () => {
  assert.equal(customers.length, 15);
  for (let order = 0; order < customers.length; order++) {
    assert.ok(customers[order].limit >= 22 && customers[order].limit <= 40);
    if (order >= 5 && order < 10) assert.equal(customers[order].limit, customers[order - 5].limit);
    for (let step = 0; step < 100; step++) {
      const time = newOrder(order, () => step / 100).target;
      assert.ok(time.hour >= 0 && time.hour < 12);
      assert.ok(time.minute >= 0 && time.minute < 60);
      assert.ok(time.second >= 0 && time.second < 60);
      if (order < 10 && order % 5 === 0) assert.equal(time.minute % 5, 0);
      if (order < 10 && order % 5 < 2) assert.equal(time.second, 0);
      if (order < 10 && order % 5 === 2) assert.equal(time.second % 5, 0);
      if (order === 13) { assert.equal(time.second, 0); assert.ok(time.minute <= 20); }
    }
  }
});

test('adjustments carry and borrow minutes and hours, including across midnight', () => {
  assert.deepEqual(adjustTime({ hour: 11, minute: 59, second: 59 }, 'second', 1), { hour: 0, minute: 0, second: 0 });
  assert.deepEqual(adjustTime({ hour: 0, minute: 0, second: 0 }, 'second', -1), { hour: 11, minute: 59, second: 59 });
  assert.deepEqual(adjustTime({ hour: 3, minute: 58, second: 27 }, 'minute', 5), { hour: 4, minute: 3, second: 27 });
  assert.deepEqual(adjustTime({ hour: 4, minute: 3, second: 27 }, 'minute', -5), { hour: 3, minute: 58, second: 27 });
});

test('dragging several complete turns advances the clock and reversing restores it', () => {
  const start = { hour: 11, minute: 59, second: 57 };
  for (const hand of ['second', 'minute', 'hour']) {
    let time = { ...start };
    const steps = hand === 'hour' ? 12 : 60;
    const degrees = 360 / steps;
    for (let i = 0; i < steps * 2; i++) {
      time = moveHandToAngle(time, hand, wrap(handAngles(time)[hand] + degrees, 360));
    }
    assert.deepEqual(time, adjustTime(start, hand, steps * 2));
    for (let i = 0; i < steps * 2; i++) {
      time = moveHandToAngle(time, hand, wrap(handAngles(time)[hand] - degrees, 360));
    }
    assert.deepEqual(time, start);
  }
});

test('small pointer movements and reversals near twelve do not add extra turns', () => {
  let time = { hour: 3, minute: 59, second: 59 };
  time = moveHandToAngle(time, 'second', 359);
  assert.deepEqual(time, { hour: 4, minute: 0, second: 0 });
  time = moveHandToAngle(time, 'second', 1);
  assert.deepEqual(time, { hour: 4, minute: 0, second: 0 });
  time = moveHandToAngle(time, 'second', 354);
  assert.deepEqual(time, { hour: 3, minute: 59, second: 59 });
});

test('special requests calculate offsets across twelve and preserve seconds', () => {
  const eevee = newOrder(1, () => 0.999);
  assert.deepEqual(eevee.reference, { hour: 11, minute: 59, second: 0 });
  assert.deepEqual(eevee.target, { hour: 0, minute: 9, second: 0 });
  const celebi = newOrder(4, () => 0);
  assert.deepEqual(celebi.target, { hour: 11, minute: 40, second: 0 });
  assert.equal(newOrder(4, () => 0.5).target.second, 30);
  assert.equal(customers[2].limit, 40);
});

test('tips reward clean combos, fast repairs, and customer-specific conditions', () => {
  const express = repairReward(0, 23000, 12000, true, 2);
  assert.deepEqual(express, { combo: 3, perfect: true, special: 150, tip: 400, total: 730 });
  assert.equal(repairReward(0, 22999, 12001, true, 2).special, 0);
  assert.equal(repairReward(3, 1000, 24000, true, 0).special, 150);
  assert.equal(repairReward(5, 23000, 12000, true, 2).special, 150);
  assert.equal(repairReward(8, 1000, 24000, true, 0).special, 150);
  assert.equal(repairReward(2, 20000, 20000, true, 0).perfect, true);
  assert.equal(repairReward(2, 19999, 20001, true, 0).perfect, false);
  const corrected = repairReward(3, 20000, 1000, false, 0);
  assert.equal(corrected.combo, 0);
  assert.equal(corrected.tip, 0);
  assert.equal(corrected.total, 600);
});

test('digital answers use a twelve-hour clock and reject empty or out-of-range values', () => {
  assert.deepEqual(readDigitalTime('12', '00'), { hour: 0, minute: 0, second: 0 });
  assert.deepEqual(readDigitalTime('03', '59'), { hour: 3, minute: 59, second: 0 });
  for (const [hour, minute] of [['', '0'], ['1', ''], ['0', '10'], ['13', '10'], ['1', '60'], ['-1', '2'], ['1.5', '20'], ['1e1', '0']]) {
    assert.equal(readDigitalTime(hour, minute), null);
  }
});
