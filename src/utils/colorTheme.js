function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1; if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// Generate the full brand 50–900 scale from a primary hex (= brand-600).
// Returns { 50: [r,g,b], 100: ..., ... } — RGB arrays for CSS variable injection.
export function generateScale(primaryHex) {
  const [h, s, l] = hexToHsl(primaryHex);
  const make = (sl, ll) => hslToRgb(h, clamp(sl, 0, 100), clamp(ll, 2, 97));
  return {
    50:  make(clamp(s * 0.35, 8, 45), 96),
    100: make(clamp(s * 0.50, 12, 60), 91),
    200: make(clamp(s * 0.65, 18, 75), 81),
    300: make(clamp(s * 0.80, 25, 88), 68),
    400: make(s, 57),
    500: make(s, clamp(l + 6, l, 52)),
    600: hexToRgb(primaryHex),
    700: make(s, clamp(l - 10, 12, l)),
    800: make(s * 0.92, clamp(l - 20, 6, l - 8)),
    900: make(s * 0.80, clamp(l - 28, 3, l - 16)),
  };
}

// Inject (or update) a <style id="org-theme"> with CSS variables for every
// brand shade. Passing null/undefined removes the tag → falls back to defaults.
export function applyTheme(primaryHex) {
  const existing = document.getElementById('org-theme');
  if (!primaryHex) { if (existing) existing.remove(); return; }

  const scale = generateScale(primaryHex);
  const vars = Object.entries(scale)
    .map(([shade, [r, g, b]]) => `  --brand-${shade}: ${r} ${g} ${b};`)
    .join('\n');
  const css = `:root {\n${vars}\n}`;

  if (existing) { existing.textContent = css; }
  else {
    const el = document.createElement('style');
    el.id = 'org-theme';
    el.textContent = css;
    document.head.appendChild(el);
  }
}

// Convert a scale entry back to a CSS hex string (for previews).
export function scaleToHex(rgb) {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}
