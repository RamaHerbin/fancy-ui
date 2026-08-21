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
export * from "./chat-message/index.js";
export * from "./prompt-suggestions/index.js";
export * from "./chat-error/index.js";
export * from "./tool-call/index.js";
export * from "./tool-timeline/index.js";
export * from "./terminal-block/index.js";
export * from "./code-diff/index.js";
export * from "./sources/index.js";
export * from "./inline-citation/index.js";
export * from "./web-search/index.js";
export * from "./image-generation/index.js";
export * from "./agent-plan/index.js";
export * from "./subagent-list/index.js";
export * from "./approval-card/index.js";
export * from "./recommendation-card/index.js";
export * from "./artifact-card/index.js";
export * from "./ai-data-table/index.js";
export * from "./composer/index.js";
export * from "./voice-input/index.js";
export * from "./context-ring/index.js";
export * from "./scroll-anchor/index.js";
export * from "./thread-list/index.js";
export * from "./chat-panel/index.js";

// Core — actions
export * from "./button/index.js";
export * from "./icon-button/index.js";
export * from "./button-group/index.js";
export * from "./link/index.js";
export * from "./toggle/index.js";
export * from "./toggle-group/index.js";
export * from "./copy-button/index.js";

// Core — forms
export * from "./label/index.js";
export * from "./form-field/index.js";
export * from "./input/index.js";
export * from "./textarea/index.js";
export * from "./checkbox/index.js";
export * from "./radio-group/index.js";
export * from "./switch/index.js";
export * from "./slider/index.js";
export * from "./number-input/index.js";

// Core — overlays
export * from "./dialog/index.js";
export * from "./alert-dialog/index.js";
export * from "./sheet/index.js";
export * from "./drawer/index.js";
export * from "./popover/index.js";
export * from "./tooltip/index.js";
export * from "./hover-card/index.js";
export * from "./toast/index.js";

// Core — forms, floating surfaces
export * from "./select/index.js";
export * from "./combobox/index.js";
export * from "./autocomplete/index.js";
export * from "./search-input/index.js";
export * from "./password-input/index.js";
export * from "./file-upload/index.js";
export * from "./date-picker/index.js";
export * from "./time-picker/index.js";

// Core — navigation
export * from "./navbar/index.js";
export * from "./sidebar/index.js";
export * from "./tabs/index.js";
export * from "./breadcrumb/index.js";
export * from "./pagination/index.js";
export * from "./stepper/index.js";
export * from "./dropdown-menu/index.js";
export * from "./context-menu/index.js";
export * from "./command-menu/index.js";
export * from "./navigation-menu/index.js";

// Core — actions (sound)
export * from "./sound/index.js";

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
