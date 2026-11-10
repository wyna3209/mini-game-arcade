import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setPortrait, portraitUrl } from '../src/pokemon.js';
import { existsSync } from 'node:fs';
import { customers } from '../src/time.js';

test('owners and fifteen distinct customers have separate local artwork and a working load fallback', () => {
  const ids = [163, 599, ...customers.map(customer => customer.id)];
  assert.equal(customers.length, 15);
  assert.equal(new Set(customers.map(customer => customer.id)).size, 15);
  assert.equal(new Set(ids).size, 17);
  for (const id of ids) {
    const image = { style: {}, previousElementSibling: { hidden: false } };
    setPortrait(image, id, '포켓몬');
    assert.equal(image.src, portraitUrl(id));
    assert.ok(existsSync(new URL(image.src)), `Missing artwork for ${id}`);
    for (const property of ['width', 'height', 'left', 'top']) assert.ok(Number.isFinite(parseFloat(image.style[property])));
    image.onload();
    assert.equal(image.hidden, false);
    assert.equal(image.previousElementSibling.hidden, true);
    image.onerror();
    assert.equal(image.hidden, true);
    assert.equal(image.previousElementSibling.hidden, false);
  }
});
