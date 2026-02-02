/**
 * Component Registry
 *
 * Central registry of all FancyUI components and their implementation status.
 * Used for generating demo pages, tracking progress, and documentation.
 */

import type { ComponentCategory, ComponentMeta, ComponentStatus } from '$lib/types.js';

// =============================================================================
// Category Definitions
// =============================================================================

/**
 * Human-readable labels for component categories
 */
export const categoryLabels: Record<ComponentCategory, string> = {
	buttons: 'Buttons',
	cards: 'Cards',
	backgrounds: 'Backgrounds',
	text: 'Text & Typography',
	layout: 'Layout',
	feedback: 'Feedback',
	'data-display': 'Data Display',
	navigation: 'Navigation',
	media: 'Media',
	effects: 'Effects'
};

/**
 * Category descriptions for documentation
 */
export const categoryDescriptions: Record<ComponentCategory, string> = {
	buttons: 'Interactive button components with various styles and animations',
	cards: 'Card layouts and containers for content presentation',
	backgrounds: 'Animated and decorative background effects',
	text: 'Text animations, typography effects, and content display',
	layout: 'Layout primitives and structural components',
	feedback: 'User feedback components like tooltips, toasts, and loaders',
	'data-display': 'Components for displaying data, lists, and collections',
	navigation: 'Navigation menus, tabs, and wayfinding components',
	media: 'Image, video, and media display components',
	effects: 'Visual effects, animations, and decorative elements'
};

/**
 * All available categories in display order
 */
export const categories: ComponentCategory[] = [
	'buttons',
	'cards',
	'text',
	'backgrounds',
	'effects',
	'layout',
	'navigation',
	'data-display',
	'feedback',
	'media'
];

// =============================================================================
// Component Registry
// =============================================================================

/**
 * Registry of all components with their metadata
 *
 * Add new components here as they are implemented.
 * Keep alphabetically sorted within each status group.
 */
export const registry: Record<string, ComponentMeta> = {
	// =========================================================================
	// Done - Fully implemented and tested
	// =========================================================================

	'animated-beam': {
		name: 'AnimatedBeam',
		slug: 'animated-beam',
		description: 'Animated SVG beams connecting elements with smooth gradients',
		category: 'effects',
		status: 'done'
	},

	'bg-falling-stars': {
		name: 'FallingStarsBg',
		slug: 'bg-falling-stars',
		description: 'Canvas-based 3D starfield with perspective projection, motion trails, and glow',
		category: 'backgrounds',
		status: 'done'
	},

	'animated-tooltip': {
		name: 'AnimatedTooltip',
		slug: 'animated-tooltip',
		description: 'Avatar row with animated tooltips that follow mouse movement',
		category: 'feedback',
		status: 'done'
	},

	'blur-reveal': {
		name: 'BlurReveal',
		slug: 'blur-reveal',
		description: 'Scroll-triggered blur-to-clear reveal animation with staggered children',
		category: 'text',
		status: 'done'
	},

	'border-beam': {
		name: 'BorderBeam',
		slug: 'border-beam',
		description: 'Animated beam effect that travels around borders',
		category: 'effects',
		status: 'done'
	},

	compare: {
		name: 'Compare',
		slug: 'compare',
		description: 'Before/after image comparison slider with hover and drag modes',
		category: 'media',
		status: 'done'
	},

	'image-trail-cursor': {
		name: 'ImageTrailCursor',
		slug: 'image-trail-cursor',
		description: 'Cursor-following image trail with 8 animation variants',
		category: 'effects',
		status: 'done'
	},

	'interactive-grid-pattern': {
		name: 'InteractiveGridPattern',
		slug: 'interactive-grid-pattern',
		description: 'SVG grid of squares that highlight on hover with smooth fade transitions',
		category: 'effects',
		status: 'done'
	},

	'logo-cloud': {
		name: 'LogoCloud',
		slug: 'logo-cloud',
		description: 'Logo display with animated marquee, static grid, and icon variants',
		category: 'data-display',
		status: 'done'
	},

	'direction-aware-hover': {
		name: 'DirectionAwareHover',
		slug: 'direction-aware-hover',
		description: 'Image card with overlay that slides in from the mouse entry direction',
		category: 'cards',
		status: 'done'
	},

	'rainbow-button': {
		name: 'RainbowButton',
		slug: 'rainbow-button',
		description: 'Animated button with a rainbow gradient border effect',
		category: 'buttons',
		status: 'done'
	},

	'ripple-button': {
		name: 'RippleButton',
		slug: 'ripple-button',
		description: 'Button with ripple click effect',
		category: 'buttons',
		status: 'done'
	},

	timeline: {
		name: 'Timeline',
		slug: 'timeline',
		description: 'Vertical timeline with scroll-driven progress line and sticky labels',
		category: 'navigation',
		status: 'done'
	}

	// =========================================================================
	// In Progress - Currently being implemented
	// =========================================================================

	// =========================================================================
	// Planned - Identified for implementing
	// =========================================================================
};

// =============================================================================
// Registry Helpers
// =============================================================================

/**
 * Get all components as an array
 */
export function getAllComponents(): ComponentMeta[] {
	return Object.values(registry);
}

/**
 * Get a component by slug
 */
export function getComponent(slug: string): ComponentMeta | undefined {
	return registry[slug];
}

/**
 * Get components filtered by status
 */
export function getComponentsByStatus(status: ComponentStatus): ComponentMeta[] {
	return Object.values(registry).filter((c) => c.status === status);
}

/**
 * Get components filtered by category
 */
export function getComponentsByCategory(category: ComponentCategory): ComponentMeta[] {
	return Object.values(registry).filter((c) => c.category === category);
}

/**
 * Get components grouped by category
 */
export function getComponentsGroupedByCategory(): Record<ComponentCategory, ComponentMeta[]> {
	const grouped = {} as Record<ComponentCategory, ComponentMeta[]>;

	for (const category of categories) {
		grouped[category] = [];
	}

	for (const component of Object.values(registry)) {
		grouped[component.category].push(component);
	}

	return grouped;
}

/**
 * Get components grouped by status
 */
export function getComponentsGroupedByStatus(): Record<ComponentStatus, ComponentMeta[]> {
	return {
		done: getComponentsByStatus('done'),
		'in-progress': getComponentsByStatus('in-progress'),
		planned: getComponentsByStatus('planned')
	};
}

/**
 * Search components by name or description
 */
export function searchComponents(query: string): ComponentMeta[] {
	const lowerQuery = query.toLowerCase();
	return Object.values(registry).filter(
		(c) =>
			c.name.toLowerCase().includes(lowerQuery) ||
			c.description.toLowerCase().includes(lowerQuery) ||
			c.slug.includes(lowerQuery)
	);
}

/**
 * Get implementing statistics
 */
export function getStats(): {
	total: number;
	done: number;
	inProgress: number;
	planned: number;
	percentComplete: number;
} {
	const all = Object.values(registry);
	const done = all.filter((c) => c.status === 'done').length;
	const inProgress = all.filter((c) => c.status === 'in-progress').length;
	const planned = all.filter((c) => c.status === 'planned').length;

	return {
		total: all.length,
		done,
		inProgress,
		planned,
		percentComplete: all.length > 0 ? Math.round((done / all.length) * 100) : 0
	};
}

/**
 * Check if a component exists in the registry
 */
export function hasComponent(slug: string): boolean {
	return slug in registry;
}

/**
 * Get category for a component
 */
export function getComponentCategory(slug: string): ComponentCategory | undefined {
	return registry[slug]?.category;
}
