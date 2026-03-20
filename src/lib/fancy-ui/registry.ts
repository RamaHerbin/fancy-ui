/**
 * Component Registry
 *
 * Central registry of all FancyUI components and their implementation status.
 * Used for generating demo pages, tracking progress, and documentation.
 */

import type { ComponentCategory, ComponentMeta, ComponentStatus } from "$lib/types.js";

// =============================================================================
// Category Definitions
// =============================================================================

/**
 * Human-readable labels for component categories
 */
export const categoryLabels: Record<ComponentCategory, string> = {
	buttons: "Buttons",
	cards: "Cards",
	backgrounds: "Backgrounds",
	text: "Text & Typography",
	layout: "Layout",
	feedback: "Feedback",
	"data-display": "Data Display",
	navigation: "Navigation",
	media: "Media",
	effects: "Effects",
};

/**
 * Category descriptions for documentation
 */
export const categoryDescriptions: Record<ComponentCategory, string> = {
	buttons: "Interactive button components with various styles and animations",
	cards: "Card layouts and containers for content presentation",
	backgrounds: "Animated and decorative background effects",
	text: "Text animations, typography effects, and content display",
	layout: "Layout primitives and structural components",
	feedback: "User feedback components like tooltips, toasts, and loaders",
	"data-display": "Components for displaying data, lists, and collections",
	navigation: "Navigation menus, tabs, and wayfinding components",
	media: "Image, video, and media display components",
	effects: "Visual effects, animations, and decorative elements",
};

/**
 * All available categories in display order
 */
export const categories: ComponentCategory[] = [
	"buttons",
	"cards",
	"text",
	"backgrounds",
	"effects",
	"layout",
	"navigation",
	"data-display",
	"feedback",
	"media",
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

	"apple-card-carousel": {
		name: "AppleCardCarousel",
		slug: "apple-card-carousel",
		description:
			"Horizontal card carousel with spring-animated full-screen expansion, inspired by Apple's App Store UI",
		category: "cards",
		status: "done",
		credits: [
			{
				source: "Aceternity UI",
				url: "https://ui.aceternity.com/components/apple-cards-carousel",
			},
		],
	},

	"animated-beam": {
		name: "AnimatedBeam",
		slug: "animated-beam",
		description: "Animated SVG beams connecting elements with smooth gradients",
		category: "effects",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/animated-beam" }],
	},

	"animated-testimonials": {
		name: "AnimatedTestimonials",
		slug: "animated-testimonials",
		description: "Testimonial carousel with smooth slide animations and optional autoplay",
		category: "data-display",
		status: "done",
	},

	"bg-falling-stars": {
		name: "FallingStarsBg",
		slug: "bg-falling-stars",
		description: "Canvas-based 3D starfield with perspective projection, motion trails, and glow",
		category: "backgrounds",
		status: "done",
	},

	"animated-tooltip": {
		name: "AnimatedTooltip",
		slug: "animated-tooltip",
		description: "Avatar row with animated tooltips that follow mouse movement",
		category: "feedback",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/animated-tooltip" },
		],
	},

	"blur-reveal": {
		name: "BlurReveal",
		slug: "blur-reveal",
		description: "Scroll-triggered blur-to-clear reveal animation with staggered children",
		category: "text",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/blur-fade" }],
	},

	"border-beam": {
		name: "BorderBeam",
		slug: "border-beam",
		description: "Animated beam effect that travels around borders",
		category: "effects",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/border-beam" }],
	},

	compare: {
		name: "Compare",
		slug: "compare",
		description: "Before/after image comparison slider with hover and drag modes",
		category: "media",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/compare" }],
	},

	"image-trail-cursor": {
		name: "ImageTrailCursor",
		slug: "image-trail-cursor",
		description: "Cursor-following image trail with 8 animation variants",
		category: "effects",
		status: "done",
	},

	"interactive-grid-pattern": {
		name: "InteractiveGridPattern",
		slug: "interactive-grid-pattern",
		description: "SVG grid of squares that highlight on hover with smooth fade transitions",
		category: "effects",
		status: "done",
		credits: [
			{
				source: "Magic UI",
				url: "https://magicui.design/docs/components/interactive-grid-pattern",
			},
		],
	},

	"logo-cloud": {
		name: "LogoCloud",
		slug: "logo-cloud",
		description: "Logo display with animated marquee, static grid, and icon variants",
		category: "data-display",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/marquee" }],
	},

	"direction-aware-hover": {
		name: "DirectionAwareHover",
		slug: "direction-aware-hover",
		description: "Image card with overlay that slides in from the mouse entry direction",
		category: "cards",
		status: "done",
		credits: [
			{
				source: "Aceternity UI",
				url: "https://ui.aceternity.com/components/direction-aware-hover",
			},
		],
	},

	"rainbow-button": {
		name: "RainbowButton",
		slug: "rainbow-button",
		description: "Animated button with a rainbow gradient border effect",
		category: "buttons",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/rainbow-button" }],
	},

	"ripple-button": {
		name: "RippleButton",
		slug: "ripple-button",
		description: "Button with ripple click effect",
		category: "buttons",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/ripple-button" }],
	},

	"shimmer-button": {
		name: "ShimmerButton",
		slug: "shimmer-button",
		description: "Button with a rotating conic-gradient shimmer border effect",
		category: "buttons",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/shimmer-button" }],
	},

	timeline: {
		name: "Timeline",
		slug: "timeline",
		description: "Vertical timeline with scroll-driven progress line and sticky labels",
		category: "navigation",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/timeline" }],
	},

	"bg-stars": {
		name: "StarsBackground",
		slug: "bg-stars",
		description: "Animated starfield background with parallax mouse tracking",
		category: "backgrounds",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/stars-background" },
		],
	},

	dock: {
		name: "Dock",
		slug: "dock",
		description: "macOS-style dock with icon magnification on hover",
		category: "navigation",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/dock" }],
	},

	"fluid-cursor": {
		name: "FluidCursor",
		slug: "fluid-cursor",
		description: "WebGL fluid simulation that follows cursor movement",
		category: "effects",
		status: "done",
		credits: [
			{ source: "Inspira UI", url: "https://inspira-ui.com/components/cursor/fluid-cursor" },
		],
	},

	"glow-border": {
		name: "GlowBorder",
		slug: "glow-border",
		description: "Animated glowing border effect with gradient support",
		category: "effects",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/background-gradient" },
		],
	},

	"gradient-button": {
		name: "GradientButton",
		slug: "gradient-button",
		description: "Button with a rotating conic-gradient rainbow border effect",
		category: "buttons",
		status: "done",
		credits: [
			{ source: "Inspira UI", url: "https://inspira-ui.com/components/buttons/gradient-button" },
		],
	},

	"interactive-hover-button": {
		name: "InteractiveHoverButton",
		slug: "interactive-hover-button",
		description: "Button with interactive hover effect revealing alternate content",
		category: "buttons",
		status: "done",
		credits: [
			{
				source: "Magic UI",
				url: "https://magicui.design/docs/components/interactive-hover-button",
			},
		],
	},

	marquee: {
		name: "Marquee",
		slug: "marquee",
		description: "Infinite scrolling component for text, images, or cards",
		category: "layout",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/marquee" }],
	},

	meteors: {
		name: "Meteors",
		slug: "meteors",
		description: "Animated meteor shower effect with randomized positions and delays",
		category: "effects",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/meteors" }],
	},

	"flickering-grid": {
		name: "FlickeringGrid",
		slug: "flickering-grid",
		description: "Canvas-based grid of squares with flickering opacity",
		category: "backgrounds",
		status: "done",
		credits: [
			{ source: "Magic UI", url: "https://magicui.design/docs/components/flickering-grid" },
		],
	},

	"neon-border": {
		name: "NeonBorder",
		slug: "neon-border",
		description: "Dual-color neon glow border effect with optional rotation animation",
		category: "effects",
		status: "done",
		credits: [
			{ source: "Magic UI", url: "https://magicui.design/docs/components/neon-gradient-card" },
		],
	},

	"colourful-text": {
		name: "ColourfulText",
		slug: "colourful-text",
		description: "Per-character color animation with shuffling colors",
		category: "text",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/colourful-text" },
		],
	},

	"flip-words": {
		name: "FlipWords",
		slug: "flip-words",
		description: "Cycling word animation with per-letter fade-in and blur effects",
		category: "text",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/flip-words" }],
	},

	"hyper-text": {
		name: "HyperText",
		slug: "hyper-text",
		description: "Character scramble effect that activates on hover",
		category: "text",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/hyper-text" }],
	},

	"letter-pullup": {
		name: "LetterPullup",
		slug: "letter-pullup",
		description: "Staggered letter pull-up animation with wave entrance effect",
		category: "text",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/letter-pullup" }],
	},

	"number-ticker": {
		name: "NumberTicker",
		slug: "number-ticker",
		description: "Animated number counter with easing, triggered on viewport entry",
		category: "text",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/number-ticker" }],
	},

	"sparkles-text": {
		name: "SparklesText",
		slug: "sparkles-text",
		description: "Text with animated SVG sparkle stars overlay",
		category: "text",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/sparkles" }],
	},

	"box-reveal": {
		name: "BoxReveal",
		slug: "box-reveal",
		description: "Content reveal with sliding colored box animation",
		category: "text",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/box-reveal" }],
	},

	"card-3d": {
		name: "Card3D",
		slug: "card-3d",
		description: "Interactive 3D perspective card with depth effects on child elements",
		category: "cards",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/3d-card-effect" },
		],
	},

	"card-spotlight": {
		name: "CardSpotlight",
		slug: "card-spotlight",
		description: "Card with mouse-following radial gradient spotlight overlay",
		category: "cards",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/card-spotlight" },
		],
	},

	"bento-grid": {
		name: "BentoGrid",
		slug: "bento-grid",
		description: "Bento-style grid layout with slot-based and props-based card variants",
		category: "cards",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/bento-grid" }],
	},

	"flip-card": {
		name: "FlipCard",
		slug: "flip-card",
		description: "Card that flips to reveal back content on hover using CSS 3D transforms",
		category: "cards",
		status: "done",
	},

	book: {
		name: "Book",
		slug: "book",
		description: "3D book component with cover, spine, and back face that opens on hover",
		category: "cards",
		status: "done",
		credits: [{ source: "Inspira UI", url: "https://inspira-ui.com/components/cards/book" }],
	},

	"glare-card": {
		name: "GlareCard",
		slug: "glare-card",
		description: "Holographic trading card effect with mouse-tracking glare and rainbow foil",
		category: "cards",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/glare-card" }],
	},

	"text-reveal-card": {
		name: "TextRevealCard",
		slug: "text-reveal-card",
		description: "Card that reveals text on horizontal mouse drag with animated star particles",
		category: "cards",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/text-reveal-card" },
		],
	},

	"container-scroll": {
		name: "ContainerScroll",
		slug: "container-scroll",
		description: "Scroll-driven animation that rotates and scales a card from tilted to flat",
		category: "layout",
		status: "done",
		credits: [
			{
				source: "Aceternity UI",
				url: "https://ui.aceternity.com/components/container-scroll-animation",
			},
		],
	},

	"container-text-flip": {
		name: "ContainerTextFlip",
		slug: "container-text-flip",
		description: "Text container that cycles through words with per-character blur animation",
		category: "text",
		status: "done",
		credits: [{ source: "Inspira UI", url: "https://inspira-ui.com/components/text/text-flip" }],
	},

	focus: {
		name: "Focus",
		slug: "focus",
		description: "Text component that cycles focus through words with blur and corner frame",
		category: "text",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/focus-cards" }],
	},

	"liquid-glass": {
		name: "LiquidGlass",
		slug: "liquid-glass",
		description: "Glass-like visual effect using SVG filters for chromatic displacement",
		category: "effects",
		status: "done",
		credits: [
			{
				source: "Inspira UI",
				url: "https://inspira-ui.com/components/special-effects/liquid-glass",
			},
		],
	},

	"smooth-cursor": {
		name: "SmoothCursor",
		slug: "smooth-cursor",
		description: "Physics-based smooth cursor with spring animations and rotation effects",
		category: "effects",
		status: "done",
		credits: [
			{ source: "Inspira UI", url: "https://inspira-ui.com/components/cursor/smooth-cursor" },
		],
	},

	"glowing-effect": {
		name: "GlowingEffect",
		slug: "glowing-effect",
		description: "Mouse-proximity based glowing border effect with animated conic gradient",
		category: "effects",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/glowing-effect" }],
	},

	sparkles: {
		name: "Sparkles",
		slug: "sparkles",
		description:
			"Canvas-based floating particle sparkle effect with configurable density and colors",
		category: "backgrounds",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/sparkles" }],
	},

	confetti: {
		name: "Confetti",
		slug: "confetti",
		description:
			"Confetti celebration effect powered by canvas-confetti with button trigger support",
		category: "effects",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/confetti" }],
	},

	ripple: {
		name: "Ripple",
		slug: "ripple",
		description: "Concentric pulsing circles with ripple wave animation",
		category: "effects",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/ripple" }],
	},

	"text-generate-effect": {
		name: "TextGenerateEffect",
		slug: "text-generate-effect",
		description: "Typewriter-style text reveal that fades in words one by one with optional blur",
		category: "text",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/text-generate-effect" },
		],
	},

	"line-shadow-text": {
		name: "LineShadowText",
		slug: "line-shadow-text",
		description: "Text with animated diagonal line shadow pattern that scrolls continuously",
		category: "text",
		status: "done",
		credits: [
			{ source: "Magic UI", url: "https://magicui.design/docs/components/line-shadow-text" },
		],
	},

	"tracing-beam": {
		name: "TracingBeam",
		slug: "tracing-beam",
		description: "Vertical SVG beam that highlights scroll progress alongside content",
		category: "effects",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/tracing-beam" },
		],
	},
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
		done: getComponentsByStatus("done"),
		"in-progress": getComponentsByStatus("in-progress"),
		planned: getComponentsByStatus("planned"),
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
 * Get implementation statistics
 */
export function getStats(): {
	total: number;
	done: number;
	inProgress: number;
	planned: number;
	percentComplete: number;
} {
	const all = Object.values(registry);
	const done = all.filter((c) => c.status === "done").length;
	const inProgress = all.filter((c) => c.status === "in-progress").length;
	const planned = all.filter((c) => c.status === "planned").length;

	return {
		total: all.length,
		done,
		inProgress,
		planned,
		percentComplete: all.length > 0 ? Math.round((done / all.length) * 100) : 0,
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
