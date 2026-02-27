/**
 * Color Utilities
 *
 * Helpers for color manipulation, gradients, and OKLCH color space operations.
 * Supports dynamic color effects in beam, glow, and gradient components.
 */

// =============================================================================
// Types
// =============================================================================

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface OKLCH {
  l: number;
  c: number;
  h: number;
}

export interface RGBA extends RGB {
  a: number;
}

// =============================================================================
// Color Parsing
// =============================================================================

/**
 * Parse a hex color to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Parse an HSL string to HSL object
 */
export function parseHsl(hsl: string): HSL | null {
  const match = hsl.match(/hsl\(\s*(\d+)\s+(\d+)%\s+(\d+)%\s*\)/);
  if (!match) return null;
  return {
    h: parseInt(match[1], 10),
    s: parseInt(match[2], 10),
    l: parseInt(match[3], 10),
  };
}

/**
 * Convert HSL to CSS string
 */
export function hslToString(hsl: HSL): string {
  return `hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)`;
}

/**
 * Parse an OKLCH string to OKLCH object
 */
export function parseOklch(oklch: string): OKLCH | null {
  const match = oklch.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!match) return null;
  return {
    l: parseFloat(match[1]),
    c: parseFloat(match[2]),
    h: parseFloat(match[3]),
  };
}

/**
 * Convert OKLCH to CSS string
 */
export function oklchToString(oklch: OKLCH): string {
  return `oklch(${oklch.l} ${oklch.c} ${oklch.h})`;
}

// =============================================================================
// Color Conversion
// =============================================================================

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// =============================================================================
// Color Manipulation
// =============================================================================

/**
 * Lighten a color by a percentage
 */
export function lighten(hsl: HSL, amount: number): HSL {
  return {
    ...hsl,
    l: Math.min(100, hsl.l + amount),
  };
}

/**
 * Darken a color by a percentage
 */
export function darken(hsl: HSL, amount: number): HSL {
  return {
    ...hsl,
    l: Math.max(0, hsl.l - amount),
  };
}

/**
 * Saturate a color by a percentage
 */
export function saturate(hsl: HSL, amount: number): HSL {
  return {
    ...hsl,
    s: Math.min(100, hsl.s + amount),
  };
}

/**
 * Desaturate a color by a percentage
 */
export function desaturate(hsl: HSL, amount: number): HSL {
  return {
    ...hsl,
    s: Math.max(0, hsl.s - amount),
  };
}

/**
 * Shift hue by degrees
 */
export function shiftHue(hsl: HSL, degrees: number): HSL {
  return {
    ...hsl,
    h: (hsl.h + degrees + 360) % 360,
  };
}

/**
 * Get complementary color
 */
export function complementary(hsl: HSL): HSL {
  return shiftHue(hsl, 180);
}

/**
 * Interpolate between two colors
 */
export function interpolateColor(from: HSL, to: HSL, t: number): HSL {
  // Handle hue interpolation (shortest path)
  let hDiff = to.h - from.h;
  if (Math.abs(hDiff) > 180) {
    hDiff = hDiff > 0 ? hDiff - 360 : hDiff + 360;
  }

  return {
    h: (from.h + hDiff * t + 360) % 360,
    s: from.s + (to.s - from.s) * t,
    l: from.l + (to.l - from.l) * t,
  };
}

// =============================================================================
// Gradient Generation
// =============================================================================

/**
 * Generate a linear gradient CSS string
 */
export function linearGradient(angle: number, ...colors: string[]): string {
  return `linear-gradient(${angle}deg, ${colors.join(", ")})`;
}

/**
 * Generate a radial gradient CSS string
 */
export function radialGradient(
  shape: "circle" | "ellipse",
  ...colors: string[]
): string {
  return `radial-gradient(${shape}, ${colors.join(", ")})`;
}

/**
 * Generate a conic gradient CSS string
 */
export function conicGradient(fromAngle: number, ...colors: string[]): string {
  return `conic-gradient(from ${fromAngle}deg, ${colors.join(", ")})`;
}

/**
 * Generate rainbow gradient colors
 */
export function getRainbowColors(count: number = 5): HSL[] {
  const colors: HSL[] = [];
  for (let i = 0; i < count; i++) {
    colors.push({
      h: (i * 360) / count,
      s: 100,
      l: 63,
    });
  }
  return colors;
}

/**
 * Generate a gradient from theme CSS variables
 */
export function getThemeGradient(
  startVar: string,
  endVar: string,
  angle: number = 135,
): string {
  return `linear-gradient(${angle}deg, var(${startVar}), var(${endVar}))`;
}

// =============================================================================
// Color Utilities
// =============================================================================

/**
 * Get a CSS variable value
 */
export function getCssVariable(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Set a CSS variable
 */
export function setCssVariable(name: string, value: string): void {
  if (typeof window === "undefined") return;
  document.documentElement.style.setProperty(name, value);
}

/**
 * Generate a random color
 */
export function randomColor(): HSL {
  return {
    h: Math.floor(Math.random() * 360),
    s: 70 + Math.floor(Math.random() * 30),
    l: 50 + Math.floor(Math.random() * 20),
  };
}

/**
 * Check if a color is light or dark
 */
export function isLightColor(hsl: HSL): boolean {
  return hsl.l > 50;
}

/**
 * Get contrasting text color (black or white)
 */
export function getContrastColor(hsl: HSL): "black" | "white" {
  return isLightColor(hsl) ? "black" : "white";
}

/**
 * Add alpha to a color string
 */
export function withAlpha(color: string, alpha: number): string {
  // Handle hex
  if (color.startsWith("#")) {
    const rgb = hexToRgb(color);
    if (rgb) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
  }

  // Handle hsl
  if (color.startsWith("hsl(")) {
    return color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
  }

  // Handle oklch
  if (color.startsWith("oklch(")) {
    return color.replace(")", ` / ${alpha})`);
  }

  return color;
}
