// FancyUI - Component Library
// Re-exports all ported FancyUI components

// =============================================================================
// Components
// =============================================================================

export * from './animated-beam/index.js';
export * from './animated-tooltip/index.js';
export * from './bg-stars/index.js';
export * from './border-beam/index.js';
export * from './compare/index.js';
export * from './direction-aware-hover/index.js';
export * from './rainbow-button/index.js';
export * from './ripple-button/index.js';
export * from './timeline/index.js';

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
