// FancyUI - Component Library
// Re-exports all ported FancyUI components

// =============================================================================
// Components
// =============================================================================

export * from './animated-beam/index.js';
export * from './animated-tooltip/index.js';
export * from './blur-reveal/index.js';
export * from './bg-falling-stars/index.js';
export * from './bg-stars/index.js';
export * from './border-beam/index.js';
export * from './compare/index.js';
export * from './image-trail-cursor/index.js';
export * from './interactive-grid-pattern/index.js';
export * from './logo-cloud/index.js';
export * from './direction-aware-hover/index.js';
export * from './rainbow-button/index.js';
export * from './ripple-button/index.js';
export * from './shimmer-button/index.js';
export * from './timeline/index.js';
export * from './meteors/index.js';
export * from './flickering-grid/index.js';
export * from './neon-border/index.js';
export * from './colourful-text/index.js';
export * from './flip-words/index.js';
export * from './hyper-text/index.js';
export * from './letter-pullup/index.js';
export * from './number-ticker/index.js';
export * from './sparkles-text/index.js';
export * from './box-reveal/index.js';

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
	getComponentCategory
} from './registry.js';
