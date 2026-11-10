import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_ORDER_COUNT, NIGHT_ORDER_COUNT, TOTAL_ORDER_COUNT, createOrderSequence, wrap, formatTime, handAngles, valueFromAngle, adjustTime, moveHandToAngle, matches, matchesWithin, newOrder, repairReward, customers, readDigitalTime } from '../src/time.js';

test('night deck reshuffles five types twice without adjacent duplicates', () => {
  assert.equal(NIGHT_ORDER_COUNT, 10);
  assert.equal(TOTAL_ORDER_COUNT, 20);
  const layouts = new Set();
  for (let seed = 1; seed <= 24; seed++) {
    let state = seed;
    const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
    const sequence = createOrderSequence(random);
    assert.deepEqual(sequence.slice(0, DAY_ORDER_COUNT), Array.from({ length: DAY_ORDER_COUNT }, (_, index) => index));
    assert.equal(sequence.length, TOTAL_ORDER_COUNT);
    const night = sequence.slice(DAY_ORDER_COUNT);
    for (let type = DAY_ORDER_COUNT; type < customers.length; type++) assert.equal(night.filter(value => value === type).length, 2);
    assert.ok(night.every((type, index) => index === 0 || type !== night[index - 1]));
    layouts.add(night.join(','));
  }
  assert.ok(layouts.size > 1, 'a new run can produce a different night order');
});

test('hour and minute hands convert back to the original time', () => {
  for (let hour = 0; hour < 12; hour++) for (let minute = 0; minute < 60; minute++) {
    const time = { hour, minute };
    const angles = handAngles(time);
    assert.deepEqual(Object.keys(angles), ['hour', 'minute']);
    for (const hand of ['hour', 'minute']) {
      assert.equal(valueFromAngle(hand, wrap(angles[hand], 360), time), time[hand]);
    }
  }
});

test('clock labels and wraparound handle 12 oclock and both rotation directions', () => {
  assert.equal(formatTime({ hour: 0, minute: 0 }), '12 : 00');
  assert.equal(formatTime({ hour: 3, minute: 7 }), '03 : 07');
  assert.equal(wrap(-1, 60), 59);
  assert.equal(wrap(60, 60), 0);
  assert.equal(wrap(-1, 12), 11);
  assert.ok(matches({ hour: 1, minute: 2 }, { hour: 1, minute: 2 }));
  assert.ok(!matches({ hour: 1, minute: 2 }, { hour: 1, minute: 3 }));
  assert.ok(matchesWithin({ hour: 11, minute: 59 }, { hour: 0, minute: 0 }, 1));
});

test('fifteen customer orders use only hours and minutes with longer limits', () => {
  assert.equal(customers.length, 15);
  for (let order = 0; order < customers.length; order++) {
    assert.ok(customers[order].limit >= 60 && customers[order].limit <= 95);
    for (let step = 0; step < 100; step++) {
      const time = newOrder(order, () => step / 100).target;
      assert.ok(time.hour >= 0 && time.hour < 12);
      assert.ok(time.minute >= 0 && time.minute < 60);
      assert.deepEqual(Object.keys(time), ['hour', 'minute']);
      if (order < 10 && order % 5 === 0) assert.equal(time.minute % 5, 0);
      if (order === 13) assert.ok(time.minute <= 20);
    }
  }
});

test('adjustments carry and borrow minutes and hours across twelve', () => {
  assert.deepEqual(adjustTime({ hour: 11, minute: 59 }, 'minute', 1), { hour: 0, minute: 0 });
  assert.deepEqual(adjustTime({ hour: 0, minute: 0 }, 'minute', -1), { hour: 11, minute: 59 });
  assert.deepEqual(adjustTime({ hour: 3, minute: 58 }, 'minute', 5), { hour: 4, minute: 3 });
  assert.deepEqual(adjustTime({ hour: 4, minute: 3 }, 'minute', -5), { hour: 3, minute: 58 });
});

test('dragging several complete turns advances the clock and reversing restores it', () => {
  const start = { hour: 11, minute: 59 };
  for (const hand of ['minute', 'hour']) {
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

test('small minute-hand reversals near twelve do not add extra turns', () => {
  let time = { hour: 3, minute: 59 };
  time = moveHandToAngle(time, 'minute', 0);
  assert.deepEqual(time, { hour: 4, minute: 0 });
  time = moveHandToAngle(time, 'minute', 1);
  assert.deepEqual(time, { hour: 4, minute: 0 });
  time = moveHandToAngle(time, 'minute', 354);
  assert.deepEqual(time, { hour: 3, minute: 59 });
});

test('special requests calculate minute offsets across twelve', () => {
  const eevee = newOrder(1, () => 0.999);
  assert.deepEqual(eevee.reference, { hour: 11, minute: 59 });
  assert.deepEqual(eevee.target, { hour: 0, minute: 9 });
  const celebi = newOrder(4, () => 0);
  assert.deepEqual(celebi.target, { hour: 11, minute: 40 });
  assert.equal(customers[2].limit, 80);
});

test('tips reward clean combos, fast repairs, and customer-specific conditions', () => {
  const express = repairReward(0, 23000, 12000, true, 2);
  assert.deepEqual(express, { combo: 3, perfect: true, special: 150, tip: 400, total: 730 });
  assert.equal(repairReward(0, 22999, 20001, true, 2).special, 0);
  assert.equal(repairReward(3, 1000, 24000, true, 0).special, 150);
  assert.equal(repairReward(5, 23000, 12000, true, 2).special, 150);
  assert.equal(repairReward(8, 1000, 24000, true, 0).special, 150);
  assert.equal(repairReward(2, 40000, 40000, true, 0).perfect, true);
  assert.equal(repairReward(2, 39999, 40001, true, 0).perfect, false);
  const corrected = repairReward(3, 20000, 1000, false, 0);
  assert.equal(corrected.combo, 0);
  assert.equal(corrected.tip, 0);
  assert.equal(corrected.total, 600);
});

test('digital answers use a twelve-hour clock and reject empty or out-of-range values', () => {
  assert.deepEqual(readDigitalTime('12', '00'), { hour: 0, minute: 0 });
  assert.deepEqual(readDigitalTime('03', '59'), { hour: 3, minute: 59 });
  for (const [hour, minute] of [['', '0'], ['1', ''], ['0', '10'], ['13', '10'], ['1', '60'], ['-1', '2'], ['1.5', '20'], ['1e1', '0']]) {
    assert.equal(readDigitalTime(hour, minute), null);
  }
});
