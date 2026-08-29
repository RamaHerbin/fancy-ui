export { FireworksHdr } from "./FireworksHdr.js";
export type { FireworksHdrProps } from "./FireworksHdr.js";
// Figure helpers for pattern shells: build a `shapePoints` outline, or feed a
// custom one straight to `outlineBurst`.
export { heartOutline, starOutline, polygonOutline, outlineBurst } from "./fireworks-shared.js";
export type {
	FireworksHandle,
	LaunchOptions,
	LaunchResult,
	FireworksRenderLevel,
	ShellKind,
	QualityTier,
	Outline,
	BurstDir,
	Vec2,
} from "./fireworks-shared.js";
