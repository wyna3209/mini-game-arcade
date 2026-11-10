// Keep the face geometry and hand colors consistent so decoration never changes the puzzle.
export const clockThemes = {
  92: { name: '안개의 기억', shape: 'pearl', motif: 'moon', body: 0x584775, rim: 0x9d87ba, light: 0xe7d8ff, face: 0xf3edff, ink: 0x47385c, accent: 0x8e6eae },
  93: { name: '거꾸로 가는 밤', shape: 'petal', motif: 'star', body: 0x514477, rim: 0x9b8bc4, light: 0xe5d6ff, face: 0xf1efff, ink: 0x42355c, accent: 0x8d6ab3 },
  479: { name: '찌릿찌릿 시계', shape: 'round', motif: 'bolt', body: 0xb9663c, rim: 0x7ecbd3, light: 0xd8fcf5, face: 0xf1fcfb, ink: 0x354f61, accent: 0xc77842 },
  354: { name: '봉인된 시계', shape: 'cushion', motif: 'ribbon', body: 0x504b5c, rim: 0xb39a73, light: 0xf1dcac, face: 0xf7f0e5, ink: 0x47404f, accent: 0x9b735c },
  94: { name: '새벽을 삼킨 시계', shape: 'stars', motif: 'moon', body: 0x44325c, rim: 0xab7fba, light: 0xf7c9e5, face: 0xf7edfa, ink: 0x483253, accent: 0xa6669c },
  25: { name: '번개 시계', shape: 'round', motif: 'bolt', body: 0xc9982c, rim: 0xf5ce61, light: 0xffe9a3, face: 0xfff8df, ink: 0x574420, accent: 0xb85e35 },
  133: { name: '숲속 나무 시계', shape: 'cushion', motif: 'leaf', body: 0x785039, rim: 0xc99a6b, light: 0xf2d2a4, face: 0xfff4e3, ink: 0x594334, accent: 0x8a6945 },
  143: { name: '낮잠 시계', shape: 'cushion', motif: 'moon', body: 0x315b60, rim: 0x749a91, light: 0xd8e5c3, face: 0xf6f6df, ink: 0x354e4c, accent: 0x6a8c78 },
  300: { name: '꽃잎 시계', shape: 'petal', motif: 'flower', body: 0xaa6181, rim: 0xe2a0b8, light: 0xffd9e5, face: 0xfff2f5, ink: 0x704456, accent: 0xc37193 },
  251: { name: '숲의 시간', shape: 'petal', motif: 'leaf', body: 0x4e8050, rim: 0xa1c77a, light: 0xe3edb5, face: 0xf4f9e7, ink: 0x3c5635, accent: 0x6c9b53 },
  225: { name: '선물 시계', shape: 'round', motif: 'ribbon', body: 0x9f4240, rim: 0xd98677, light: 0xffd8bc, face: 0xfff7ef, ink: 0x6b4037, accent: 0xba5145 },
  131: { name: '푸른 조개 시계', shape: 'shell', motif: 'wave', body: 0x407d96, rim: 0x94c9d5, light: 0xdff7ed, face: 0xf0fbfa, ink: 0x305567, accent: 0x5599b3 },
  54: { name: '물방울 시계', shape: 'cushion', motif: 'drop', body: 0xc99737, rim: 0xf2cc74, light: 0xffedb6, face: 0xfff9e7, ink: 0x665029, accent: 0x619cab },
  39: { name: '멜로디 시계', shape: 'pearl', motif: 'note', body: 0xa86e96, rim: 0xe8b5cc, light: 0xffe4f1, face: 0xfff4fb, ink: 0x68475f, accent: 0xb17aa7 },
  385: { name: '별빛 시계', shape: 'stars', motif: 'star', body: 0x3b5379, rim: 0xbda96c, light: 0xffe5a1, face: 0xf1f4ff, ink: 0x364564, accent: 0xb39143 },
};

const shade = (color, factor) => {
  const channel = shift => Math.round(((color >> shift) & 255) * factor);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};
export const colorHex = color => `#${color.toString(16).padStart(6, '0')}`;

function star(g, x, y, radius, color) {
  const points = Array.from({ length: 10 }, (_, index) => {
    const angle = index * Math.PI / 5 - Math.PI / 2;
    const r = index % 2 ? radius * .45 : radius;
    return { x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r };
  });
  g.fillStyle(color).fillPoints(points, true);
}

function emblem(g, theme) {
  const x = 330, y = 372, color = theme.accent;
  g.fillStyle(color, .65).lineStyle(3, color, .65);
  switch (theme.motif) {
    case 'bolt':
      g.fillPoints([{x:x+3,y:y-18},{x:x-12,y:y+1},{x:x-2,y:y+1},{x:x-7,y:y+18},{x:x+13,y:y-5},{x:x+3,y:y-5}], true);
      break;
    case 'leaf':
      g.fillEllipse(x-7, y-2, 15, 24).fillEllipse(x+7, y+2, 15, 24);
      g.lineBetween(x, y+17, x, y-13);
      break;
    case 'moon':
      g.fillCircle(x, y, 15);
      g.fillStyle(theme.face).fillCircle(x+7, y-5, 13);
      break;
    case 'flower':
      for (let i = 0; i < 5; i++) g.fillCircle(x+Math.sin(i*Math.PI*2/5)*10, y-Math.cos(i*Math.PI*2/5)*10, 7);
      g.fillStyle(theme.light).fillCircle(x, y, 5);
      break;
    case 'ribbon':
      g.fillTriangle(x-2,y,x-20,y-12,x-20,y+12).fillTriangle(x+2,y,x+20,y-12,x+20,y+12);
      g.fillCircle(x,y,5);
      break;
    case 'wave':
      for (let row = 0; row < 2; row++) {
        g.beginPath().moveTo(x-25,y+row*10);
        for (let n = 1; n <= 50; n++) g.lineTo(x-25+n,y+row*10+Math.sin(n*Math.PI/25)*4);
        g.strokePath();
      }
      break;
    case 'drop':
      g.fillTriangle(x,y-19,x-11,y+2,x+11,y+2).fillCircle(x,y+4,11);
      break;
    case 'note':
      g.fillEllipse(x-8,y+9,13,9).fillEllipse(x+11,y+3,13,9);
      g.lineBetween(x-2,y+7,x-2,y-13).lineBetween(x+17,y+1,x+17,y-19).lineBetween(x-2,y-13,x+17,y-19);
      break;
    case 'star': star(g,x,y,18,color); break;
  }
}

export function paintClockFace(g, theme) {
  g.clear();
  const dark = shade(theme.body, .55);
  g.fillStyle(0x24190f,.25).fillEllipse(330,657,440,42);
  g.fillStyle(dark).fillRoundedRect(182,564,296,74,22);
  g.fillStyle(theme.body).fillRoundedRect(166,612,328,30,12);
  g.fillStyle(theme.light).fillRoundedRect(174,613,312,7,3);
  g.fillStyle(0x352416,.3).fillCircle(334,327,293);

  if (theme.shape === 'cushion') {
    g.fillStyle(dark).fillRoundedRect(35,20,590,590,110);
    g.fillStyle(theme.body).fillRoundedRect(40,22,580,580,106);
    g.lineStyle(4,theme.rim).strokeRoundedRect(47,29,566,566,100);
  } else if (theme.shape === 'petal' || theme.shape === 'shell') {
    const count = theme.shape === 'shell' ? 18 : 12;
    for (let i = 0; i < count; i++) {
      const angle = (i+.5)*Math.PI*2/count;
      const x=330+Math.sin(angle)*278, y=315-Math.cos(angle)*278;
      g.fillStyle(dark).fillCircle(x,y+3,26);
      g.fillStyle(theme.body).fillCircle(x,y,24);
      g.lineStyle(2,theme.light,.7).strokeCircle(x,y,20);
    }
  }

  g.fillStyle(dark).fillCircle(330,315,291);
  g.fillStyle(theme.light).fillCircle(330,312,286);
  g.fillStyle(theme.body).fillCircle(330,316,280);
  g.lineStyle(3,theme.rim).strokeCircle(330,313,274);
  g.fillStyle(dark).fillCircle(330,315,267);
  g.fillStyle(theme.rim).fillCircle(330,312,262);
  g.fillStyle(theme.face).fillCircle(330,315,255);
  g.lineStyle(1,theme.accent,.35).strokeCircle(330,315,248);
  g.lineStyle(1,theme.accent,.18).strokeCircle(330,315,191);

  for (let i = 0; i < 12; i++) {
    const angle = (i+.5)*Math.PI/6;
    const x=330+Math.sin(angle)*277, y=315-Math.cos(angle)*277;
    if (theme.shape === 'stars') star(g,x,y,7,theme.light);
    else if (theme.shape === 'pearl') g.fillStyle(theme.light).fillCircle(x,y,5);
    else g.fillStyle(theme.rim,.9).fillCircle(x,y,2.5);
  }
  for (let tick = 0; tick < 60; tick++) {
    const angle = tick*Math.PI/30, radius = tick%5 ? 235 : 229;
    g.lineStyle(tick%5 ? 1.5 : 4,theme.ink,tick%5 ? .5 : .85);
    g.lineBetween(330+Math.sin(angle)*radius,315-Math.cos(angle)*radius,
      330+Math.sin(angle)*243,315-Math.cos(angle)*243);
  }
  emblem(g,theme);
}
