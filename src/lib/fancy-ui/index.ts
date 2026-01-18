// FancyUI - Component Library
// Re-exports all implemented FancyUI components

// =============================================================================
// Components
// =============================================================================

export * from './animated-tooltip/index.js';
export * from './border-beam/index.js';
export * from './rainbow-button/index.js';
export * from './ripple-button/index.js';

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
