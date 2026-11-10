export const DAY_ORDER_COUNT = 10;
export const customers = [
  { id: 25, icon: '⚡', name: '피카츄', thanks: '피카피카! 숫자로 적으니까 몇 시인지 딱 알겠어!', limit: 35 },
  { id: 133, icon: '🦊', name: '이브이', story: '친구들과 소풍을 가기로 했어. 출발 시각에 맞춰 주세요!', thanks: '고마워! 친구들과 함께 소풍을 갈 수 있겠어!', limit: 32 },
  { id: 143, icon: '💤', name: '잠만보', story: '간식 시간에 깨워 주는 알람이 고장 났어… 초침도 부탁해…', thanks: '이제 간식을 놓치지 않겠어… 고마워… 쿨쿨…', limit: 40 },
  { id: 300, icon: '🐈', name: '에나비', story: '오늘은 무대에 서는 날이야! 공연 시작 시각을 정확하게 맞춰 줘!', thanks: '냐옹! 이제 자신 있게 무대에 올라갈 수 있어!', limit: 25 },
  { id: 251, icon: '🌿', name: '세레비', story: '내가 돌아가야 할 시각이야. 마지막 1초까지 꼭 맞춰 줘!', thanks: '네 덕분에 돌아갈 수 있게 됐어. 우리, 다른 시간에 또 만나!', limit: 22 },
  { id: 225, icon: '🎁', name: '딜리버드', thanks: '덕분에 선물을 제시간에 배달하겠어! 너에게도 고마움 한 꾸러미!', limit: 35 },
  { id: 131, icon: '🌊', name: '라프라스', thanks: '이제 손님들을 여유롭게 태울 수 있겠어. 다음에 바다로 놀러 와!', limit: 32 },
  { id: 54, icon: '🦆', name: '고라파덕', thanks: '고라… 이제 약 먹을 시간을 안 잊겠어! 머리도 조금 가벼워진 것 같아.', limit: 40 },
  { id: 39, icon: '🎤', name: '푸린', thanks: '푸푸린~ 공연 준비 끝! 너를 위해 특별한 노래를 불러 줄게!', limit: 25 },
  { id: 385, icon: '⭐', name: '지라치', thanks: '별똥별을 놓치지 않겠어! 네 소원도 반짝반짝 이루어지길!', limit: 22 },
  { id: 92, icon: '👻', name: '고오스', thanks: '흐흐… 종이는 사라져도 기억은 남는구나.', limit: 40 },
  { id: 93, icon: '🌒', name: '고우스트', thanks: '키히히! 거꾸로 가는 톱니도 길들였네!', limit: 40 },
  { id: 479, icon: '⚡', name: '로토무', thanks: '찌릿! 살아 있는 시계도 네 손에는 얌전해지는걸!', limit: 35 },
  { id: 354, icon: '🧵', name: '다크펫', thanks: '실이 풀렸어… 이제 내 시계도 다시 움직일 수 있어.', limit: 40 },
  { id: 94, icon: '😈', name: '팬텀', thanks: '크크… 벌써 해가 뜨네. 오늘 밤은 네가 이겼어!', limit: 35 },
];

export const wrap = (value, max) => ((value % max) + max) % max;
export function formatTime(time) {
  return [time.hour || 12, time.minute, time.second].map(value => String(value).padStart(2, '0')).join(' : ');
}
export function handAngles(time) {
  return { hour: time.hour * 30 + time.minute * 0.5 + time.second / 120,
    minute: time.minute * 6 + time.second * 0.1, second: time.second * 6 };
}
export function valueFromAngle(hand, angle, time) {
  if (hand === 'hour') return wrap(Math.round((angle - time.minute * 0.5 - time.second / 120) / 30), 12);
  if (hand === 'minute') return wrap(Math.round((angle - time.second * 0.1) / 6), 60);
  return wrap(Math.round(angle / 6), 60);
}
export function adjustTime(time, hand, amount) {
  const unit = { hour: 3600, minute: 60, second: 1 }[hand];
  const total = wrap(time.hour * 3600 + time.minute * 60 + time.second + amount * unit, 12 * 3600);
  return { hour: Math.floor(total / 3600), minute: Math.floor(total / 60) % 60, second: total % 60 };
}
export function moveHandToAngle(time, hand, angle) {
  const steps = hand === 'hour' ? 12 : 60;
  const next = valueFromAngle(hand, angle, time);
  // Use the short signed movement between successive pointer positions so
  // crossing 12 o'clock carries forward (or borrows backward) instead of resetting.
  const delta = wrap(next - time[hand] + steps / 2, steps) - steps / 2;
  return adjustTime(time, hand, delta);
}
export function matches(a, b) { return a.hour === b.hour && a.minute === b.minute && a.second === b.second; }
export function newTarget(order, random = Math.random) {
  return { hour: Math.floor(random() * 12),
    minute: order === 0 ? Math.floor(random() * 12) * 5 : Math.floor(random() * 60),
    second: order < 2 ? 0 : order === 2 ? Math.floor(random() * 12) * 5 : Math.floor(random() * 60) };
}

export const services = [
  { name: '⚡ 시계 읽기', mode: 'read', offset: 0, quickTip: 12, hint: '시침·분침을 읽어 숫자로 입력 · 12초 이내 첫 성공 시 팁 +150원', request: '바늘 시계가 조금 헷갈려! 시계에 보이는 시와 분을 숫자로 적어 줄래? 초는 안 적어도 돼!' },
  { name: '🧺 소풍 준비', offset: 10, hint: '표시된 기준 시각보다 10분 뒤로', request: '소풍 출발이 늦춰졌어. 아래 시각보다 10분 뒤로 맞춰 줄래?' },
  { name: '💤 느긋한 알람', offset: 0, hint: '제한시간 40초 · 초침까지 천천히', request: '서두르지 않아도 돼… 아래 간식 시각에 맞춰 줘. 40초 동안 기다릴게…' },
  { name: '🎵 공연 전 점검', offset: 0, firstTryTip: true, hint: '재도전 없이 첫 제출 성공 → 팁 +150원', request: '곧 공연이야! 한 번에 정확하게 맞춰 주면 특별한 팁을 줄게!' },
  { name: '✦ 시간 여행', offset: -20, hint: '표시된 기준 시각보다 20분 전으로', request: '시간의 문이 열렸어! 아래 시각보다 20분 전으로 돌려 줘!' },
  { name: '🎁 선물 특급 배달', offset: 0, quickTip: 12, hint: '12초 안에 첫 제출 성공 → 팁 +150원', request: '선물 배달 시간이 다가와! 표시된 배달 시각에 시계를 맞춰 줘. 12초 안에 끝내면 특별한 팁도 줄게!' },
  { name: '🌊 바다 여행', offset: -10, hint: '표시된 기준 시각보다 10분 전으로', request: '바다 여행 손님들을 태워야 해. 표시된 출발 시각보다 10분 전에 알람이 울리도록 맞춰 줄래?' },
  { name: '🦆 깜빡한 약속', offset: 0, hint: '제한시간 40초 · 초침까지 천천히', request: '고라… 머리가 아파서 약 먹을 시간을 자꾸 잊어. 표시된 시각에 맞춰 줄래? 40초 동안 천천히 기다릴게.' },
  { name: '🎤 달빛 콘서트', offset: 0, firstTryTip: true, hint: '재도전 없이 첫 제출 성공 → 팁 +150원', request: '달빛 아래에서 노래할 거야! 표시된 공연 시각에 한 번에 정확하게 맞춰 줘. 팁도 준비했어!' },
  { name: '⭐ 별똥별의 소원', offset: 20, hint: '표시된 기준 시각보다 20분 뒤로', request: '별똥별이 표시된 시각에서 20분 뒤에 떨어진대! 소원을 빌 수 있도록 그 시각에 맞춰 줘.' },
  { name: '👻 사라지는 주문서', offset: 0, memory: 10, hint: '시작 후 10초 동안만 시각 표시 · 총 40초', request: '이 주문서는 10초 뒤에 사라져. 시·분·초를 기억해서 내 시계를 맞춰 봐… 시작 버튼을 누르면 보여 줄게.' },
  { name: '🌒 뒤집힌 톱니', offset: 0, reverse: true, hint: '드래그와 방향키가 반대로 작동해요', request: '오른쪽으로 돌리면 왼쪽으로! 모든 바늘의 톱니를 거꾸로 끼웠어. 반대 방향으로 움직여 주문 시각에 맞춰 줘.' },
  { name: '⚡ 살아 있는 시계', offset: 0, ticking: true, hint: '조정 중에도 1초씩 진행 · 제출 오차 ±1초 허용', request: '내가 시계에 들어왔어! 조정하는 동안에도 초침은 계속 갈 거야. 주문 시각 근처에서 완료를 눌러! 앞뒤 1초까지는 인정할게.' },
  { name: '🧵 묶여 버린 바늘', offset: 0, onlyHand: 'minute', hint: '분침만 조정 가능 · 한 바퀴 돌면 시침도 이동', request: '시침과 초침이 실에 묶였어… 분침만 움직일 수 있어. 분침을 돌려서 시침까지 맞춰 줘. 한 바퀴 정도면 풀릴 거야.' },
  { name: '😈 마지막 장난', offset: 0, memory: 10, reverse: true, hint: '10초 뒤 주문서 소멸 + 모든 조작 역방향', request: '마지막 문제다! 시각은 10초 뒤에 사라지고 바늘은 반대로 움직여. 기억과 손끝만으로 맞춰 봐. 성공하면 새벽을 돌려주지!' },
];

export function newOrder(order, random = Math.random) {
  const reference = newTarget(order < DAY_ORDER_COUNT ? order % 5 : 4, random);
  if (services[order].onlyHand) { reference.second = 0; reference.minute = Math.floor(random() * 21); }
  return { reference, target: adjustTime(reference, 'minute', services[order].offset) };
}

export function initialTime(order, target, random = Math.random) {
  if (services[order].mode === 'read') return { ...target };
  if (services[order].onlyHand) return adjustTime(target, 'minute', -(45 + Math.floor(random() * 16)));
  const time = newTarget(4, random);
  return matches(time, target) ? adjustTime(time, 'second', 1) : time;
}

export const signedAngleDelta = (from, to) => wrap(to - from + 180, 360) - 180;
export function matchesWithin(a, b, tolerance = 0) {
  const total = t => t.hour * 3600 + t.minute * 60 + t.second;
  const difference = wrap(total(a) - total(b), 43200);
  return Math.min(difference, 43200 - difference) <= tolerance;
}

export function readDigitalTime(hourText, minuteText) {
  if (![hourText, minuteText].every(value => /^\d{1,2}$/.test(value))) return null;
  const hour = Number(hourText), minute = Number(minuteText);
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  return { hour: hour % 12, minute, second: 0 };
}

export function repairReward(order, remaining, elapsed, clean, combo) {
  const nextCombo = clean ? combo + 1 : 0;
  const perfect = clean && elapsed <= customers[order].limit * 500;
  const service = services[order];
  const special = clean && ((service.quickTip && elapsed <= service.quickTip * 1000) || service.firstTryTip) ? 150 : 0;
  const tip = nextCombo * 50 + (perfect ? 100 : 0) + special;
  const base = (order + 1) * 100 + Math.ceil(remaining / 1000) * 10;
  return { combo: nextCombo, perfect, special, tip, total: base + tip };
}
