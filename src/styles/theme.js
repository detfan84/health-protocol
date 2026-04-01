export function getTheme(dark, phaseMeta) {
  const pm = phaseMeta;
  const pc = dark ? pm.dk : pm.color;
  const pa = dark ? pm.dka : pm.accent;

  return {
    // Phase colors
    pc,
    pa,
    // Backgrounds
    bg: dark ? '#121212' : '#faf9f7',
    cardBg: dark ? '#1e1e1e' : 'white',
    cardBd: dark ? '#333' : '#ece8e3',
    faint: dark ? '#2a2a2a' : '#f5f2ed',
    inputBg: dark ? '#252525' : '#faf9f7',
    // Text
    fg: dark ? '#e0e0e0' : '#1a1a1a',
    sub: dark ? '#888' : '#999',
    // Mode
    dark,
  };
}
