// FancyUI - Component Library
// Re-exports all implemented FancyUI components

// =============================================================================
// Components
// =============================================================================

export * from "./apple-card-carousel/index.js";
export * from "./line-hover-link/index.js";
export * from "./animated-beam/index.js";
export * from "./animated-testimonials/index.js";
export * from "./fireworks-hdr/index.js";
export * from "./fluid-cursor/index.js";
export * from "./animated-tooltip/index.js";
export * from "./blur-reveal/index.js";
export * from "./bg-falling-stars/index.js";
export * from "./bg-stars/index.js";
export * from "./border-beam/index.js";
export * from "./glow-border/index.js";
export * from "./marquee/index.js";
export * from "./compare/index.js";
export * from "./dock/index.js";
export * from "./image-trail-cursor/index.js";
export * from "./interactive-grid-pattern/index.js";
export * from "./interactive-hover-button/index.js";
export * from "./gradient-button/index.js";
export * from "./logo-cloud/index.js";
export * from "./direction-aware-hover/index.js";
export * from "./rainbow-button/index.js";
export * from "./ripple-button/index.js";
export * from "./shimmer-button/index.js";
export * from "./timeline/index.js";
export * from "./meteors/index.js";
export * from "./flickering-grid/index.js";
export * from "./neon-border/index.js";
export * from "./colourful-text/index.js";
export * from "./flip-words/index.js";
export * from "./hyper-text/index.js";
export * from "./letter-pullup/index.js";
export * from "./number-ticker/index.js";
export * from "./sparkles-text/index.js";
export * from "./box-reveal/index.js";
export * from "./card-3d/index.js";
export * from "./card-spotlight/index.js";
export * from "./bento-grid/index.js";
export * from "./flip-card/index.js";
export * from "./book/index.js";
export * from "./glare-card/index.js";
export * from "./text-reveal-card/index.js";
export * from "./container-scroll/index.js";
export * from "./container-text-flip/index.js";
export * from "./focus/index.js";
export * from "./frosted-glass/index.js";
export * from "./liquid-glass/index.js";
export * from "./smooth-cursor/index.js";
export * from "./sparkles/index.js";
export * from "./glowing-effect/index.js";
export * from "./confetti/index.js";
export * from "./ripple/index.js";
export * from "./text-generate-effect/index.js";
export * from "./line-shadow-text/index.js";
export * from "./tracing-beam/index.js";
export * from "./displacement-text/index.js";
export * from "./matrix-rain/index.js";
export * from "./terminal-text/index.js";
export * from "./noise-reveal/index.js";
export * from "./line-reveal/index.js";
export * from "./editorial-engine/index.js";
export * from "./liquid-text/index.js";
export * from "./pixel-loader/index.js";
export * from "./typing-indicator/index.js";
export * from "./thinking-indicator/index.js";
export * from "./streaming-text/index.js";
export * from "./reasoning-panel/index.js";

// =============================================================================
// Registry
// =============================================================================

export {
	// Data
	registry,
	categories,
	categoryLabels,
	categoryDescriptions,
	// Helpers
	getAllComponents,
	getComponent,
	getComponentsByStatus,
	getComponentsByCategory,
	getComponentsGroupedByCategory,
	getComponentsGroupedByStatus,
	searchComponents,
	getStats,
	hasComponent,
	getComponentCategory,
} from "./registry.js";

// Shared AI/chat data types (type-only; _internals is not a component folder)
export type * from "./_internals/ai-types.js";
