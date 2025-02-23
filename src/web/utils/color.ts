export function colorizePercent(percent: number): string {
  return `hsl(${Math.max(Math.min(percent, 100), 0)},55%,40%)`;
}

export function hexToRgb(_hex: string) {
  const hex = _hex.replace(/^#/, "");

  const rgb = {
    r: Number.parseInt(hex.substring(0, 2), 16),
    g: Number.parseInt(hex.substring(2, 4), 16),
    b: Number.parseInt(hex.substring(4, 6), 16)
  };

  return rgb;
}

export function calculateLuminance(rgb: { r: number; g: number; b: number }) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const rLinear = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4;
  const gLinear = g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4;
  const bLinear = b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4;

  const luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;

  return luminance;
}

export function getTextColor(backgroundColor: string) {
  return calculateLuminance(hexToRgb(backgroundColor)) >= 0.5 ? "#000" : "#fff";
}
