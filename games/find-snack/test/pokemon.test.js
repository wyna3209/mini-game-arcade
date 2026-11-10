import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { pokemonAssets } from '../src/pokemon-assets.js';

function runtime(mode = 'snorunt') {
  let source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  source = source.slice(0, source.indexOf('document.fonts.ready')) + '\nglobalThis.Scene = ShuffleScene; globalThis.format = displayText;';
  const error = { hidden: true };
  const context = { Phaser: { Scene: class {} }, pokemonAssets,
    document: { body: { dataset: { theme: mode } }, querySelector: () => error },
    localStorage: { getItem(key) { context.storageKey = key; return '700'; } },
  };
  vm.createContext(context); vm.runInContext(source, context);
  return { scene: new context.Scene(), context, error };
}

test('theme wording and high scores are separate from the original game', () => {
  const pokemon = runtime();
  assert.equal(pokemon.context.format('누가 떡을 먹었을까요?'), '누가 열매를 먹었을까요?');
  assert.equal(pokemon.context.format('떡 먹은 용만이'), '열매 먹은 눈꼬마');
  assert.equal(pokemon.scene.readBest(), 700);
  assert.equal(pokemon.context.storageKey, 'snorunt-berry-best');
  const original = runtime('');
  assert.equal(original.context.format('떡 먹은 용만이'), '떡 먹은 용만이');
  original.scene.readBest();
  assert.equal(original.context.storageKey, 'rice-cake-best');
});

test('CDN loading only queues missing assets, with a timeout and readable error state', () => {
  const { scene, error } = runtime();
  const queued = [];
  scene.label = () => ({ destroy() {} });
  scene.textures = { exists: key => key === 'snorunt' };
  scene.load = { image(config) { queued.push(config); }, once() {} };
  scene.preload();
  assert.equal(queued.length, 1);
  assert.equal(queued[0].key, 'oran-berry');
  assert.equal(new URL(queued[0].url).hostname, 'cdn.jsdelivr.net');
  assert.equal(queued[0].xhrSettings.timeout, 12000);
  scene.create();
  assert.equal(error.hidden, false);
  const original = runtime('');
  original.scene.preload(); // Original version needs no CDN textures or loader.
});

test('all three Snorunt use identical sprites, berry objects and click-to-slot mapping', () => {
  const { scene } = runtime();
  const images = [];
  function node() { return { children: [], handlers: {}, visible: true,
    setVisible(value) { this.visible = value; return this; },
    setScale(value) { this.scale = value; return this; },
    setSize() { return this; }, setInteractive() { return this; },
    add(child) { this.children.push(...(Array.isArray(child) ? child : [child])); return this; },
    on(event, handler) { this.handlers[event] = handler; return this; },
  }; }
  scene.add = {
    container: () => node(),
    graphics: () => { const g = { fillStyle: () => g, fillEllipse: () => g }; return g; },
    image(x, y, key, frame) { const image = Object.assign(node(), { x, y, key, frame }); images.push(image); return image; },
  };
  scene.label = node;
  const people = [240, 480, 720].map((x, i) => scene.makePerson(x, i));
  assert.equal(images.filter(image => image.key === 'snorunt' && image.frame === 'body' && image.scale === 4).length, 3);
  assert.equal(images.filter(image => image.key === 'oran-berry' && image.frame === 'fruit').length, 3);
  assert.ok(people.every(person => !person.cake.visible && person.foodY === 12));
  let chosen;
  scene.choose = slot => { chosen = slot; };
  people[0].slot = 2;
  people[0].handlers.pointerdown();
  assert.equal(chosen, 2);
});
