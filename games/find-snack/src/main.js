import Phaser from 'phaser';
import './style.css';
import { difficulty, shufflePattern, pathProgress, swerveProgress, spinPosition, spinDestination, dogRise, TOTAL_STAGES } from './difficulty.js';
import { pokemonAssets } from './pokemon-assets.js';

const pokemonMode = typeof document !== 'undefined' && document.body?.dataset.theme === 'snorunt';
const hellMode = !pokemonMode;
const scoreStorageKey = pokemonMode ? 'snorunt-berry-best' : 'rice-cake-best';
const C = pokemonMode
  ? { ink: '#24475d', muted: '#6b8b9d', green: '#34718d', orange: '#c78437' }
  : { ink: '#293f35', muted: '#7c8c70', green: '#375e47', orange: '#db7947' };
function displayText(text) {
  return pokemonMode ? String(text).replaceAll('떡을', '열매를').replaceAll('떡', '열매').replaceAll('용만이', '눈꼬마') : text;
}
const slots = [240, 480, 720];
const font = '"Noto Sans KR", sans-serif';

class ShuffleScene extends Phaser.Scene {
  preload() {
    if (!pokemonMode) return;
    const loading = this.label(480, 280, '눈꼬마와 오랭열매를 불러오는 중…', 20, C.ink, '700');
    pokemonAssets.forEach(asset => {
      if (!this.textures.exists(asset.key)) this.load.image({ key: asset.key, url: asset.url, xhrSettings: { timeout: 12000 } });
    });
    this.load.once('complete', () => loading.destroy());
  }

  create(data = {}) {
    if (pokemonMode) {
      if (pokemonAssets.some(asset => !this.textures.exists(asset.key))) {
        this.label(480, 280, '스프라이트를 불러오지 못했어요. 아래 안내를 확인해 주세요.', 18, C.ink, '700');
        document.querySelector('#asset-error').hidden = false;
        return;
      }
      pokemonAssets.forEach(({ key, frame }) => {
        const texture = this.textures.get(key);
        if (!texture.has(frame.name)) texture.add(frame.name, 0, frame.x, frame.y, frame.width, frame.height);
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      });
    }
    this.round = Math.max(1, Math.min(TOTAL_STAGES, Number(data.round) || 1));
    this.nextStage = false;
    this.score = 0;
    this.phase = 'ready';
    this.people = [];
    this.best = this.readBest();
    this.drawStage();
    slots.forEach((x, index) => this.people.push(this.makePerson(x, index)));
    this.heading = this.label(480, 118, '누가 떡을 먹었을까요?', 26, C.ink, '800');
    this.hint = this.label(480, 158, hellMode ? 'HELL MODE · 눈꼬마 5단계 다음부터 시작 · 무한 재도전' : '총 5스테이지 · 각 스테이지 무한 재도전! 끝까지 찾아보세요.', 14, C.muted);
    this.button = this.add.container(480, 491);
    const buttonBg = this.add.rectangle(0, 0, 270, 64, pokemonMode ? 0x34718d : 0x375e47).setInteractive({ useHandCursor: true });
    this.buttonText = this.label(0, 0, '게임 시작  →', 19, '#ffffff', '700');
    this.button.add([buttonBg, this.buttonText]);
    buttonBg.on('pointerover', () => buttonBg.setFillStyle(pokemonMode ? 0x448aa8 : 0x467559));
    buttonBg.on('pointerout', () => buttonBg.setFillStyle(pokemonMode ? 0x34718d : 0x375e47));
    buttonBg.on('pointerdown', () => this.advance());
    this.input.keyboard.on('keydown-SPACE', (event) => {
      if (event.target instanceof HTMLElement && event.target.closest('button')) return;
      event.preventDefault();
      if (!event.repeat) this.advance();
    });
    ['ONE', 'TWO', 'THREE'].forEach((key, index) => this.input.keyboard.on(`keydown-${key}`, () => this.choose(index)));
    this.updateHud();
    if (data.autoStart) this.startRound();
  }

  label(x, y, text, size = 16, color = C.ink, weight = '500') {
    return this.add.text(x, y, displayText(text), { fontFamily: font, fontSize: size, color, fontStyle: weight }).setOrigin(0.5);
  }

  drawStage() {
    const g = this.add.graphics();
    g.fillStyle(pokemonMode ? 0xe3f2f7 : 0xeaf0df).fillRect(0, 0, 960, 560);
    g.fillStyle(pokemonMode ? 0xf4fbfe : 0xf5f7ed).fillRoundedRect(25, 22, 910, 58, 16);
    if (pokemonMode) {
      g.fillStyle(0xffffff, 0.65);
      for (let i = 0; i < 28; i++) g.fillCircle(45 + (i * 137) % 870, 185 + (i * 79) % 265, 2 + i % 3);
    }
    g.lineStyle(1, 0xdde4d1).lineBetween(320, 37, 320, 65).lineBetween(640, 37, 640, 65);
    this.roundLabel = this.label(170, 51, '', 15, C.green, '700');
    this.scoreLabel = this.label(480, 51, '', 15, C.green, '700');
    this.lifeLabel = this.label(790, 51, '', 16, C.orange, '700');
    g.fillStyle(pokemonMode ? 0xd2e6ef : 0xe0e8d3).fillEllipse(480, 377, 820, 112);
    slots.forEach((x, i) => {
      g.fillStyle(pokemonMode ? 0xf8fdff : 0xf4f6eb).fillEllipse(x, 385, 170, 36);
      this.label(x, 424, `${i + 1}`, 16, '#8d9c7e', '700');
    });
    this.ruleLabel = this.label(480, 540, hellMode ? 'HELL: 1 동시 이동 → 2 분신 → 3 되감기 → 4 경로 반전 → 5 총공세' : '1 기본 → 2 가짜·엇박 → 3 연속·방해물 → 4 회전 섞기 → 5 360도 회전', 11, '#8b997d');
  }

  makePerson(x, id) {
    if (pokemonMode) return this.makeSnorunt(x, id);
    const person = this.add.container(x, 315);
    const g = this.add.graphics();
    g.fillStyle(0xb7c6a3, 0.4).fillEllipse(0, 69, 105, 18);
    g.fillStyle(0x33483d).fillRoundedRect(-34, 43, 27, 29, 9).fillRoundedRect(7, 43, 27, 29, 9);
    g.fillStyle(0xe8a65a).fillRoundedRect(-48, -4, 96, 65, 21);
    g.fillStyle(0xf4bd79).fillCircle(-45, 22, 13).fillCircle(45, 22, 13);
    g.fillStyle(0xffd6ac).fillCircle(-53, -38, 13).fillCircle(53, -38, 13);
    g.fillStyle(0x3c352c).fillRoundedRect(-56, -103, 112, 101, 43);
    g.fillStyle(0xffd6ac).fillRoundedRect(-53, -82, 106, 87, 37);
    g.fillStyle(0x3c352c).fillEllipse(-26, -84, 58, 34).fillEllipse(19, -89, 67, 29);
    g.fillStyle(0x3c352c).fillCircle(-20, -43, 4).fillCircle(20, -43, 4);
    g.fillStyle(0xec9b7f, 0.6).fillEllipse(-34, -26, 17, 10).fillEllipse(34, -26, 17, 10);
    g.lineStyle(3, 0x995f41).beginPath().arc(0, -27, 12, 0.15, Math.PI - 0.15).strokePath();
    g.fillStyle(0xffe7b4).fillCircle(0, 25, 14);
    const cake = this.add.container(0, -22);
    const rice = this.add.graphics();
    rice.fillStyle(0xdbc2cb).fillRoundedRect(-20, -10, 40, 25, 9);
    rice.fillStyle(0xfffbf4).fillRoundedRect(-20, -15, 40, 24, 9);
    rice.fillStyle(0xf3a4ad).fillCircle(0, -3, 6);
    cake.add(rice).setVisible(false);
    const tag = this.label(0, -134, '냠냠! 떡 먹었다!', 15, C.orange, '800').setVisible(false);
    person.add([g, cake, tag]);
    person.setSize(200, 230).setInteractive({ useHandCursor: true });
    person.on('pointerdown', () => this.choose(person.slot));
    person.on('pointerover', () => { if (this.phase === 'guess') person.setScale(1.05); });
    person.on('pointerout', () => { if (this.phase === 'guess') person.setScale(1); });
    Object.assign(person, { identity: id, slot: id, cake, tag });
    return person;
  }

  makeSnorunt(x, id) {
    const person = this.add.container(x, 315);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x8daebf, 0.3).fillEllipse(0, 68, 106, 18);
    const sprite = this.add.image(0, -14, 'snorunt', 'body').setScale(4);
    const cake = this.add.container(0, 12).setVisible(false);
    cake.add(this.add.image(0, 0, 'oran-berry', 'fruit').setScale(2));
    const tag = this.label(0, -134, '냠냠! 열매 먹었다!', 15, C.orange, '800').setVisible(false);
    person.add([shadow, sprite, cake, tag]);
    person.setSize(200, 230).setInteractive({ useHandCursor: true });
    person.on('pointerdown', () => this.choose(person.slot));
    person.on('pointerover', () => { if (this.phase === 'guess') person.setScale(1.05); });
    person.on('pointerout', () => { if (this.phase === 'guess') person.setScale(1); });
    Object.assign(person, { identity: id, slot: id, cake, tag, foodY: 12 });
    return person;
  }

  readBest() { try { return Number(localStorage.getItem(scoreStorageKey)) || 0; } catch { return 0; } }
  updateHud() {
    this.roundLabel.setText(`${hellMode ? 'HELL · ' : ''}STAGE ${this.round} / ${TOTAL_STAGES}`);
    this.scoreLabel.setText(`점수 ${this.score}   /   최고 ${this.best}`);
    this.lifeLabel.setText('재도전 ∞');
  }
  announce(title, hint) {
    title = displayText(title);
    hint = displayText(hint);
    this.heading.setText(title);
    this.hint.setText(hint);
    document.querySelector('#status').textContent = `${title} ${hint}`;
  }
  advance() {
    if (!['ready', 'result', 'won'].includes(this.phase)) return;
    if (this.phase === 'won') {
      this.scene.restart({ round: 1, autoStart: true });
      return;
    }
    if (this.nextStage) { this.round++; this.nextStage = false; }
    this.startRound();
  }
  async startRound() {
    this.phase = 'watch';
    this.button.setVisible(false);
    this.updateHud();
    const level = difficulty(this.round, hellMode);
    this.ruleLabel.setText(hellMode ? `HELL ${this.round}/5  ·  기존 방해요소 + ${['3인 동시 이동', '분신', '되감기', '경로 반전', '트릭 총공세'][this.round - 1]}`
      : level.active.length ? `현재 방해요소  ·  ${level.active.map(item => item.name).join('  ·  ')}`
      : '1 기본 → 2 가짜·엇박 → 3 연속·방해물 → 4 회전 섞기 → 5 360도 회전');
    this.people.forEach((p, i) => {
      this.tweens.killTweensOf(p);
      p.slot = i;
      p.setPosition(slots[i], 315).setScale(1).setRotation(0);
      p.cake.setPosition(0, p.foodY ?? -22).setVisible(false);
      p.tag.setVisible(false);
    });
    this.target = Phaser.Math.Between(0, 2);
    const eater = this.people[this.target];
    if (level.unlocked) {
      this.announce(`새 방해요소: ${level.unlocked.name}`, '이번 스테이지부터 추가됩니다. 이전 방해요소도 계속 등장해요!');
      await this.delay(1700);
    }
    this.announce('떡 먹는 친구를 기억하세요!', '곧 자리가 바뀝니다. 한눈팔면 놓쳐요.');
    await this.delay(450);
    eater.cake.setVisible(true);
    eater.tag.setText(displayText('냠냠! 떡 먹었다!')).setColor(C.orange).setVisible(true);
    this.tweens.add({ targets: eater.cake, y: (eater.foodY ?? -22) - 8, duration: 180, yoyo: true, repeat: 3 });
    await this.delay(1600);
    eater.cake.setVisible(false); eater.tag.setVisible(false);
    this.announce('자, 섞습니다!', '떡 먹은 친구의 움직임을 따라가세요.');
    await this.delay(450);
    this.phase = 'shuffle';
    const count = level.count;
    const obstacles = [];
    for (let step = 0; step < count; step++) {
      const a = this.people[Phaser.Math.Between(0, 2)];
      const others = this.people.filter(person => person !== a);
      const b = others[Phaser.Math.Between(0, 1)];
      const pattern = shufflePattern(this.round, step, count, Math.random, hellMode);
      if (pattern.obstacle) obstacles.push(this.spawnObstacle(pattern.obstacle, pattern.reverse));
      await this.shuffleMove(a, b, pattern, level.duration);
      await this.delay(pattern.offbeat ? (step % 2 ? 15 : level.gap + (hellMode ? 50 : 150)) : level.gap);
    }
    await Promise.all(obstacles);
    this.phase = 'guess';
    this.announce('떡 먹은 용만이는 누구?', '친구를 클릭하거나 키보드 1 · 2 · 3을 누르세요.');
  }
  delay(ms) { return new Promise(resolve => this.time.delayedCall(ms, resolve)); }
  async shuffleMove(a, b, pattern, duration) {
    if (pattern.relay) {
      await this.relayMove(pattern.reverse, duration);
      return;
    }
    if (pattern.spin) {
      await this.spinShuffle(pattern.reverse, duration);
      return;
    }
    const decoy = pattern.decoy ? this.spawnDecoy(a, b, duration) : null;
    if (pattern.rewind) {
      await this.swap(a, b, { reverse: pattern.reverse }, duration);
      await this.swap(a, b, { reverse: !pattern.reverse }, duration);
      if (decoy) await decoy;
      return;
    }
    await this.swap(a, b, pattern, duration);
    if (pattern.chain) {
      const third = this.people.find(person => person !== a && person !== b);
      // Immediately hand the movement to a new pair, with no overlapping swaps.
      await this.swap(pattern.reverse ? b : a, third, { feint: false, twirl: pattern.twirl, reverse: !pattern.reverse }, duration);
    }
    if (decoy) await decoy;
  }

  relayMove(reverse, duration) {
    const starts = this.people.map(person => ({ person, slot: person.slot }));
    const progress = { t: 0 };
    return new Promise(resolve => this.tweens.add({
      targets: progress, t: 1, duration: hellMode ? Math.max(390, duration * 2) : Math.max(600, duration * 2), ease: 'Sine.easeInOut',
      onUpdate: () => starts.forEach(({ person, slot }) => {
        const destination = spinDestination(slot, reverse);
        const lift = Math.sin(progress.t * Math.PI) * (slot === 0 ? -68 : slot === 1 ? 68 : 0);
        person.setPosition(Phaser.Math.Linear(slots[slot], slots[destination], progress.t), 315 + lift).setDepth(slot === 2 ? 2 : 1);
      }),
      onComplete: () => {
        starts.forEach(({ person, slot }) => {
          person.slot = spinDestination(slot, reverse);
          person.setPosition(slots[person.slot], 315).setDepth(0);
        });
        resolve();
      },
    }));
  }

  spawnDecoy(a, b, duration) {
    const third = this.people.find(person => person !== a && person !== b);
    const ghost = this.add.container(a.x, a.y).setDepth(9);
    const silhouette = this.add.graphics();
    silhouette.fillStyle(0xe7d9bc, .58).fillRoundedRect(-45, -78, 90, 132, 32);
    silhouette.fillStyle(0x4b3942, .6).fillCircle(-20, -34, 4).fillCircle(20, -34, 4);
    silhouette.lineStyle(3, 0x9b6c83, .7).strokeRoundedRect(-45, -78, 90, 132, 32);
    ghost.add(silhouette).setAlpha(.7);
    return new Promise(resolve => this.tweens.add({
      targets: ghost, x: third.x, y: 285, alpha: 0, duration: Math.max(460, duration * 2), ease: 'Sine.easeInOut',
      onComplete: () => { ghost.destroy(); resolve(); },
    }));
  }

  async spinShuffle(reverse, duration) {
    const starts = this.people.map(person => ({ person, slot: person.slot }));
    const animate = (milliseconds, update) => new Promise(resolve => {
      const progress = { t: 0 };
      this.tweens.add({ targets: progress, t: 1, duration: milliseconds, ease: 'Sine.easeInOut',
        onUpdate: () => update(progress.t), onComplete: () => { update(1); resolve(); } });
    });
    // Spread into a ring, orbit together, then settle into the new slot order.
    await animate(180, t => starts.forEach(({ person, slot }) => {
      const point = spinPosition(slot, 0, reverse);
      person.setPosition(slots[slot], Phaser.Math.Linear(315, point.y, t));
    }));
    await animate(hellMode ? Math.max(650, duration * 3) : Math.max(1400, duration * 5), t => starts.forEach(({ person, slot }) => {
      const point = spinPosition(slot, t, reverse);
      person.setPosition(point.x, point.y).setDepth(point.y / 100);
    }));
    await animate(180, t => starts.forEach(({ person, slot }) => {
      const point = spinPosition(slot, 1, reverse);
      person.setPosition(slots[spinDestination(slot, reverse)], Phaser.Math.Linear(point.y, 315, t));
    }));
    starts.forEach(({ person, slot }) => {
      person.slot = spinDestination(slot, reverse);
      person.setPosition(slots[person.slot], 315).setDepth(0);
    });
  }
  swap(a, b, pattern = {}, duration = difficulty(this.round, hellMode).duration) {
    // Give a full body turn enough time to read, even at the fastest difficulty.
    if (pattern.twirl) duration = Math.max(duration, hellMode ? 430 : 600);
    const ax = a.x, bx = b.x;
    const ay = a.y, by = b.y;
    const progress = { elapsed: 0 };
    a.setDepth(2); b.setDepth(1);
    return new Promise(resolve => this.tweens.add({
      targets: progress, elapsed: duration, duration, ease: 'Linear',
      onUpdate: () => {
        const position = pattern.swerve ? swerveProgress(progress.elapsed, duration) : pathProgress(progress.elapsed, duration, pattern.feint);
        const lift = Math.sin(position * Math.PI) * 44;
        a.setPosition(Phaser.Math.Linear(ax, bx, position), ay + lift);
        b.setPosition(Phaser.Math.Linear(bx, ax, position), by - lift);
        if (pattern.twirl) {
          const angle = pathProgress(progress.elapsed, duration) * Math.PI * 2 * (pattern.reverse ? -1 : 1);
          a.setRotation(angle);
          b.setRotation(-angle);
        }
      },
      onComplete: () => {
        if (!pattern.feint) [a.slot, b.slot] = [b.slot, a.slot];
        a.setPosition(slots[a.slot], ay).setDepth(0).setRotation(0);
        b.setPosition(slots[b.slot], by).setDepth(0).setRotation(0);
        resolve();
      }
    }));
  }

  spawnObstacle(kind, reverse) {
    if (kind === 'bird') return this.flyBird(reverse);
    if (kind === 'dog') return this.popDog();
    return this.flyObstacle(reverse);
  }

  flyBird(reverse) {
    const bird = this.add.container(reverse ? 1160 : -200, 445).setDepth(11);
    bird.setScale(reverse ? -1 : 1, 1);
    const body = this.add.graphics();
    body.fillStyle(0xd5e0df).fillTriangle(-65, 5, -125, -28, -112, 33);
    body.fillStyle(0xfffcf2).fillEllipse(-5, 8, 170, 96).fillCircle(65, -16, 43);
    body.fillStyle(0xe7a14d).fillTriangle(100, -24, 147, -6, 101, 6);
    body.fillStyle(0x293f35).fillCircle(78, -26, 6);
    body.fillStyle(0xffffff).fillCircle(80, -28, 2);
    body.lineStyle(6, 0xe7a14d).lineBetween(-15, 48, -25, 65).lineBetween(14, 48, 7, 65);
    const wing = this.add.graphics();
    wing.fillStyle(0xb9cccf).fillEllipse(-28, -37, 130, 52);
    wing.fillStyle(0xe7f0ed).fillEllipse(-12, -44, 95, 36);
    bird.add([body, wing]);
    const progress = { t: 0 };
    return new Promise(resolve => this.tweens.add({
      targets: progress, t: 1, duration: 2100, ease: 'Linear',
      onUpdate: () => {
        bird.setPosition(Phaser.Math.Linear(reverse ? 1160 : -200, reverse ? -200 : 1160, progress.t),
          Phaser.Math.Linear(445, 175, progress.t) + Math.sin(progress.t * Math.PI * 8) * 10);
        wing.setRotation(Math.sin(progress.t * Math.PI * 16) * 0.7);
      },
      onComplete: () => { bird.destroy(); resolve(); },
    }));
  }

  popDog() {
    const dog = this.add.container(slots[Phaser.Math.Between(0, 2)], 700).setDepth(12);
    const g = this.add.graphics();
    // Floppy ears, cream muzzle and paws make the silhouette readable from below.
    g.fillStyle(0x9a603b).fillEllipse(-85, -50, 65, 155).fillEllipse(85, -50, 65, 155);
    g.fillStyle(0xce955d).fillRoundedRect(-80, -115, 160, 160, 55);
    g.fillStyle(0xf2c994).fillEllipse(0, 2, 126, 80);
    g.fillStyle(0x352f2a).fillCircle(-33, -57, 8).fillCircle(33, -57, 8);
    g.fillStyle(0xffffff).fillCircle(-30, -60, 3).fillCircle(36, -60, 3);
    g.fillStyle(0x352f2a).fillEllipse(0, -20, 30, 20).fillEllipse(0, 17, 38, 32);
    g.fillStyle(0xe99591).fillRoundedRect(-10, 14, 20, 30, 9);
    g.fillStyle(0x557b61).fillRoundedRect(-70, 42, 140, 20, 7);
    g.fillStyle(0xf3d576).fillCircle(0, 60, 12);
    g.fillStyle(0xce955d).fillEllipse(-63, 78, 65, 48).fillEllipse(63, 78, 65, 48);
    g.lineStyle(2, 0x9a603b).lineBetween(-73, 76, -73, 91).lineBetween(-57, 78, -57, 93)
      .lineBetween(53, 76, 53, 91).lineBetween(69, 78, 69, 93);
    const bark = this.label(0, -150, '멍! 나도 떡!', 22, C.orange, '800');
    dog.add([g, bark]);
    const progress = { t: 0 };
    return new Promise(resolve => this.tweens.add({
      targets: progress, t: 1, duration: 2200, ease: 'Linear',
      onUpdate: () => {
        const rise = dogRise(progress.t);
        dog.y = 700 - rise * 275;
        dog.setRotation(Math.sin(progress.t * Math.PI * 10) * 0.055 * rise);
        bark.setScale(1 + Math.sin(progress.t * Math.PI * 12) * 0.06);
      },
      onComplete: () => { dog.destroy(); resolve(); },
    }));
  }

  flyObstacle(reverse) {
    // The cloud stays over the stage while subsequent shuffles continue underneath.
    const cloud = this.add.container(reverse ? 1200 : -240, 305).setDepth(10);
    const g = this.add.graphics();
    g.fillStyle(0xfffbf2, 0.98);
    g.fillEllipse(0, 10, 380, 250).fillCircle(-95, -45, 75).fillCircle(20, -65, 80).fillCircle(110, -20, 70);
    g.fillStyle(0xe0e8d3, 0.65).fillEllipse(-35, 85, 150, 18);
    cloud.add([g, this.label(0, 0, '뜨끈뜨끈! 떡 나와요!', 20, C.orange, '800')]);
    return new Promise(resolve => this.tweens.add({
      targets: cloud, x: reverse ? -240 : 1200, duration: 2000, ease: 'Linear',
      onComplete: () => { cloud.destroy(); resolve(); },
    }));
  }
  choose(slot) {
    if (this.phase !== 'guess') return;
    this.phase = 'result';
    this.people.forEach(p => p.setScale(1));
    const eater = this.people[this.target];
    const correct = eater.slot === slot;
    this.nextStage = correct && this.round < TOTAL_STAGES;
    eater.cake.setVisible(true);
    eater.tag.setText('제가 먹었어요!').setColor(C.green).setVisible(true);
    if (correct) {
      this.score += this.round * 100;
      this.announce('정답! 눈썰미가 좋은데요?', `+${this.round * 100}점! 다음 스테이지에 도전하세요.`);
      this.tweens.add({ targets: eater, y: 295, duration: 180, yoyo: true, repeat: 2 });
    } else {
      this.announce('앗, 다른 친구였어요!', `정답은 ${eater.slot + 1}번! 같은 스테이지에 다시 도전해 보세요.`);
      this.cameras.main.shake(180, 0.004);
    }
    this.best = Math.max(this.best, this.score);
    try { localStorage.setItem(scoreStorageKey, String(this.best)); } catch { /* Storage can be disabled. */ }
    this.updateHud();
    if (correct && this.round === TOTAL_STAGES) {
      this.phase = 'won';
      this.showVictory();
      this.buttonText.setText('처음부터 다시  ↻');
    } else this.buttonText.setText(correct ? '다음 스테이지  →' : '다시 도전  →');
    this.button.setVisible(true);
  }

  showVictory() {
    this.announce('5스테이지 클리어!', '축하합니다! 떡 먹은 용만이를 끝까지 찾아냈어요!');
    const panel = this.add.container(480, 285).setDepth(20);
    const background = this.add.graphics();
    background.fillStyle(0xfffcf2, 0.98).fillRoundedRect(-300, -100, 600, 235, 24);
    background.lineStyle(3, 0xd5b465).strokeRoundedRect(-300, -100, 600, 235, 24);
    panel.add([background,
      this.label(0, -60, '★  ALL CLEAR  ★', 22, '#b78a37', '800'),
      this.label(0, -9, '축하합니다! 모두 통과했어요!', 27, C.green, '800'),
      this.label(0, 43, `최종 점수 ${this.score}점 · 끝까지 도전 완료!`, 17, C.ink, '700'),
      this.label(0, 87, '당신을 떡 찾기 달인으로 인정합니다!', 14, C.muted),
    ]);
    this.button.setDepth(22);
    const colors = [0xdb7947, 0xf3d576, 0x557b61, 0xe99591];
    for (let i = 0; i < 45; i++) {
      const piece = this.add.rectangle(Phaser.Math.Between(40, 920), -20, 8, 14, colors[i % colors.length]).setDepth(21);
      this.tweens.add({ targets: piece, y: 580, angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(1600, 2600), delay: i * 25,
        onComplete: () => piece.destroy() });
    }
  }
}

document.fonts.ready.then(() => new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 560,
  backgroundColor: pokemonMode ? '#e3f2f7' : '#eaf0df',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: ShuffleScene,
  render: { antialias: true },
}));
