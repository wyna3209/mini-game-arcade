import Phaser from 'phaser';
import './style.css';
import './reading-console.css';
import './character-layout.css';
import './interaction-guide.css';
import fontLicenseUrl from '../assets/DSEG-LICENSE.txt?url';
import { DAY_ORDER_COUNT, customers, services, createOrderSequence, wrap, formatTime, handAngles, adjustTime, matchesWithin, signedAngleDelta, initialTime, newOrder, repairReward, readDigitalTime } from './time.js';
import { setPortrait } from './pokemon.js';
import { clockThemes, paintClockFace, colorHex } from './clock-themes.js';

const center = { x: 330, y: 315 };
const hands = {
  hour: { length: 142, color: 0x387fa7, width: 18, tipWidth: 30, tipHeight: 30 },
  minute: { length: 206, color: 0x6a9b58, width: 9, tipWidth: 20, tipHeight: 27 },
  second: { length: 244, color: 0xc2624d, width: 3, tipWidth: 10, tipHeight: 19 },
};
const $ = id => document.getElementById(id);

class ClockShop extends Phaser.Scene {
  get serviceIndex() { return this.orderSequence?.[this.order] ?? this.order; }
  get customer() { return customers[this.serviceIndex]; }
  get service() { return services[this.serviceIndex]; }
  get totalOrders() { return this.orderSequence?.length ?? customers.length; }

  create() {
    $('font-credit').href = fontLicenseUrl;
    this.orderSequence = createOrderSequence();
    this.order = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.totalTips = 0;
    this.phase = 'ready';
    this.selected = 'hour';
    this.current = { hour: 0, minute: 0, second: 0 };
    this.handObjects = {};
    this.handGrips = {};
    $('game-stage').dataset.shift = 'day';
    this.drawClock();
    this.bindControls();
    this.select('hour');
    this.refreshClock();
    this.refreshHud();
    setPortrait($('hoothoot-sprite'), 163, '부우부');
    setPortrait($('klink-sprite'), 599, '기어르');
    this.setShopMood('ready');
    this.prepareOrder(false);
  }

  drawClock() {
    this.clockThemeId = null;
    this.clockFace = this.add.graphics();
    this.clockNumerals = [];
    for (let hour = 1; hour <= 12; hour++) {
      const angle = hour * Math.PI / 6;
      this.clockNumerals.push(this.add.text(330 + Math.sin(angle) * 207, 315 - Math.cos(angle) * 207, String(hour),
        { fontFamily: 'Georgia, serif', fontSize: 37, color: '#65513b', fontStyle: 'bold' }).setOrigin(0.5));
    }
    this.clockSignature = this.add.text(330, 412, 'HOOTHOOT & KLINK', { fontFamily: 'Georgia, serif', fontSize: 12, color: '#b39a6d', letterSpacing: 2 }).setOrigin(0.5);
    this.clockThemeLabel = this.add.text(330, 432, '', { fontFamily: 'Noto Sans KR, sans-serif', fontSize: 11, color: '#b39a6d' }).setOrigin(0.5);
    Object.entries(hands).forEach(([key, style], i) => {
      const hand = this.add.container(center.x, center.y).setDepth(i + 1);
      const shaft = this.add.graphics();
      const shoulder = -style.length + style.tipHeight;
      shaft.fillStyle(0x654831, 0.2).fillRoundedRect(-style.width / 2 + 3, shoulder + 3, style.width + 2, -shoulder + 23, 2);
      shaft.fillStyle(0xd5b471).fillRoundedRect(-style.width / 2 - 1, shoulder, style.width + 2, -shoulder + 21, 2);
      shaft.fillStyle(style.color).fillRoundedRect(-style.width / 2, shoulder, style.width, -shoulder + 20, 1);
      shaft.fillTriangle(0, -style.length, -style.tipWidth / 2, shoulder, style.tipWidth / 2, shoulder);
      shaft.lineStyle(1, 0x735438).strokeTriangle(0, -style.length, -style.tipWidth / 2, shoulder, style.tipWidth / 2, shoulder);
      // Keep a generous invisible drag target around each precise, pointed tip.
      const grip = this.add.zone(0, -style.length + style.tipHeight / 2, 76, 82)
        .setInteractive({ useHandCursor: true });
      this.input.setDraggable(grip);
      hand.add([shaft, grip]);
      grip.on('pointerdown', pointer => { if (this.phase === 'playing') this.select(this.handAtPointer(pointer, key)); });
      grip.on('dragstart', pointer => {
        const selected = this.handAtPointer(pointer, key);
        if (this.phase !== 'playing' || !this.canMove(selected)) return;
        this.select(selected);
        this.hasAdjusted = true;
        this.updateGuide();
        this.dragState = { hand: selected, angle: wrap(Math.atan2(pointer.x - center.x, center.y - pointer.y) * 180 / Math.PI, 360), remainder: 0, visualAngle: handAngles(this.current)[selected] };
      });
      grip.on('drag', pointer => {
        const angle = wrap(Math.atan2(pointer.x - center.x, center.y - pointer.y) * 180 / Math.PI, 360);
        this.dragHand(this.dragState?.hand ?? key, angle);
      });
      grip.on('dragend', () => { this.dragState = null; this.refreshClock(); });
      this.handObjects[key] = hand;
      this.handGrips[key] = grip;
    });
    this.add.circle(330, 315, 20, 0xc39851).setStrokeStyle(4, 0xf8df9f).setDepth(6);
    this.add.circle(330, 315, 10, 0xf1d593).setStrokeStyle(2, 0x947044).setDepth(7);
  }

  bindControls() {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    $('action').addEventListener('click', () => this.act(), options);
    $('modal-action').addEventListener('click', () => this.act(), options);
    $('order-modal').addEventListener('cancel', event => event.preventDefault(), options);
    document.querySelectorAll('[data-answer]').forEach(button => {
      button.addEventListener('click', () => this.changeAnswer(button.dataset.answer, Number(button.dataset.step)), options);
    });
    ['answer-hour', 'answer-minute'].forEach(id => {
      const input = $(id);
      input.addEventListener('focus', () => input.select(), options);
      input.addEventListener('input', () => this.updateGuide(), options);
      input.addEventListener('blur', () => {
        if (/^\d{1,2}$/.test(input.value) && input.validity.valid) input.value = input.value.padStart(2, '0');
      }, options);
    });
    $('fullscreen').addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.querySelector('.game-shell').requestFullscreen();
      } catch {
        $('message').textContent = '이 브라우저에서는 전체 화면을 사용할 수 없어요. 현재 화면에서 계속 플레이해 주세요.';
      }
    }, options);
    document.addEventListener('fullscreenchange', () => {
      $('fullscreen').textContent = document.fullscreenElement ? '전체 화면 닫기 ⛶' : '전체 화면 ⛶';
    }, options);
    document.addEventListener('keydown', event => {
      if ($('order-modal').open) return;
      if (event.repeat && event.code === 'Enter') return;
      if (this.isReading()) {
        if (event.code === 'Enter' && !(event.target instanceof HTMLElement && event.target.closest('button'))) {
          event.preventDefault(); this.act();
        }
        return;
      }
      const key = { Digit1: 'hour', Digit2: 'minute', Digit3: 'second' }[event.code];
      if (key) { event.preventDefault(); this.select(key); }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
        event.preventDefault();
        this.nudge((['ArrowLeft', 'ArrowDown'].includes(event.code) ? -1 : 1) * (event.shiftKey ? 5 : 1));
      }
      if (event.code === 'Enter' && !(event.target instanceof HTMLElement && event.target.closest('button'))) {
        event.preventDefault(); this.act();
      }
    }, options);
    this.events.once('shutdown', () => controller.abort());
  }

  select(hand) {
    if (this.phase === 'playing' && !this.canMove(hand)) return;
    this.selected = hand;
    Object.entries(this.handObjects).forEach(([key, object], index) => object.setDepth(key === hand ? 4 : index + 1));
  }
  handAtPointer(pointer, fallback) {
    const available = Object.keys(hands).filter(key => this.canMove(key));
    const angles = handAngles(this.current);
    const distance = key => {
      const angle = angles[key] * Math.PI / 180;
      return Math.hypot(pointer.x - center.x - Math.sin(angle) * hands[key].length,
        pointer.y - center.y + Math.cos(angle) * hands[key].length);
    };
    return available.reduce((closest, key) => distance(key) < distance(closest) ? key : closest,
      available.includes(fallback) ? fallback : available[0] ?? fallback);
  }
  isReading() { return this.service.mode === 'read'; }
  canMove(hand) { return !this.isReading() && (!this.service.onlyHand || this.service.onlyHand === hand); }
  dragHand(hand, angle) {
    if (this.phase !== 'playing' || !this.canMove(hand)) return;
    this.select(hand);
    const state = this.dragState?.hand === hand ? this.dragState : { hand, angle, remainder: 0, visualAngle: handAngles(this.current)[hand] };
    const delta = signedAngleDelta(state.angle, angle);
    const progress = state.remainder + delta / (hand === 'hour' ? 30 : 6);
    const steps = Math.trunc(progress);
    const direction = this.service.reverse ? -1 : 1;
    state.angle = angle;
    state.remainder = progress - steps;
    state.visualAngle += delta * direction;
    this.dragState = state;
    if (steps) this.current = adjustTime(this.current, hand, steps * direction);
    this.refreshClock();
    this.handObjects[hand]?.setAngle(state.visualAngle);
  }
  changeAnswer(field, step) {
    if (this.phase !== 'playing' || !this.isReading()) return;
    const input = $(field === 'hour' ? 'answer-hour' : 'answer-minute');
    const min = field === 'hour' ? 1 : 0;
    const range = field === 'hour' ? 12 : 60;
    const value = Number(input.value);
    const valid = input.value !== '' && Number.isInteger(value) && value >= min && value < min + range;
    const next = valid ? wrap(value - min + step, range) + min : step > 0 ? min : min + range - 1;
    input.value = String(next).padStart(2, '0');
    this.updateGuide();
  }
  showCustomer() {
    const customer = this.customer;
    this.applyClockTheme(customer.id);
    $('customer-icon').textContent = customer.icon;
    $('customer-name').textContent = customer.name;
    $('customer-story').textContent = this.service.request;
    $('service-name').textContent = this.service.name;
    $('service-hint').textContent = this.service.hint;
    $('order-label').textContent = this.isReading() ? '② 읽은 시각을 여기에 입력' : this.service.offset ? '① 기준 시각과 조건 확인' : '① 손님의 주문 시각 확인';
    $('order-instruction').textContent = this.isReading() ? '숫자를 눌러 입력 · 파랑은 시, 초록은 분'
      : this.service.offset
      ? this.service.hint : '아래 시각과 똑같이 맞춰 주세요';
    setPortrait($('customer-sprite'), customer.id, customer.name);
  }
  applyClockTheme(id) {
    if (!this.clockFace || this.clockThemeId === id) return;
    const theme = clockThemes[id];
    paintClockFace(this.clockFace, theme);
    this.clockNumerals.forEach(label => label.setColor(colorHex(theme.ink)));
    this.clockSignature.setColor(colorHex(theme.accent));
    this.clockThemeLabel.setText(theme.name).setColor(colorHex(theme.ink));
    this.clockThemeId = id;
  }
  setShopMood(mood) {
    $('shop-team').dataset.mood = mood;
    const lines = {
      ready: ['후우~ 어서 오세요! 오늘도 시간을 맞춰 볼까요?', '딸깍딸깍! 수리 도구 준비 완료!'],
      working: [`후우~ ${this.customer.name}의 주문이야. 시각을 잘 봐 줘!`, this.isReading() ? '시계는 고정해 둘게! 시침과 분침을 읽어 숫자로 적어 줘!' : '드르륵… 톱니바퀴는 내가 맡을게! 바늘을 맞춰 줘!'],
      success: ['후우! 딱 맞아! 우리 수리점, 제법이지?', '찰칵! 수리 완료! 다음 손님도 맡겨 줘!'],
      retry: ['후우… 괜찮아. 같은 주문으로 다시 해 보자!', '딸깍! 도구를 다시 정비해 둘게. 천천히, 정확하게!'],
      won: ['후우~ 모든 손님이 웃고 돌아갔어! 정말 고마워!', '딩동! 오늘도 완벽한 하루! 우리 가게 최고의 수리공이야!'],
    };
    $('hoothoot-speech').textContent = lines[mood][0];
    $('klink-speech').textContent = lines[mood][1];
  }
  nudge(amount) {
    if (this.phase !== 'playing' || !this.canMove(this.selected)) return;
    this.current = adjustTime(this.current, this.selected, this.service.reverse ? -amount : amount);
    this.refreshClock();
    this.hasAdjusted = true;
    this.updateGuide();
  }
  updateGuide() {
    const playing = this.phase === 'playing';
    const reading = this.isReading();
    $('game-stage').dataset.guide = playing ? reading ? 'read' : 'set' : 'off';
    $('game-stage').dataset.ready = String(playing && (reading
      ? $('answer-hour').value.trim() !== '' && $('answer-minute').value.trim() !== ''
      : this.hasAdjusted));
  }
  refreshClock() {
    const angles = handAngles(this.current);
    Object.entries(this.handObjects).forEach(([key, hand]) => hand.setAngle(angles[key]));
  }
  act() {
    $('action').blur();
    if (this.phase === 'playing') { this.submit(); return; }
    if (this.phase === 'briefing') { this.beginOrder(); return; }
    if (this.phase === 'dusk') { this.prepareOrder(false); return; }
    if (this.phase === 'won') { $('order-modal').close(); this.scene.restart(); return; }
    if (this.phase === 'success') {
      this.order++;
      if (this.order === DAY_ORDER_COUNT) { this.enterNight(); return; }
    }
    this.prepareOrder(this.phase === 'retry');
  }
  enterNight() {
    this.phase = 'dusk';
    this.updateGuide();
    $('game-stage').dataset.shift = 'night';
    $('order-number').textContent = `밤 주문 1 / ${this.totalOrders - DAY_ORDER_COUNT}`;
    $('message').textContent = '가게 문을 닫자마자 초인종이 다시 울렸다… 밤손님들이 기다리고 있어요.';
    this.openModal('dusk', '문을 닫았는데… 종이 울렸다', '밤이 되자 시계가 이상하게 움직이기 시작했어요. 주문서가 사라지고 톱니가 거꾸로 돌아갑니다. 수리비와 콤보를 가지고 밤 영업을 시작해요!', '밤 영업 시작 →');
    $('modal-meta').textContent = `낮 주문 ${DAY_ORDER_COUNT}건 완료 · 밤 주문 ${this.totalOrders - DAY_ORDER_COUNT}건 남음`;
  }
  prepareOrder(retry) {
    const customer = this.customer;
    if (!retry) {
      this.request = newOrder(this.serviceIndex);
      this.target = this.request.target;
      this.cleanOrder = true;
    }
    const reading = this.isReading();
    this.current = initialTime(this.serviceIndex, this.target);
    this.dragState = null;
    this.hasAdjusted = false;
    if (this.service.onlyHand) this.select(this.service.onlyHand);
    Object.entries(this.handObjects).forEach(([key, hand]) => hand.setVisible(!reading || key !== 'second'));
    Object.entries(this.handGrips).forEach(([key, grip]) => { grip.input.enabled = this.canMove(key); });
    this.refreshClock();
    this.phase = 'briefing';
    $('order-number').textContent = this.order < DAY_ORDER_COUNT ? `낮 주문 ${this.order + 1} / ${DAY_ORDER_COUNT}` : `밤 주문 ${this.order - DAY_ORDER_COUNT + 1} / ${this.totalOrders - DAY_ORDER_COUNT}`;
    this.showCustomer();
    $('target').hidden = reading;
    $('target').textContent = reading ? '' : this.service.memory ? '?? : ?? : ??' : formatTime(this.request.reference);
    $('memory-countdown').hidden = !this.service.memory;
    $('memory-countdown').textContent = this.service.memory ? '시작하면 10초 동안 주문 시각 공개' : '';
    $('digital-entry').hidden = !reading;
    $('order-panel').dataset.mode = reading ? 'read' : 'set';
    $('answer-hour').value = '';
    $('answer-minute').value = '';
    $('clock-guide').textContent = reading ? '① 시침·분침을 읽으세요' : '② 바늘 끝을 끌어 맞추세요';
    $('action').textContent = reading ? '③ 시각 전달하기' : '③ 수리 완료';
    $('controls-help').textContent = reading ? '기록계 숫자 입력 · 옆면 − / ＋ 미세 조정 · Enter 전달'
      : '바늘 끝 드래그 · 1 / 2 / 3 바늘 선택 · ← → 미세 조정 · Enter 확인';
    $('message').textContent = reading ? '손님의 요청을 읽고 시계 읽기 시작을 눌러 주세요. 아직 시간은 흐르지 않아요.'
      : '손님의 요청을 읽고 수리 시작을 눌러 주세요. 아직 시간은 흐르지 않아요.';
    this.showRemaining(customer.limit * 1000);
    this.refreshHud();
    this.updateGuide();
    this.openModal('request', retry ? '다시 한번 부탁할게!' : this.service.name,
      this.service.request, reading ? '시계 읽기 시작 →' : '수리 시작 →');
    $('modal-time-label').textContent = reading ? '이번 주문은 시계 읽기' : this.service.offset ? '기준 시각' : '맞춰야 할 시각';
    $('modal-time').textContent = reading ? '시 + 분' : this.service.memory ? '시작 후 10초 공개' : formatTime(this.request.reference);
    $('modal-instruction').textContent = this.service.hint;
    $('modal-meta').textContent = `주문 ${this.order + 1} / ${this.totalOrders} · 제한시간 ${customer.limit}초 · 시작 전에는 시간이 멈춰 있어요`;
  }
  beginOrder() {
    const customer = this.customer;
    this.phase = 'playing';
    this.deadline = this.time.now + customer.limit * 1000;
    this.startedAt = this.time.now;
    this.lastTick = 0;
    if (this.service.memory) $('target').textContent = formatTime(this.request.reference);
    this.setShopMood('working');
    $('message').textContent = `${this.service.hint} · 첫 제출에 성공하면 콤보가 이어져요!`;
    $('order-modal').close();
    $('answer-hour').disabled = !this.isReading();
    $('answer-minute').disabled = !this.isReading();
    this.updateGuide();
    $('action').focus({ preventScroll: true });
  }
  openModal(kind, title, message, button) {
    $('answer-hour').disabled = true;
    $('answer-minute').disabled = true;
    const customer = this.customer;
    const modal = $('order-modal');
    modal.dataset.kind = kind;
    $('modal-customer').textContent = customer.name;
    $('modal-icon').textContent = customer.icon;
    setPortrait($('modal-sprite'), customer.id, customer.name);
    $('modal-title').textContent = title;
    $('modal-message').textContent = message;
    $('modal-action').textContent = button;
    $('modal-time-block').hidden = kind !== 'request';
    $('modal-money').hidden = kind !== 'success' && kind !== 'won';
    $('modal-summary').hidden = kind !== 'won';
    $('modal-meta').textContent = `주문 ${this.order + 1} / ${this.totalOrders}`;
    if (!modal.open) modal.showModal();
    $('modal-action').focus({ preventScroll: true });
  }
  update() {
    if (this.phase !== 'playing') return;
    this.tickRunningClock();
    if (this.service.memory) {
      const memoryLeft = Math.max(0, this.service.memory - Math.floor((this.time.now - this.startedAt) / 1000));
      $('memory-countdown').textContent = memoryLeft ? `주문서 소멸까지 ${memoryLeft}초` : '주문서가 사라졌어요! 기억을 더듬어 보세요';
      if (!memoryLeft) $('target').textContent = '?? : ?? : ??';
    }
    const remaining = Math.max(0, this.deadline - this.time.now);
    this.showRemaining(remaining);
    if (remaining === 0) this.timeout();
  }
  tickRunningClock() {
    if (this.phase !== 'playing' || !this.service.ticking) return;
    const tick = Math.max(0, Math.floor((this.time.now - this.startedAt) / 1000));
    if (tick > this.lastTick) {
      this.current = adjustTime(this.current, 'second', tick - this.lastTick);
      this.lastTick = tick;
      this.refreshClock();
    }
  }
  showRemaining(remaining) {
    $('remaining').textContent = `${Math.ceil(remaining / 1000)}초`;
    const percentage = Math.max(0, Math.min(100, remaining / (this.customer.limit * 1000) * 100));
    $('time-fill').style.width = `${percentage}%`;
    $('timer-ring').style.background = `conic-gradient(${remaining < 5000 ? '#c2624d' : '#69a183'} ${percentage}%, #b9a67a 0)`;
    $('remaining').classList.toggle('urgent', remaining < 5000);
  }
  submit() {
    if (this.phase !== 'playing') return;
    this.tickRunningClock();
    const remaining = this.deadline - this.time.now;
    if (remaining <= 0) { this.timeout(); return; }
    const answer = this.isReading() ? readDigitalTime($('answer-hour').value, $('answer-minute').value) : this.current;
    if (!answer) {
      $('message').textContent = '시(1~12)와 분(0~59)을 모두 입력해 주세요. 입력 확인으로 시간은 차감되지 않아요.';
      return;
    }
    if (!matchesWithin(answer, this.target, this.service.ticking ? 1 : 0)) {
      this.deadline -= 3000;
      this.cleanOrder = false;
      this.combo = 0;
      this.refreshHud();
      $('message').textContent = this.isReading() ? '시계가 가리키는 시각과 달라요! 3초 차감 · 콤보가 끊겼어요. 시침과 분침을 다시 읽어 주세요.'
        : '주문 조건과 달라요! 3초 차감 · 콤보가 끊겼어요. 주문서의 조건을 다시 확인해 주세요.';
      this.cameras.main.shake(100, 0.003);
      this.update();
      return;
    }
    const reward = repairReward(this.order, remaining, this.time.now - this.startedAt, this.cleanOrder, this.combo, this.serviceIndex);
    this.combo = reward.combo;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.totalTips += reward.tip;
    this.score += reward.total;
    this.phase = this.order === this.totalOrders - 1 ? 'won' : 'success';
    this.updateGuide();
    if (this.phase === 'won') $('game-stage').dataset.shift = 'dawn';
    this.refreshHud();
    this.showRemaining(remaining);
    $('message').textContent = `${this.customer.name}: “${this.customer.thanks}”`;
    $('customer-story').textContent = this.customer.thanks;
    this.setShopMood(this.phase);
    const title = this.isReading() ? (reward.perfect ? '✦ 완벽하게 읽었어요!' : '✓ 시각 전달 완료!')
      : reward.perfect ? '✦ 완벽 수리!' : this.cleanOrder ? '✓ 한 번에 성공!' : '✓ 수리 완료!';
    this.openModal(this.phase, this.phase === 'won' ? '★ 새벽이 밝았어요! 모든 주문 완료!' : title,
      this.customer.thanks, this.phase === 'won' ? '새로운 하루 시작 ↻' : this.order === DAY_ORDER_COUNT - 1 ? '밤 영업으로 →' : '다음 주문 받기 →');
    $('modal-total').textContent = `+${reward.total.toLocaleString('ko-KR')}원`;
    $('modal-tip').textContent = `기본 수리비 ${(reward.total - reward.tip).toLocaleString('ko-KR')}원 + 팁 ${reward.tip.toLocaleString('ko-KR')}원${reward.special ? ' (특별 팁 포함)' : ''}`;
    $('modal-meta').textContent = `${title} · ${this.combo}콤보 · 누적 ${this.score.toLocaleString('ko-KR')}원`;
    if (this.phase === 'won') {
      $('modal-summary').textContent = `주문 ${this.totalOrders}건 완료! 총 수리비 ${this.score.toLocaleString('ko-KR')}원 · 받은 팁 ${this.totalTips.toLocaleString('ko-KR')}원 · 최고 ${this.bestCombo}콤보! 당신은 우리 가게의 명예 수리공이에요.`;
    }
  }
  timeout() {
    if (this.phase !== 'playing') return;
    this.cleanOrder = false;
    this.combo = 0;
    this.phase = 'retry';
    this.updateGuide();
    this.setShopMood(this.phase);
    this.showRemaining(0);
    this.refreshHud();
    $('message').textContent = '시간이 다 됐어요! 같은 손님의 시계를 다시 수리할 수 있어요.';
    this.openModal('retry', '조금만 더! 다시 해 볼까요?', $('message').textContent, '같은 주문 다시 받기 →');
    $('modal-meta').textContent = '재도전 횟수 제한 없음 · 같은 주문을 다시 받아도 첫 제출 보너스는 돌아오지 않아요';
  }
  refreshHud() {
    $('score').textContent = `${this.score.toLocaleString('ko-KR')}원`;
    $('lives').textContent = '재도전 ∞';
    $('combo').textContent = this.combo > 0 ? `✦ ${this.combo} COMBO` : '첫 제출 성공으로 콤보 시작!';
    $('combo').dataset.active = String(this.combo > 0);
  }
}

document.fonts.ready.then(() => new Phaser.Game({
  type: Phaser.AUTO, parent: 'clock', width: 660, height: 700,
  transparent: true, scene: ClockShop,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true },
}));
