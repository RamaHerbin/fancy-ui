/**
 * Utilities barrel export
 */

// Re-export existing utilities from parent
export { cn } from "../utils.js";
export type {
  WithoutChild,
  WithoutChildren,
  WithoutChildrenOrChild,
  WithElementRef,
} from "../utils.js";

// Animation utilities
export {
  // Types
  type SpringConfig,
  type AnimationOptions,
  // Spring presets
  springPresets,
  // Easing functions
  linear,
  easeIn,
  easeOut,
  easeInOut,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeOutBounce,
  easeOutElastic,
  easeOutBack,
  // Animation helpers
  lerp,
  clamp,
  mapRange,
  springStep,
  isSpringAtRest,
  staggerDelay,
  getProgress,
  getDurationFromCSS,
  rafDebounce,
  rafThrottle,
} from "./animation.js";

// Geometry utilities
export {
  // Types
  type Point,
  type Size,
  type Rect,
  type Direction,
  type Corner,
  // Point operations
  point,
  addPoints,
  subtractPoints,
  scalePoint,
  midpoint,
  // Distance & angle
  distance,
  distanceSquared,
  angle,
  angleDegrees,
  radToDeg,
  degToRad,
  normalizeAngle,
  // Mouse & element positions
  getRelativeMousePosition,
  getRelativeMousePercent,
  getRelativeMouseCentered,
  getElementCenter,
  getElementLocalCenter,
  // Direction detection
  getEntryDirection,
  getOppositeDirection,
  getNearestCorner,
  // Rect & bounds
  isPointInRect,
  getRect,
  expandRect,
  // Transforms
  calculateTiltTransform,
  calculateSpotlightPosition,
} from "./geometry.js";

// Color utilities
export {
  // Types
  type RGB,
  type HSL,
  type OKLCH,
  type RGBA,
  // Color parsing
  hexToRgb,
  rgbToHex,
  parseHsl,
  hslToString,
  parseOklch,
  oklchToString,
  // Color conversion
  rgbToHsl,
  hslToRgb,
  // Color manipulation
  lighten,
  darken,
  saturate,
  desaturate,
  shiftHue,
  complementary,
  interpolateColor,
  // Gradient generation
  linearGradient,
  radialGradient,
  conicGradient,
  getRainbowColors,
  getThemeGradient,
  // Color utilities
  getCssVariable,
  setCssVariable,
  randomColor,
  isLightColor,
  getContrastColor,
  withAlpha,
} from "./color.js";
