const portraits = {
  163: new URL('../assets/163.png', import.meta.url).href,
  599: new URL('../assets/klink-owner.png', import.meta.url).href,
  25: new URL('../assets/25.png', import.meta.url).href,
  133: new URL('../assets/133.png', import.meta.url).href,
  143: new URL('../assets/143.png', import.meta.url).href,
  300: new URL('../assets/300.png', import.meta.url).href,
  251: new URL('../assets/251.png', import.meta.url).href,
  225: new URL('../assets/225.png', import.meta.url).href,
  131: new URL('../assets/131.png', import.meta.url).href,
  54: new URL('../assets/54.png', import.meta.url).href,
  39: new URL('../assets/39.png', import.meta.url).href,
  385: new URL('../assets/385.png', import.meta.url).href,
  92: new URL('../assets/92.png', import.meta.url).href,
  93: new URL('../assets/93.png', import.meta.url).href,
  479: new URL('../assets/479.png', import.meta.url).href,
  354: new URL('../assets/354.png', import.meta.url).href,
  94: new URL('../assets/94.png', import.meta.url).href,
};

export const spriteUrl = id => `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${id}.png`;
export const portraitUrl = id => portraits[id];

// Independent transparent artwork scales with its responsive portrait container.
export function setPortrait(image, id, name) {
  Object.assign(image.style, {
    width: '100%', height: '100%', left: '0', top: '0', objectFit: 'contain',
  });
  image.alt = name;
  const fallback = image.previousElementSibling;
  if (fallback) fallback.hidden = false;
  image.hidden = false;
  image.onerror = () => { image.hidden = true; if (fallback) fallback.hidden = false; };
  image.onload = () => { image.hidden = false; if (fallback) fallback.hidden = true; };
  image.src = portraitUrl(id);
}
