export const TOTAL_STAGES = 5;
export const unlocks = [
  { round: 2, name: '가려다가 말기' },
  { round: 2, name: '엇박 이동' },
  { round: 3, name: '연속 섞기' },
  { round: 3, name: '지나가는 방해물' },
  { round: 4, name: '회전 섞기' },
  { round: 5, name: '360도 회전 이동' },
];
export const hellUnlocks = [
  { round: 1, name: '기존 모든 방해요소' },
  { round: 1, name: '3인 동시 이동' },
  { round: 2, name: '움직이는 분신' },
  { round: 3, name: '교환 되감기' },
  { round: 4, name: '경로 반전' },
  { round: 5, name: '트릭 총공세' },
];

export function difficulty(round, hell = false) {
  const stage = Math.max(1, Math.min(TOTAL_STAGES, round));
  const settings = [
    { duration: 800, count: 5, gap: 110 },
    { duration: 600, count: 8, gap: 80 },
    { duration: 450, count: 12, gap: 55 },
    { duration: 320, count: 16, gap: 35 },
    { duration: 230, count: 20, gap: 25 },
  ];
  const hellSettings = [
    { duration: 220, count: 24, gap: 20 },
    { duration: 200, count: 28, gap: 18 },
    { duration: 180, count: 32, gap: 15 },
    { duration: 165, count: 36, gap: 12 },
    { duration: 150, count: 40, gap: 10 },
  ];
  const rules = hell ? hellUnlocks : unlocks;
  const additions = rules.filter(item => stage === item.round);
  return {
    ...(hell ? hellSettings : settings)[stage - 1],
    active: rules.filter(item => stage >= item.round),
    unlocked: additions.length ? { name: additions.map(item => item.name).join(' · ') } : null,
  };
}

// Guaranteed introductory events, with extra variations as the rounds progress.
export function shufflePattern(round, step, count, random = Math.random, hell = false) {
  const chainRound = hell ? 1 : 3;
  const spinRound = hell ? 1 : 4;
  const twirlRound = hell ? 1 : 5;
  const showcase = hell && ((round >= 2 && step === 7) || (round >= 3 && step === 8) || (round >= 4 && step === 11));
  const relay = hell && !showcase && (step === 2 || (step > 8 && random() < (round === 5 ? .2 : .11)));
  const spin = !relay && !showcase && round >= spinRound && (step === 5 || (step > 5 && random() < (hell ? .16 : .12)));
  const rewind = hell && round >= 3 && !relay && !spin && step !== 11 && (step === 8 || (step > 8 && random() < (round === 5 ? .2 : .12)));
  const swerve = hell && round >= 4 && !relay && !spin && !rewind && (step === 11 || (step > 11 && random() < (round === 5 ? .24 : .15)));
  const decoy = hell && round >= 2 && !relay && !spin && (step === 7 || (step > 7 && random() < (round === 5 ? .28 : .18)));
  const chainIntro = round >= chainRound && step === (hell ? 4 : 3);
  const feint = !relay && !spin && !rewind && !swerve && !chainIntro && round >= (hell ? 1 : 2) && (step === 1 || random() < (hell ? .32 : .22));
  return {
    relay,
    decoy,
    rewind,
    swerve,
    spin,
    twirl: !relay && !spin && !rewind && !swerve && round >= twirlRound && (step === (hell ? 6 : 4) || random() < (hell ? .23 : .25)),
    feint,
    offbeat: round >= (hell ? 1 : 2) && (step === (hell ? 3 : 2) || random() < (hell ? .52 : .4)),
    chain: !relay && !spin && !rewind && !feint && round >= chainRound && (chainIntro || random() < (hell ? .33 : .3)),
    obstacle: obstacleAt(round, step, count, hell),
    reverse: random() < 0.5,
  };
}

export function obstacleAt(round, step, count, hell = false) {
  if (round < (hell ? 1 : 3)) return null;
  const points = hell ? [3, Math.floor(count / 4), Math.floor(count / 2), Math.floor(count * 3 / 4), count - 3] : [2, Math.floor(count / 2), count - 4];
  const event = points.indexOf(step);
  if (event < 0) return null;
  // Every eligible round includes all three; the order changes between rounds.
  return ['bird', 'cloud', 'dog'][(event + round - (hell ? 1 : 3)) % 3];
}

export function swerveProgress(elapsed, duration) {
  const t = Math.max(0, Math.min(1, elapsed / duration));
  if (t < .4) return t / .4 * .7;
  if (t < .62) return .7 - (t - .4) / .22 * .42;
  return .28 + (t - .62) / .38 * .72;
}

export function dogRise(progress) {
  const t = Math.max(0, Math.min(1, progress));
  const amount = t < 0.25 ? t / 0.25 : t > 0.7 ? (1 - t) / 0.3 : 1;
  return (1 - Math.cos(amount * Math.PI)) / 2;
}

export function spinPosition(slot, progress, reverse = false) {
  const angles = [Math.PI * 5 / 6, Math.PI * 3 / 2, Math.PI / 6];
  const angle = angles[slot] + (reverse ? -1 : 1) * Math.PI * 8 / 3 * progress;
  return { x: 480 + Math.cos(angle) * (480 / Math.sqrt(3)), y: 342 + Math.sin(angle) * 68 };
}

export function spinDestination(slot, reverse = false) {
  return (slot + (reverse ? 2 : 1)) % 3;
}

export function pathProgress(elapsed, duration, feint = false) {
  const t = Math.max(0, Math.min(1, elapsed / duration));
  // A feint approaches the midpoint then returns to its own slot.
  return feint ? Math.sin(Math.PI * t) * 0.42 : (1 - Math.cos(Math.PI * t)) / 2;
}
