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
	"ai-chat": "AI Chat",
	"ai-agents": "AI Agents",
	actions: "Actions",
	forms: "Forms",
	overlays: "Overlays",
	display: "Display",
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
	"ai-chat": "Conversation surfaces: messages, composers, threads, and streaming text",
	"ai-agents": "Agent activity: reasoning, tool use, plans, and human-in-the-loop cards",
	actions: "Interactive action primitives like buttons, toggles, and triggers",
	forms: "Form primitives for capturing and validating user input",
	overlays: "Overlay primitives like dialogs, popovers, and menus",
	display: "Primitives for displaying data, status, and content",
};

/**
 * "Fancy" categories in display order (animated showcase components)
 */
export const fancyCategories: ComponentCategory[] = [
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
	"ai-chat",
	"ai-agents",
];

/**
 * "Core" categories in display order (foundational primitives)
 */
export const coreCategories: ComponentCategory[] = [
	"actions",
	"forms",
	"navigation",
	"overlays",
	"display",
	"feedback",
	"media",
	"layout",
];

/**
 * All available categories in display order (fancy categories first, then any
 * core-only categories not already covered). Kept for backwards compatibility.
 */
export const categories: ComponentCategory[] = [
	...fancyCategories,
	...coreCategories.filter((category) => !fancyCategories.includes(category)),
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
			"Horizontal card carousel where the focused card expands into a spring-animated full-screen view",
		category: "cards",
		group: "fancy",
		status: "done",
		credits: [
			{
				source: "Aceternity UI",
				url: "https://ui.aceternity.com/components/apple-cards-carousel",
			},
		],
		tags: ["carousel", "cards", "animation", "spring", "scroll"],
		props: [
			{
				name: "cards",
				type: "AppleCardData[]",
				description: "Cards to display in the carousel",
				required: true,
			},
		],
	},

	"animated-beam": {
		name: "AnimatedBeam",
		slug: "animated-beam",
		description: "Animated SVG beams connecting elements with smooth gradients",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/animated-beam" }],
		tags: ["animation", "svg", "beam", "gradient", "connection"],
		props: [
			{
				name: "containerRef",
				type: "HTMLElement",
				description: "Reference to the container element that holds both endpoints",
				required: true,
			},
			{
				name: "fromRef",
				type: "HTMLElement",
				description: "Reference to the source element",
				required: true,
			},
			{
				name: "toRef",
				type: "HTMLElement",
				description: "Reference to the destination element",
				required: true,
			},
			{
				name: "curvature",
				type: "number",
				default: "0",
				description: "Vertical curvature of the beam path",
			},
			{
				name: "reverse",
				type: "boolean",
				default: "false",
				description: "Reverse the animation direction",
			},
			{
				name: "pathColor",
				type: "string",
				default: '"gray"',
				description: "Color of the static background path",
			},
			{ name: "pathWidth", type: "number", default: "2", description: "Stroke width of the path" },
			{
				name: "pathOpacity",
				type: "number",
				default: "0.2",
				description: "Opacity of the background path",
			},
			{
				name: "gradientStartColor",
				type: "string",
				default: '"#FFAA40"',
				description: "Start color of the animated gradient",
			},
			{
				name: "gradientStopColor",
				type: "string",
				default: '"#9C40FF"',
				description: "End color of the animated gradient",
			},
			{ name: "delay", type: "number", default: "0", description: "Animation delay in seconds" },
			{
				name: "duration",
				type: "number",
				default: "random 4-7",
				description: "Animation duration in seconds",
			},
			{
				name: "startXOffset",
				type: "number",
				default: "0",
				description: "Horizontal offset for the start point",
			},
			{
				name: "startYOffset",
				type: "number",
				default: "0",
				description: "Vertical offset for the start point",
			},
			{
				name: "endXOffset",
				type: "number",
				default: "0",
				description: "Horizontal offset for the end point",
			},
			{
				name: "endYOffset",
				type: "number",
				default: "0",
				description: "Vertical offset for the end point",
			},
		],
	},

	"animated-testimonials": {
		name: "AnimatedTestimonials",
		slug: "animated-testimonials",
		description: "Testimonial carousel with smooth slide animations and optional autoplay",
		category: "data-display",
		group: "fancy",
		status: "done",
		tags: ["testimonials", "carousel", "animation", "social-proof"],
		props: [
			{
				name: "testimonials",
				type: "Testimonial[]",
				description: "Array of testimonials to display",
				required: true,
			},
			{
				name: "autoplay",
				type: "boolean",
				default: "false",
				description: "Auto-advance testimonials",
			},
			{
				name: "interval",
				type: "number",
				default: "5000",
				description: "Interval between auto-advances in ms",
			},
		],
	},

	"bg-falling-stars": {
		name: "FallingStarsBg",
		slug: "bg-falling-stars",
		description: "Canvas-based 3D starfield with perspective projection, motion trails, and glow",
		category: "backgrounds",
		group: "fancy",
		status: "done",
		tags: ["background", "stars", "canvas", "animation", "3d", "space"],
		props: [
			{ name: "color", type: "string", default: '"#FFF"', description: "Star color as hex string" },
			{ name: "count", type: "number", default: "200", description: "Number of stars" },
		],
	},

	"animated-tooltip": {
		name: "AnimatedTooltip",
		slug: "animated-tooltip",
		description: "Avatar row with animated tooltips that follow mouse movement",
		category: "feedback",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/animated-tooltip" },
		],
		tags: ["tooltip", "avatar", "animation", "hover", "team"],
		props: [
			{
				name: "items",
				type: "TooltipItem[]",
				description: "Array of items with id, name, designation, and image URL",
				required: true,
			},
		],
	},

	"blur-reveal": {
		name: "BlurReveal",
		slug: "blur-reveal",
		description:
			"Scroll-triggered reveal that unblurs and slides each direct child into place as the container enters the viewport, staggering up to 10 children via CSS nth-child delays and respecting reduced motion",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/blur-fade" }],
		tags: ["animation", "reveal", "blur", "scroll", "stagger"],
		props: [
			{
				name: "duration",
				type: "number",
				default: "1",
				description: "Animation duration in seconds",
			},
			{
				name: "delay",
				type: "number",
				default: "0.2",
				description: "Stagger delay between children in seconds",
			},
			{
				name: "blur",
				type: "string",
				default: '"20px"',
				description: "Initial blur amount (CSS value)",
			},
			{
				name: "yOffset",
				type: "number",
				default: "20",
				description: "Initial vertical offset in pixels",
			},
		],
		slots: [
			{ name: "children", description: "Content elements to reveal with staggered animation" },
		],
	},

	"border-beam": {
		name: "BorderBeam",
		slug: "border-beam",
		description:
			"Gradient beam that races around a container's border using a CSS offset-path animation, masked so only the border ring is painted, with configurable size, speed, anchor position, and gradient colors",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/border-beam" }],
		tags: ["animation", "border", "gradient", "beam"],
		props: [
			{ name: "size", type: "number", default: "200", description: "Size of the beam in pixels" },
			{
				name: "duration",
				type: "number",
				default: "15",
				description: "Animation duration in seconds",
			},
			{
				name: "borderWidth",
				type: "number",
				default: "1.5",
				description: "Border width in pixels",
			},
			{ name: "anchor", type: "number", default: "90", description: "Anchor position (0-100)" },
			{
				name: "colorFrom",
				type: "string",
				default: '"#ffaa40"',
				description: "Gradient start color",
			},
			{ name: "colorTo", type: "string", default: '"#9c40ff"', description: "Gradient end color" },
			{ name: "delay", type: "number", default: "0", description: "Animation delay in seconds" },
		],
	},

	compare: {
		name: "Compare",
		slug: "compare",
		description: "Before/after image comparison slider with hover and drag modes",
		category: "media",
		group: "fancy",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/compare" }],
		tags: ["media", "image", "slider", "comparison", "before-after", "interactive"],
		props: [
			{
				name: "firstImage",
				type: "string",
				default: '""',
				description: "URL of the first (left) image",
			},
			{
				name: "secondImage",
				type: "string",
				default: '""',
				description: "URL of the second (right) image",
			},
			{
				name: "firstImageAlt",
				type: "string",
				default: '"First image"',
				description: "Alt text for the first image",
			},
			{
				name: "secondImageAlt",
				type: "string",
				default: '"Second image"',
				description: "Alt text for the second image",
			},
			{
				name: "firstContentClass",
				type: "string",
				default: '""',
				description: "CSS classes for the first content container",
			},
			{
				name: "secondContentClass",
				type: "string",
				default: '""',
				description: "CSS classes for the second content container",
			},
			{
				name: "initialSliderPercentage",
				type: "number",
				default: "50",
				description: "Initial slider position (0-100)",
			},
			{
				name: "slideMode",
				type: '"hover" | "drag"',
				default: '"hover"',
				description: "How the slider is controlled",
			},
			{
				name: "showHandlebar",
				type: "boolean",
				default: "true",
				description: "Show the drag handle bar",
			},
			{
				name: "autoplay",
				type: "boolean",
				default: "false",
				description: "Automatically animate the slider back and forth",
			},
			{
				name: "autoplayDuration",
				type: "number",
				default: "5000",
				description: "Duration of one autoplay cycle in ms",
			},
		],
		slots: [
			{
				name: "firstContent",
				description: "Custom content to render in the first (left) panel instead of an image",
			},
			{
				name: "secondContent",
				description: "Custom content to render in the second (right) panel instead of an image",
			},
			{ name: "handle", description: "Custom drag handle element" },
		],
	},

	"image-trail-cursor": {
		name: "ImageTrailCursor",
		slug: "image-trail-cursor",
		description:
			"Trail of images that spawn and animate along the cursor's path, powered by GSAP timelines, with 8 selectable variants spanning simple fades, momentum drift, rotation flings, and 3D perspective tilt",
		category: "effects",
		group: "fancy",
		status: "done",
		tags: ["cursor", "animation", "images", "trail", "interactive"],
		props: [
			{
				name: "images",
				type: "string[]",
				default: "[]",
				description: "Array of image URLs to show in the trail",
			},
			{
				name: "variant",
				type: '"type1" | "type2" | ... | "type8"',
				default: '"type1"',
				description: "Animation variant controlling how images appear and move",
			},
		],
	},

	"interactive-grid-pattern": {
		name: "InteractiveGridPattern",
		slug: "interactive-grid-pattern",
		description: "SVG grid of squares that highlight on hover with smooth fade transitions",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [
			{
				source: "Magic UI",
				url: "https://magicui.design/docs/components/interactive-grid-pattern",
			},
		],
		tags: ["grid", "pattern", "interactive", "hover", "svg", "background"],
		props: [
			{
				name: "squaresClassName",
				type: "string",
				description: "Additional CSS classes for individual squares",
			},
			{
				name: "width",
				type: "number",
				default: "40",
				description: "Width of each square in pixels",
			},
			{
				name: "height",
				type: "number",
				default: "40",
				description: "Height of each square in pixels",
			},
			{
				name: "squares",
				type: "[number, number]",
				default: "[24, 24]",
				description: "Grid dimensions as [columns, rows]",
			},
		],
	},

	"line-hover-link": {
		name: "LineHoverLink",
		slug: "line-hover-link",
		description:
			"Link component with 11 animated underline hover effects — pure CSS, no JS on hover",
		category: "navigation",
		group: "fancy",
		status: "done",
		credits: [{ source: "VengenceUI", url: "https://www.vengence-ui.com/docs/line-hover-link" }],
		tags: ["link", "navigation", "hover", "animation", "underline", "css"],
		props: [
			{
				name: "variant",
				type: '"slide" | "double" | "grow" | "strike" | "fade" | "pulse" | "swap" | "sweep" | "bounce" | "arc" | "scribble"',
				default: '"slide"',
				description: "The animation variant",
			},
			{ name: "href", type: "string", default: '"#"', description: "Link href" },
			{ name: "target", type: "string", description: "Link target attribute" },
			{ name: "rel", type: "string", description: "Link rel attribute" },
			{ name: "aria-label", type: "string", description: "Accessible label" },
		],
		slots: [{ name: "children", description: "Link text content" }],
	},

	"line-reveal": {
		name: "LineReveal",
		slug: "line-reveal",
		description:
			"Staggered line-by-line text reveal with lines computed by pretext instead of DOM splitting",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [{ source: "pretext", url: "https://github.com/chenglou/pretext" }],
		tags: ["text", "animation", "reveal", "stagger", "pretext", "typography"],
		props: [
			{ name: "text", type: "string", description: "Text to reveal", required: true },
			{
				name: "font",
				type: "string",
				default: "'600 32px \"Helvetica Neue\", Helvetica, Arial, sans-serif'",
				description: "CSS font shorthand used for both measurement and rendering",
			},
			{
				name: "lineHeight",
				type: "number",
				default: "1.2 × font size",
				description: "Line height in pixels",
			},
			{
				name: "stagger",
				type: "number",
				default: "0.08",
				description: "Delay between lines in seconds",
			},
			{
				name: "duration",
				type: "number",
				default: "0.7",
				description: "Animation duration per line in seconds",
			},
			{ name: "delay", type: "number", default: "0", description: "Initial delay in seconds" },
			{
				name: "once",
				type: "boolean",
				default: "true",
				description: "Animate only on first viewport entry",
			},
			{ name: "class", type: "string", description: "Additional CSS classes" },
		],
	},

	"editorial-engine": {
		name: "EditorialEngine",
		slug: "editorial-engine",
		description:
			"Live magazine layout: multi-column text flowing around draggable orbs with zero DOM reads, powered by pretext",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "pretext editorial engine", url: "https://chenglou.me/pretext/editorial-engine/" },
		],
		tags: ["text", "layout", "magazine", "columns", "pretext", "interactive", "typography"],
		props: [
			{
				name: "headline",
				type: "string",
				default: "built-in copy",
				description: "Auto-sized headline (largest font size that breaks no word)",
			},
			{
				name: "body",
				type: "string",
				default: "built-in copy",
				description: "Body text, paragraphs separated by blank lines",
			},
			{
				name: "pullquotes",
				type: "string[]",
				default: "built-in quotes",
				description: "Up to two pullquotes embedded in the columns",
			},
			{
				name: "fontFamily",
				type: "string",
				default: "Palatino serif stack",
				description: "Font family stack used for all text",
			},
			{ name: "class", type: "string", description: "Additional CSS classes for the stage" },
		],
	},

	"logo-cloud": {
		name: "LogoCloud",
		slug: "logo-cloud",
		description: "Logo display with animated marquee, static grid, and icon variants",
		category: "data-display",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/marquee" }],
		tags: ["logos", "marquee", "brands", "animation", "scrolling"],
		props: [
			{ name: "title", type: "string", description: "Optional title displayed above the logos" },
			{
				name: "logos",
				type: "Logo[]",
				default: "[]",
				description: "Array of logos with name and image path",
			},
		],
	},

	"direction-aware-hover": {
		name: "DirectionAwareHover",
		slug: "direction-aware-hover",
		description: "Image card with overlay that slides in from the mouse entry direction",
		category: "cards",
		group: "fancy",
		status: "done",
		credits: [
			{
				source: "Aceternity UI",
				url: "https://ui.aceternity.com/components/direction-aware-hover",
			},
		],
		tags: ["card", "hover", "image", "animation", "direction", "interactive"],
		props: [
			{
				name: "imageUrl",
				type: "string",
				description: "URL of the background image",
				required: true,
			},
			{
				name: "imageAlt",
				type: "string",
				default: '"image"',
				description: "Alt text for the image",
			},
			{
				name: "childrenClass",
				type: "string",
				default: '""',
				description: "CSS classes for the overlay content wrapper",
			},
			{
				name: "imageClass",
				type: "string",
				default: '""',
				description: "CSS classes for the image element",
			},
		],
		slots: [{ name: "children", description: "Content shown in the overlay when hovered" }],
	},

	"rainbow-button": {
		name: "RainbowButton",
		slug: "rainbow-button",
		description: "Animated button with a rainbow gradient border effect",
		category: "buttons",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/rainbow-button" }],
		tags: ["button", "animation", "rainbow", "gradient", "cta"],
		props: [
			{ name: "speed", type: "number", default: "2", description: "Animation speed in seconds" },
			{ name: "href", type: "string", description: "Render as anchor element when provided" },
		],
		slots: [{ name: "children", description: "Button label content" }],
	},

	"ripple-button": {
		name: "RippleButton",
		slug: "ripple-button",
		description:
			"Button that spawns an expanding, fading ripple circle centered on the click point, with configurable color and duration",
		category: "buttons",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/ripple-button" }],
		tags: ["button", "ripple", "click", "animation", "material"],
		props: [
			{
				name: "rippleColor",
				type: "string",
				default: '"#ADD8E6"',
				description: "Color of the ripple effect",
			},
			{
				name: "duration",
				type: "number",
				default: "600",
				description: "Animation duration in milliseconds",
			},
		],
		slots: [{ name: "children", description: "Button content" }],
	},

	"shimmer-button": {
		name: "ShimmerButton",
		slug: "shimmer-button",
		description: "Button with a rotating conic-gradient shimmer border effect",
		category: "buttons",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/shimmer-button" }],
		tags: ["button", "shimmer", "gradient", "animation", "cta"],
		props: [
			{
				name: "shimmerColor",
				type: "string",
				default: '"#ffffff"',
				description: "Shimmer highlight color",
			},
			{
				name: "shimmerSize",
				type: "string",
				default: '"0.05em"',
				description: "Thickness of the shimmer border",
			},
			{
				name: "borderRadius",
				type: "string",
				default: '"100px"',
				description: "Button border radius",
			},
			{
				name: "shimmerDuration",
				type: "string",
				default: '"3s"',
				description: "Duration of the shimmer animation cycle",
			},
			{
				name: "background",
				type: "string",
				default: '"rgba(0, 0, 0, 1)"',
				description: "Button background color",
			},
		],
		slots: [{ name: "children", description: "Button content" }],
	},

	timeline: {
		name: "Timeline",
		slug: "timeline",
		description: "Vertical timeline with scroll-driven progress line and sticky labels",
		category: "navigation",
		group: "fancy",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/timeline" }],
		tags: ["timeline", "scroll", "navigation", "progress", "vertical"],
		props: [
			{
				name: "items",
				type: "TimelineItem[]",
				default: "[]",
				description: "Timeline entries with id and label",
			},
			{ name: "title", type: "string", description: "Heading text" },
			{ name: "description", type: "string", description: "Subheading text" },
		],
		slots: [
			{
				name: "content",
				description: "Content snippet called for each timeline item, receives the item as argument",
			},
		],
	},

	"bg-stars": {
		name: "StarsBackground",
		slug: "bg-stars",
		description:
			"Three-layer starfield background that scrolls continuously while parallax-shifting in response to cursor movement via spring physics, with stars rendered as box-shadow dots across near, mid, and far depth layers",
		category: "backgrounds",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/stars-background" },
		],
		tags: ["background", "stars", "parallax", "animation", "space", "mouse"],
		props: [
			{
				name: "factor",
				type: "number",
				default: "0.05",
				description: "Parallax factor for mouse movement",
			},
			{
				name: "speed",
				type: "number",
				default: "50",
				description: "Base animation speed in seconds",
			},
			{
				name: "stiffness",
				type: "number",
				default: "50",
				description: "Spring stiffness for parallax",
			},
			{
				name: "damping",
				type: "number",
				default: "20",
				description: "Spring damping for parallax",
			},
			{ name: "starColor", type: "string", default: '"#fff"', description: "Color of the stars" },
		],
		slots: [{ name: "children", description: "Child content to render over the stars" }],
	},

	dock: {
		name: "Dock",
		slug: "dock",
		description:
			"Icon dock where each item magnifies smoothly as the cursor approaches, sharing pointer position via Svelte context so every DockIcon scales by proximity within a configurable magnification and distance range",
		category: "navigation",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/dock" }],
		tags: ["dock", "navigation", "launcher", "magnification", "hover"],
		props: [
			{
				name: "magnification",
				type: "number",
				default: "60",
				description: "Maximum icon size in pixels when magnified",
			},
			{
				name: "distance",
				type: "number",
				default: "140",
				description: "Distance in pixels over which magnification takes effect",
			},
			{
				name: "direction",
				type: '"top" | "middle" | "bottom"',
				default: '"middle"',
				description: "Vertical alignment of icons relative to the dock bar",
			},
			{
				name: "orientation",
				type: '"horizontal" | "vertical"',
				default: '"horizontal"',
				description: "Dock orientation",
			},
		],
		slots: [{ name: "children", description: "DockIcon and DockSeparator elements" }],
	},

	"fireworks-hdr": {
		name: "FireworksHdr",
		slug: "fireworks-hdr",
		description:
			"GPU fireworks background with a deterministic, DOM-free physics core (rockets, peony/willow/ring/glyph shells, sparks, embers, smoke) rendered by a WebGPU engine into a wide-gamut, extended-tone-mapping canvas so bursts and comet trails burn brighter than SDR white on HDR displays, degrading silently through a WebGL2 fallback and a soft-knee SDR path everywhere else",
		category: "effects",
		group: "fancy",
		status: "done",
		tags: ["hdr", "webgpu", "particles", "fireworks", "background"],
		props: [
			{
				name: "palette",
				type: "string[]",
				default: '["#ff2fd6","#a142ff","#3d5bff","#42cfff"]',
				description: "Brand hues (hex); order-independent, sorted cool→warm for the shell sweep",
			},
			{
				name: "hdr",
				type: "boolean",
				default: "true",
				description:
					"Opt into the GPU engine (WebGPU HDR first, then a WebGL2 fallback); when false, no engine boots",
			},
			{
				name: "exposure",
				type: "number",
				default: "2.2",
				description: "Display exposure multiplier, clamped to [1, 4]",
			},
			{
				name: "ambient",
				type: "boolean",
				default: "true",
				description: "Run the ambient auto-scheduler (Poisson-timed background shells)",
			},
			{
				name: "ambientIntensity",
				type: "number",
				default: "0.35",
				description: "Ambient energy [0,1] — scales shell size",
			},
			{
				name: "interactive",
				type: "boolean",
				default: "true",
				description: "Launch a shell toward the pointer on pointerdown",
			},
			{
				name: "quality",
				type: '"auto" | "high" | "mid" | "low"',
				default: '"auto"',
				description: "Particle budget; auto picks from the render level and device pixel ratio",
			},
			{
				name: "respectReducedMotion",
				type: "boolean",
				default: "true",
				description:
					"Force ambient off under prefers-reduced-motion (explicit launches still work)",
			},
			{
				name: "class",
				type: "string",
				default: '""',
				description: "Extra classes on the canvas wrapper",
			},
			{
				name: "ambientShells",
				type: "ShellKind[]",
				description:
					"Restrict the ambient scheduler to these shells, picked uniformly — including the pattern shells 'heart' and 'star'; defaults to a weighted peony/willow/ring mix ('glyph' and 'shape' are ignored, they need caller-supplied points)",
			},
			{
				name: "onReady",
				type: "(handle: FireworksHandle) => void",
				description:
					"Fired when the engine is live with an imperative handle, and again with a fresh handle after a recovered GPU context loss; never fired when no GPU renderer comes up",
			},
			{
				name: "onLost",
				type: "() => void",
				description:
					"Fired once when a GPU context loss could not be recovered; the component has torn itself down and any handle it gave out is inert",
			},
		],
	},

	"fluid-cursor": {
		name: "FluidCursor",
		slug: "fluid-cursor",
		description:
			"Full Navier-Stokes fluid simulation that swirls color in response to cursor and touch movement, running on WebGL2 with a WebGL1 fallback and an optional WebGPU HDR path for wide-gamut, brighter-than-white glow",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Inspira UI", url: "https://inspira-ui.com/components/cursor/fluid-cursor" },
		],
		tags: ["cursor", "webgl", "fluid", "simulation", "interactive"],
		props: [
			{
				name: "simResolution",
				type: "number",
				default: "128",
				description: "Simulation grid resolution",
			},
			{
				name: "dyeResolution",
				type: "number",
				default: "1440",
				description: "Dye/color buffer resolution",
			},
			{
				name: "captureResolution",
				type: "number",
				default: "512",
				description: "Capture buffer resolution",
			},
			{
				name: "densityDissipation",
				type: "number",
				default: "3.5",
				description: "Rate at which density fades",
			},
			{
				name: "velocityDissipation",
				type: "number",
				default: "2",
				description: "Rate at which velocity fades",
			},
			{ name: "pressure", type: "number", default: "0.1", description: "Pressure solver strength" },
			{
				name: "pressureIterations",
				type: "number",
				default: "20",
				description: "Number of pressure solver iterations",
			},
			{ name: "curl", type: "number", default: "3", description: "Amount of curl/vorticity" },
			{
				name: "splatRadius",
				type: "number",
				default: "0.2",
				description: "Radius of fluid splats",
			},
			{ name: "splatForce", type: "number", default: "6000", description: "Force of fluid splats" },
			{ name: "shading", type: "boolean", default: "true", description: "Enable fluid shading" },
			{
				name: "colorUpdateSpeed",
				type: "number",
				default: "10",
				description: "Speed of color changes",
			},
			{
				name: "backColor",
				type: "ColorRGB | string",
				default: "{ r: 0.5, g: 0, b: 0 }",
				description: "Background color",
			},
			{
				name: "transparent",
				type: "boolean",
				default: "true",
				description: "Transparent background",
			},
			{ name: "fluidColor", type: "string", description: "Override all fluid with a single color" },
			{
				name: "fluidColors",
				type: "string[]",
				description: "Array of colors to cycle through for fluid splats",
			},
			{
				name: "colorIntensity",
				type: "number",
				default: "0.15",
				description: "Intensity of color mixing",
			},
			{
				name: "autoSplat",
				type: "boolean",
				default: "false",
				description: "Automatically create random splats",
			},
			{
				name: "autoSplatInterval",
				type: "number",
				default: "1500",
				description: "Interval between auto-splats in ms",
			},
			{
				name: "interactive",
				type: "boolean",
				default: "true",
				description: "React to mouse/touch input",
			},
			{
				name: "pauseWhenHidden",
				type: "boolean",
				default: "true",
				description: "Pause simulation when tab is hidden",
			},
			{
				name: "splatOnMount",
				type: "boolean",
				default: "false",
				description: "Create a splat on mount",
			},
			{
				name: "allowMultiple",
				type: "boolean",
				default: "false",
				description: "Allow multiple instances simultaneously",
			},
			{
				name: "contained",
				type: "boolean",
				default: "true",
				description: "Confine simulation to parent container",
			},
			{
				name: "hdr",
				type: "boolean",
				default: "false",
				description:
					"Render via the WebGPU HDR engine — wide gamut + brighter-than-white glow on HDR displays. Needs Chrome/Edge 129+ or Safari 26+; falls back to wide-gamut WebGL (Chrome 104+, Safari 16.4+, Firefox 132+), then to standard rendering",
			},
			{
				name: "hdrBoost",
				type: "number",
				default: "1.5",
				description: "Display exposure multiplier in HDR mode, clamped to [1, 4]",
			},
			{
				name: "dither",
				type: "boolean",
				default: "false",
				description:
					"Experimental retro bitmap dithering — pixelates the fluid to a chunky grid and quantizes color with an ordered 4x4 Bayer threshold. Forces the WebGL renderer; hdr is ignored while set",
			},
			{
				name: "ditherPixelSize",
				type: "number",
				default: "3",
				description: "Size of one dithered pixel in CSS pixels, minimum 1",
			},
			{
				name: "ditherLevels",
				type: "number",
				default: "4",
				description: "Color levels per channel in dither mode, clamped to [2, 16]",
			},
		],
	},

	"glow-border": {
		name: "GlowBorder",
		slug: "glow-border",
		description:
			"Glowing ring that animates around a container's edge by sweeping a radial gradient's position, masked with CSS mask-composite so only the border ring is painted, supporting single or multi-color gradients",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/background-gradient" },
		],
		tags: ["border", "glow", "animation", "gradient", "decoration"],
		props: [
			{
				name: "borderRadius",
				type: "number",
				default: "10",
				description: "Border radius in pixels",
			},
			{
				name: "color",
				type: "string | string[]",
				default: '"#FFF"',
				description: "Glow color or array of colors for gradient",
			},
			{ name: "borderWidth", type: "number", default: "2", description: "Border width in pixels" },
			{
				name: "duration",
				type: "number",
				default: "10",
				description: "Animation duration in seconds",
			},
		],
	},

	"gradient-button": {
		name: "GradientButton",
		slug: "gradient-button",
		description: "Button with a rotating conic-gradient rainbow border effect",
		category: "buttons",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Inspira UI", url: "https://inspira-ui.com/components/buttons/gradient-button" },
		],
		tags: ["button", "gradient", "animation", "rainbow", "border", "cta"],
		props: [
			{
				name: "colors",
				type: "string[]",
				default:
					'["#FF0000","#FFA500","#FFFF00","#008000","#0000FF","#4B0082","#EE82EE","#FF0000"]',
				description: "Gradient colors for the conic-gradient border",
			},
			{
				name: "duration",
				type: "number",
				default: "2500",
				description: "Animation duration in milliseconds",
			},
			{ name: "borderWidth", type: "number", default: "2", description: "Border width in pixels" },
			{
				name: "borderRadius",
				type: "number",
				default: "8",
				description: "Border radius in pixels",
			},
			{
				name: "blur",
				type: "number",
				default: "4",
				description: "Blur amount for the gradient in pixels",
			},
			{
				name: "bgColor",
				type: "string",
				default: '"#000"',
				description: "Background color of the button content area",
			},
		],
		slots: [{ name: "children", description: "Button content" }],
	},

	"interactive-hover-button": {
		name: "InteractiveHoverButton",
		slug: "interactive-hover-button",
		description: "Button with interactive hover effect revealing alternate content",
		category: "buttons",
		group: "fancy",
		status: "done",
		credits: [
			{
				source: "Magic UI",
				url: "https://magicui.design/docs/components/interactive-hover-button",
			},
		],
		tags: ["button", "hover", "animation", "interactive", "reveal"],
		props: [
			{
				name: "text",
				type: "string",
				default: '"Button"',
				description: "Button label text (used when children slot is not provided)",
			},
		],
		slots: [{ name: "children", description: "Button content (overrides text prop)" }],
	},

	marquee: {
		name: "Marquee",
		slug: "marquee",
		description: "Infinite scrolling component for text, images, or cards",
		category: "layout",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/marquee" }],
		tags: ["marquee", "scrolling", "animation", "layout", "infinite"],
		props: [
			{
				name: "reverse",
				type: "boolean",
				default: "false",
				description: "Reverse the scroll direction",
			},
			{
				name: "pauseOnHover",
				type: "boolean",
				default: "false",
				description: "Pause animation on hover",
			},
			{
				name: "vertical",
				type: "boolean",
				default: "false",
				description: "Scroll vertically instead of horizontally",
			},
			{
				name: "repeat",
				type: "number",
				default: "4",
				description: "Number of times to repeat children for seamless loop",
			},
		],
		slots: [{ name: "children", description: "Content to repeat and scroll" }],
	},

	meteors: {
		name: "Meteors",
		slug: "meteors",
		description: "Animated meteor shower effect with randomized positions and delays",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/meteors" }],
		tags: ["animation", "meteors", "particles", "decoration", "space"],
		props: [
			{ name: "count", type: "number", default: "20", description: "Number of meteors to render" },
		],
	},

	"flickering-grid": {
		name: "FlickeringGrid",
		slug: "flickering-grid",
		description:
			"Canvas grid of squares that flicker in and out of opacity at random each frame, pausing automatically via IntersectionObserver when scrolled off-screen and resizing to fit its container via ResizeObserver",
		category: "backgrounds",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Magic UI", url: "https://magicui.design/docs/components/flickering-grid" },
		],
		tags: ["background", "grid", "canvas", "animation", "pattern"],
		props: [
			{
				name: "squareSize",
				type: "number",
				default: "4",
				description: "Size of each grid square in pixels",
			},
			{
				name: "gridGap",
				type: "number",
				default: "6",
				description: "Gap between squares in pixels",
			},
			{
				name: "flickerChance",
				type: "number",
				default: "0.3",
				description: "Probability of a square changing opacity each second (0-1)",
			},
			{
				name: "color",
				type: "string",
				default: '"#000000"',
				description: "Color of the squares (hex format)",
			},
			{
				name: "maxOpacity",
				type: "number",
				default: "0.3",
				description: "Maximum opacity of squares (0-1)",
			},
			{
				name: "width",
				type: "number",
				description: "Fixed width in pixels (defaults to container width)",
			},
			{
				name: "height",
				type: "number",
				description: "Fixed height in pixels (defaults to container height)",
			},
		],
	},

	"neon-border": {
		name: "NeonBorder",
		slug: "neon-border",
		description: "Dual-color neon glow border effect with optional rotation animation",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Magic UI", url: "https://magicui.design/docs/components/neon-gradient-card" },
		],
		tags: ["border", "neon", "glow", "animation", "gradient", "decoration"],
		props: [
			{ name: "color1", type: "string", default: '"#0496ff"', description: "First neon color" },
			{ name: "color2", type: "string", default: '"#ff0a54"', description: "Second neon color" },
			{
				name: "animationType",
				type: '"none" | "half" | "full"',
				default: '"half"',
				description: "Animation type: none (static), half (50% coverage), full (100% coverage)",
			},
			{
				name: "duration",
				type: "number",
				default: "6",
				description: "Animation duration in seconds",
			},
		],
		slots: [
			{ name: "children", description: "Content to display inside the neon border container" },
		],
	},

	"colourful-text": {
		name: "ColourfulText",
		slug: "colourful-text",
		description:
			"Per-character text animation where each glyph transitions to a new color from a shuffled palette, staggered across characters and reshuffling automatically every 5 seconds using pure CSS transitions",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/colourful-text" },
		],
		tags: ["text", "animation", "color", "gradient", "typography"],
		props: [
			{ name: "text", type: "string", description: "Text to animate", required: true },
			{
				name: "colors",
				type: "string[]",
				default: "[10 preset colors]",
				description: "Array of colors to cycle through",
			},
			{
				name: "startColor",
				type: "string",
				default: '"rgb(255, 255, 255)"',
				description: "Initial color before animation",
			},
			{
				name: "duration",
				type: "number",
				default: "0.5",
				description: "Transition duration in seconds for each character",
			},
		],
	},

	"flip-words": {
		name: "FlipWords",
		slug: "flip-words",
		description: "Cycling word animation with per-letter fade-in and blur effects",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/flip-words" }],
		tags: ["text", "animation", "words", "cycling", "typography", "blur"],
		props: [
			{
				name: "words",
				type: "string[]",
				description: "Array of words to cycle through",
				required: true,
			},
			{
				name: "duration",
				type: "number",
				default: "3000",
				description: "Time each word stays visible in ms",
			},
		],
	},

	"hyper-text": {
		name: "HyperText",
		slug: "hyper-text",
		description:
			"Text that scrambles into random uppercase letters and resolves character-by-character back to the original on hover, with a staggered per-letter reveal and an optional animate-on-load mode",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/hyper-text" }],
		tags: ["text", "animation", "scramble", "hover", "glitch", "typography"],
		props: [
			{ name: "text", type: "string", description: "Text to display and scramble", required: true },
			{
				name: "duration",
				type: "number",
				default: "800",
				description: "Total animation duration in ms",
			},
			{
				name: "animateOnLoad",
				type: "boolean",
				default: "false",
				description: "Whether to animate on initial load",
			},
		],
	},

	"letter-pullup": {
		name: "LetterPullup",
		slug: "letter-pullup",
		description: "Staggered letter pull-up animation with wave entrance effect",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/letter-pullup" }],
		tags: ["text", "animation", "letters", "stagger", "entrance", "typography"],
		props: [
			{
				name: "words",
				type: "string",
				description: "Text to animate (each character gets its own animation)",
				required: true,
			},
			{
				name: "delay",
				type: "number",
				default: "0.05",
				description: "Delay between each letter animation in seconds",
			},
		],
	},

	"number-ticker": {
		name: "NumberTicker",
		slug: "number-ticker",
		description: "Animated number counter with easing, triggered on viewport entry",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/number-ticker" }],
		tags: ["text", "counter", "animation", "number", "scroll", "statistics"],
		props: [
			{ name: "value", type: "number", default: "0", description: "Target number to animate to" },
			{
				name: "direction",
				type: '"up" | "down"',
				default: '"up"',
				description: 'Animation direction: "up" counts 0→value, "down" counts value→0',
			},
			{
				name: "duration",
				type: "number",
				default: "1000",
				description: "Animation duration in ms",
			},
			{
				name: "delay",
				type: "number",
				default: "0",
				description: "Delay before animation starts in ms",
			},
			{
				name: "decimalPlaces",
				type: "number",
				default: "0",
				description: "Number of decimal places to display",
			},
		],
	},

	"sparkles-text": {
		name: "SparklesText",
		slug: "sparkles-text",
		description:
			"Text overlaid with small SVG star sparkles that scale, rotate, and fade in a continuous loop, each one regenerating at a random position once its lifespan expires, cycling between two configurable colors",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/sparkles" }],
		tags: ["text", "sparkles", "animation", "stars", "decoration", "typography"],
		props: [
			{ name: "text", type: "string", description: "Text to display", required: true },
			{
				name: "sparklesCount",
				type: "number",
				default: "10",
				description: "Number of sparkle stars",
			},
			{
				name: "colors",
				type: "{ first: string; second: string }",
				default: '{ first: "#9E7AFF", second: "#FE8BBB" }',
				description: "Two colors for sparkle stars",
			},
		],
	},

	"box-reveal": {
		name: "BoxReveal",
		slug: "box-reveal",
		description:
			"Reveal animation where a solid color box slides left to right across content on viewport entry, unveiling it as it fades up into place underneath, triggered once via IntersectionObserver",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/box-reveal" }],
		tags: ["text", "animation", "reveal", "scroll", "entrance"],
		props: [
			{
				name: "color",
				type: "string",
				default: '"#5046e6"',
				description: "Color of the reveal box",
			},
			{
				name: "duration",
				type: "number",
				default: "0.5",
				description: "Animation duration in seconds",
			},
			{
				name: "delay",
				type: "number",
				default: "0.25",
				description: "Delay before animation starts in seconds",
			},
		],
		slots: [{ name: "children", description: "Content to reveal" }],
	},

	"card-3d": {
		name: "Card3D",
		slug: "card-3d",
		description: "Interactive 3D perspective card with depth effects on child elements",
		category: "cards",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/3d-card-effect" },
		],
		tags: ["card", "3d", "perspective", "hover", "animation", "interactive"],
		props: [
			{
				name: "containerClass",
				type: "string",
				default: '""',
				description: "CSS classes for the outer perspective wrapper",
			},
		],
		slots: [{ name: "children", description: "CardBody and CardItem elements" }],
	},

	"card-spotlight": {
		name: "CardSpotlight",
		slug: "card-spotlight",
		description:
			"Card whose radial-gradient spotlight tracks the cursor as it moves inside, fading in on hover and parking itself off-canvas when the pointer leaves, with configurable gradient size, color, and opacity",
		category: "cards",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/card-spotlight" },
		],
		tags: ["card", "spotlight", "mouse", "gradient", "interactive", "hover"],
		props: [
			{
				name: "slotClass",
				type: "string",
				default: '""',
				description: "CSS classes for the inner content wrapper",
			},
			{
				name: "gradientSize",
				type: "number",
				default: "200",
				description: "Size of the spotlight gradient in pixels",
			},
			{
				name: "gradientColor",
				type: "string",
				default: '"#262626"',
				description: "Color of the spotlight gradient",
			},
			{
				name: "gradientOpacity",
				type: "number",
				default: "0.8",
				description: "Opacity of the spotlight gradient",
			},
		],
		slots: [{ name: "children", description: "Card content" }],
	},

	"bento-grid": {
		name: "BentoGrid",
		slug: "bento-grid",
		description: "Bento-style grid layout with slot-based and props-based card variants",
		category: "cards",
		group: "fancy",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/bento-grid" }],
		tags: ["grid", "layout", "bento", "cards", "dashboard"],
		slots: [{ name: "children", description: "BentoGridItem components to arrange in the grid" }],
	},

	"flip-card": {
		name: "FlipCard",
		slug: "flip-card",
		description: "Card that flips to reveal back content on hover using CSS 3D transforms",
		category: "cards",
		group: "fancy",
		status: "done",
		tags: ["card", "flip", "3d", "hover", "animation", "interactive"],
		props: [
			{
				name: "rotate",
				type: '"x" | "y"',
				default: '"y"',
				description: "Axis of rotation for the flip effect",
			},
		],
		slots: [
			{ name: "children", description: "Front face content" },
			{ name: "back", description: "Back face content revealed on hover" },
		],
	},

	book: {
		name: "Book",
		slug: "book",
		description: "3D book component with cover, spine, and back face that opens on hover",
		category: "cards",
		group: "fancy",
		status: "done",
		credits: [{ source: "Inspira UI", url: "https://inspira-ui.com/components/cards/book" }],
		tags: ["card", "book", "3d", "hover", "animation"],
		props: [
			{
				name: "duration",
				type: "number",
				default: "1000",
				description: "Hover animation duration in ms",
			},
			{
				name: "color",
				type: "BookColor",
				default: '"zinc"',
				description: "Color theme for the book cover gradient",
			},
			{
				name: "isStatic",
				type: "boolean",
				default: "false",
				description: "Show book in open position without hover animation",
			},
			{ name: "size", type: "BookSize", default: '"md"', description: "Size variant of the book" },
			{ name: "radius", type: "BookRadius", default: '"md"', description: "Border radius variant" },
			{
				name: "shadowSize",
				type: "BookShadowSize",
				default: '"lg"',
				description: "Drop shadow size variant",
			},
		],
		slots: [{ name: "children", description: "Content rendered on the book cover (front face)" }],
	},

	"glare-card": {
		name: "GlareCard",
		slug: "glare-card",
		description: "Holographic trading card effect with mouse-tracking glare and rainbow foil",
		category: "cards",
		group: "fancy",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/glare-card" }],
		tags: ["card", "glare", "holographic", "mouse", "3d", "foil", "interactive"],
		slots: [
			{ name: "children", description: "Card content rendered inside the holographic surface" },
		],
	},

	"text-reveal-card": {
		name: "TextRevealCard",
		slug: "text-reveal-card",
		description: "Card that reveals text on horizontal mouse drag with animated star particles",
		category: "cards",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/text-reveal-card" },
		],
		tags: ["card", "text", "reveal", "drag", "interactive", "particles"],
		props: [
			{
				name: "starsCount",
				type: "number",
				default: "130",
				description: "Number of star particles in the background",
			},
			{
				name: "starsClass",
				type: "string",
				default: '""',
				description: "CSS classes for the stars container",
			},
		],
		slots: [
			{ name: "children", description: "Content rendered above the reveal area (e.g., title)" },
			{ name: "text", description: "Text shown in the revealed layer (dragged to reveal)" },
			{ name: "revealText", description: "Text visible in the background star layer" },
		],
	},

	"container-scroll": {
		name: "ContainerScroll",
		slug: "container-scroll",
		description: "Scroll-driven animation that rotates and scales a card from tilted to flat",
		category: "layout",
		group: "fancy",
		status: "done",
		credits: [
			{
				source: "Aceternity UI",
				url: "https://ui.aceternity.com/components/container-scroll-animation",
			},
		],
		tags: ["layout", "scroll", "animation", "3d", "perspective"],
		slots: [
			{
				name: "titleContent",
				description: "Header/title content that translates upward on scroll",
			},
			{
				name: "cardContent",
				description: "Content inside the animated card that tilts flat on scroll",
			},
		],
	},

	"container-text-flip": {
		name: "ContainerTextFlip",
		slug: "container-text-flip",
		description: "Text container that cycles through words with per-character blur animation",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [{ source: "Inspira UI", url: "https://inspira-ui.com/components/text/text-flip" }],
		tags: ["text", "animation", "words", "cycling", "blur", "typography"],
		props: [
			{
				name: "words",
				type: "string[]",
				default: '["better","modern","beautiful","awesome"]',
				description: "Array of words to cycle through",
			},
			{
				name: "interval",
				type: "number",
				default: "3000",
				description: "Time between word changes in ms",
			},
			{
				name: "animationDuration",
				type: "number",
				default: "700",
				description: "Per-character animation duration in ms",
			},
			{
				name: "textClass",
				type: "string",
				default: '""',
				description: "CSS classes for the text content span",
			},
		],
	},

	focus: {
		name: "Focus",
		slug: "focus",
		description: "Text component that cycles focus through words with blur and corner frame",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/focus-cards" }],
		tags: ["text", "animation", "focus", "blur", "words", "typography"],
		props: [
			{
				name: "sentence",
				type: "string",
				default: '"Fancy Focus"',
				description: "Space-separated words to cycle focus through",
			},
			{
				name: "manualMode",
				type: "boolean",
				default: "false",
				description: "Enable manual control via mouse hover instead of auto-cycling",
			},
			{
				name: "blurAmount",
				type: "number",
				default: "5",
				description: "Blur amount in pixels for unfocused words",
			},
			{
				name: "borderColor",
				type: "string",
				default: '"green"',
				description: "Color of the corner frame border",
			},
			{
				name: "animationDuration",
				type: "number",
				default: "0.5",
				description: "Transition duration in seconds",
			},
			{
				name: "pauseBetweenAnimations",
				type: "number",
				default: "1",
				description: "Pause between word cycles in seconds",
			},
		],
	},

	"frosted-glass": {
		name: "FrostedGlass",
		slug: "frosted-glass",
		description:
			"Frosted glass surface with organic turbulence-noise refraction, an alternative to LiquidGlass",
		category: "effects",
		group: "fancy",
		status: "done",
		tags: ["glass", "effect", "svg", "filter", "turbulence", "displacement", "blur", "navbar"],
		props: [
			{ name: "radius", type: "number", default: "24", description: "Border radius in pixels" },
			{
				name: "baseFrequency",
				type: "number",
				default: "0.008",
				description: "Turbulence noise frequency (lower = wider waves)",
			},
			{
				name: "numOctaves",
				type: "number",
				default: "2",
				description: "Turbulence octaves controlling noise detail",
			},
			{ name: "seed", type: "number", default: "92", description: "Turbulence random seed" },
			{
				name: "noiseBlur",
				type: "number",
				default: "2",
				description: "Gaussian blur softening the noise before displacement",
			},
			{ name: "scale", type: "number", default: "70", description: "Displacement intensity" },
			{
				name: "tint",
				type: "string",
				default: '"hsla(0, 0%, 100%, 0.25)"',
				description: "Overlay tint color",
			},
			{
				name: "highlight",
				type: "string",
				default: '"hsla(0, 0%, 100%, 0.75)"',
				description: "Specular rim highlight color",
			},
			{
				name: "border",
				type: "boolean",
				default: "true",
				description: "Show the conic-gradient glass border",
			},
			{
				name: "fallbackBlur",
				type: "number",
				default: "20",
				description: "Backdrop blur in pixels for the Safari fallback",
			},
			{
				name: "fallbackSaturation",
				type: "number",
				default: "180",
				description: "Backdrop saturation percentage for the Safari fallback",
			},
			{
				name: "containerClass",
				type: "string",
				default: '""',
				description: "CSS classes for the outer container",
			},
		],
		slots: [{ name: "children", description: "Content rendered on top of the glass" }],
	},

	"liquid-glass": {
		name: "LiquidGlass",
		slug: "liquid-glass",
		description: "Glass-like visual effect using SVG filters for chromatic displacement",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [
			{
				source: "Inspira UI",
				url: "https://inspira-ui.com/components/special-effects/liquid-glass",
			},
		],
		tags: ["glass", "effect", "svg", "filter", "chromatic", "displacement", "blur"],
		props: [
			{ name: "radius", type: "number", default: "16", description: "Border radius in pixels" },
			{
				name: "border",
				type: "number",
				default: "0.07",
				description: "Border thickness as fraction of min dimension",
			},
			{
				name: "lightness",
				type: "number",
				default: "50",
				description: "Background lightness percentage",
			},
			{
				name: "displace",
				type: "number",
				description: "Optional Gaussian blur on the displacement output",
			},
			{
				name: "blend",
				type: "string",
				default: '"difference"',
				description: "SVG blend mode for the displacement channels",
			},
			{
				name: "xChannel",
				type: '"R" | "G" | "B"',
				default: '"R"',
				description: "X displacement channel selector",
			},
			{
				name: "yChannel",
				type: '"R" | "G" | "B"',
				default: '"B"',
				description: "Y displacement channel selector",
			},
			{ name: "alpha", type: "number", default: "0.93", description: "Background fill alpha" },
			{
				name: "blur",
				type: "number",
				default: "11",
				description: "Blur applied to the background fill layer",
			},
			{
				name: "rOffset",
				type: "number",
				default: "0",
				description: "Red channel displacement offset",
			},
			{
				name: "gOffset",
				type: "number",
				default: "10",
				description: "Green channel displacement offset",
			},
			{
				name: "bOffset",
				type: "number",
				default: "20",
				description: "Blue channel displacement offset",
			},
			{ name: "scale", type: "number", default: "-180", description: "Displacement scale" },
			{ name: "frost", type: "number", default: "0.05", description: "Frosted glass opacity" },
			{
				name: "fallbackBlur",
				type: "number",
				default: "20",
				description: "Backdrop blur in pixels for the Safari fallback",
			},
			{
				name: "fallbackSaturation",
				type: "number",
				default: "180",
				description: "Backdrop saturation percentage for the Safari fallback",
			},
			{
				name: "containerClass",
				type: "string",
				default: '""',
				description: "CSS classes for the outer container",
			},
		],
		slots: [{ name: "children", description: "Content rendered inside the glass effect" }],
	},

	"smooth-cursor": {
		name: "SmoothCursor",
		slug: "smooth-cursor",
		description: "Physics-based smooth cursor with spring animations and rotation effects",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Inspira UI", url: "https://inspira-ui.com/components/cursor/smooth-cursor" },
		],
		tags: ["cursor", "animation", "spring", "physics", "interactive"],
		props: [
			{
				name: "springConfig",
				type: "SpringConfig",
				default: "{}",
				description: "Spring physics configuration with damping, stiffness, and mass",
			},
		],
		slots: [{ name: "cursor", description: "Custom cursor element (defaults to arrow SVG)" }],
	},

	"glowing-effect": {
		name: "GlowingEffect",
		slug: "glowing-effect",
		description: "Mouse-proximity based glowing border effect with animated conic gradient",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/glowing-effect" }],
		tags: ["border", "glow", "mouse", "gradient", "conic", "animation"],
		props: [
			{
				name: "blur",
				type: "number",
				default: "0",
				description: "Blur amount applied to the glow layer",
			},
			{
				name: "inactiveZone",
				type: "number",
				default: "0.7",
				description: "Fraction of element radius where glow is inactive",
			},
			{
				name: "proximity",
				type: "number",
				default: "0",
				description: "Extra pixel range outside element bounds where glow activates",
			},
			{
				name: "spread",
				type: "number",
				default: "20",
				description: "Angular spread of the conic gradient in degrees",
			},
			{
				name: "variant",
				type: '"default" | "white"',
				default: '"default"',
				description: "Color variant of the glow",
			},
			{
				name: "glow",
				type: "boolean",
				default: "false",
				description: "Always show glow regardless of mouse position",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "true",
				description: "Disable the glowing effect",
			},
			{
				name: "movementDuration",
				type: "number",
				default: "2",
				description: "Duration of the angle lerp animation",
			},
			{ name: "borderWidth", type: "number", default: "1", description: "Border width in pixels" },
		],
	},

	sparkles: {
		name: "Sparkles",
		slug: "sparkles",
		description:
			"Canvas-based floating particle sparkle effect with configurable density and colors",
		category: "backgrounds",
		group: "fancy",
		status: "done",
		credits: [{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/sparkles" }],
		tags: ["background", "particles", "canvas", "animation", "sparkles"],
		props: [
			{
				name: "background",
				type: "string",
				default: '"#0d47a1"',
				description: "Background color of the canvas container",
			},
			{
				name: "particleColor",
				type: "string",
				default: '"#ffffff"',
				description: "Color of the particles",
			},
			{
				name: "minSize",
				type: "number",
				default: "1",
				description: "Minimum particle radius in pixels",
			},
			{
				name: "maxSize",
				type: "number",
				default: "3",
				description: "Maximum particle radius in pixels",
			},
			{ name: "speed", type: "number", default: "4", description: "Particle speed multiplier" },
			{
				name: "particleDensity",
				type: "number",
				default: "120",
				description: "Number of particles",
			},
		],
	},

	confetti: {
		name: "Confetti",
		slug: "confetti",
		description:
			"Confetti celebration effect powered by canvas-confetti with button trigger support",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/confetti" }],
		tags: ["confetti", "celebration", "animation", "canvas", "particles"],
		props: [
			{
				name: "options",
				type: "ConfettiOptions",
				default: "{}",
				description: "canvas-confetti options passed to each fire() call",
			},
			{
				name: "globalOptions",
				type: "ConfettiGlobalOptions",
				default: "{}",
				description: "Global canvas-confetti initialization options",
			},
			{
				name: "manualStart",
				type: "boolean",
				default: "false",
				description: "Prevent auto-firing on mount; call fire() manually",
			},
		],
		slots: [{ name: "children", description: "ConfettiButton or other trigger elements" }],
	},

	ripple: {
		name: "Ripple",
		slug: "ripple",
		description:
			"Set of concentric circles that pulse in a staggered wave, each ring larger, more transparent, and more delayed than the last, with the outermost ring rendered dashed to suggest a fading signal",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/ripple" }],
		tags: ["animation", "ripple", "circles", "decoration", "pulse"],
		props: [
			{
				name: "baseCircleSize",
				type: "number",
				default: "210",
				description: "Diameter of the smallest (innermost) circle in pixels",
			},
			{
				name: "baseCircleOpacity",
				type: "number",
				default: "0.24",
				description: "Opacity of the innermost circle",
			},
			{
				name: "spaceBetweenCircle",
				type: "number",
				default: "70",
				description: "Extra pixels added to each successive circle",
			},
			{
				name: "circleOpacityDowngradeRatio",
				type: "number",
				default: "0.03",
				description: "Opacity reduction per circle outward",
			},
			{
				name: "circleClass",
				type: "string",
				default: '""',
				description: "Additional CSS classes applied to each circle",
			},
			{
				name: "waveSpeed",
				type: "number",
				default: "80",
				description: "Animation delay between circles in ms",
			},
			{
				name: "numberOfCircles",
				type: "number",
				default: "7",
				description: "Total number of concentric circles",
			},
		],
	},

	"text-generate-effect": {
		name: "TextGenerateEffect",
		slug: "text-generate-effect",
		description: "Typewriter-style text reveal that fades in words one by one with optional blur",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/text-generate-effect" },
		],
		tags: ["text", "animation", "typewriter", "reveal", "blur", "typography"],
		props: [
			{ name: "words", type: "string", description: "Text to reveal word by word", required: true },
			{
				name: "filter",
				type: "boolean",
				default: "true",
				description: "Apply blur filter during reveal animation",
			},
			{
				name: "duration",
				type: "number",
				default: "0.7",
				description: "Fade-in duration per word in seconds",
			},
			{
				name: "delay",
				type: "number",
				default: "0",
				description: "Initial delay before animation starts in ms",
			},
			{
				name: "stagger",
				type: "number",
				default: "200",
				description: "Delay between each word in ms",
			},
		],
	},

	"line-shadow-text": {
		name: "LineShadowText",
		slug: "line-shadow-text",
		description: "Text with animated diagonal line shadow pattern that scrolls continuously",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Magic UI", url: "https://magicui.design/docs/components/line-shadow-text" },
		],
		tags: ["text", "animation", "shadow", "pattern", "typography", "decoration"],
		props: [
			{ name: "text", type: "string", description: "Text content to display", required: true },
			{
				name: "shadowColor",
				type: "string",
				default: '"black"',
				description: "Color of the diagonal line shadow",
			},
			{
				name: "as",
				type: '"span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div"',
				default: '"span"',
				description: "HTML element to render as",
			},
		],
	},

	"tracing-beam": {
		name: "TracingBeam",
		slug: "tracing-beam",
		description: "Vertical SVG beam that highlights scroll progress alongside content",
		category: "effects",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Aceternity UI", url: "https://ui.aceternity.com/components/tracing-beam" },
		],
		tags: ["scroll", "animation", "svg", "beam", "progress", "sidebar"],
		slots: [
			{ name: "children", description: "Long-form content rendered alongside the tracing beam" },
		],
	},
	"displacement-text": {
		name: "DisplacementText",
		slug: "displacement-text",
		description: "3D text with WebGL displacement that follows the cursor using Three.js shaders",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [{ source: "VengenceUI", url: "https://vengenceui.com/docs/liquid-text" }],
		tags: ["text", "webgl", "3d", "displacement", "cursor", "shader", "threejs"],
		props: [
			{ name: "text", type: "string", default: '"Hover Me"', description: "Text to display" },
			{ name: "fontSize", type: "number", default: "200", description: "Font size in pixels" },
			{ name: "font", type: "string", default: '"Inter, sans-serif"', description: "Font family" },
			{ name: "color", type: "string", description: "Fixed text color (overrides theme colors)" },
			{
				name: "lightColor",
				type: "string",
				default: '"#000000"',
				description: "Text color in light mode",
			},
			{
				name: "darkColor",
				type: "string",
				default: '"#ffffff"',
				description: "Text color in dark mode",
			},
		],
	},

	"matrix-rain": {
		name: "MatrixRain",
		slug: "matrix-rain",
		description: "Canvas-based falling glyph rain with configurable color, speed, and density",
		category: "backgrounds",
		group: "fancy",
		status: "done",
		tags: ["background", "matrix", "canvas", "animation", "glyphs", "cyberpunk"],
		props: [
			{
				name: "color",
				type: "string",
				default: '"#00ff41"',
				description: "Glyph color (classic terminal green)",
			},
			{
				name: "speed",
				type: "number",
				default: "1.0",
				description: "Fall speed multiplier (< 1 slower, > 1 faster)",
			},
			{ name: "density", type: "number", default: "1.0", description: "Column density multiplier" },
			{
				name: "glyphSize",
				type: "number",
				default: "16",
				description: "Font size of each glyph in pixels",
			},
			{
				name: "fadeOpacity",
				type: "number",
				default: "0.05",
				description: "Opacity of the black overlay used to create trailing fade effect",
			},
		],
	},

	"terminal-text": {
		name: "TerminalText",
		slug: "terminal-text",
		description:
			"Terminal-style text streamer with per-character animation, blinking cursor, and glitch effect",
		category: "text",
		group: "fancy",
		status: "done",
		tags: ["text", "terminal", "animation", "typewriter", "glitch", "code"],
		props: [
			{
				name: "lines",
				type: "string[]",
				description: "Array of lines to stream character by character",
				required: true,
			},
			{
				name: "speed",
				type: "number",
				default: "40",
				description: "Delay between each character in ms",
			},
			{
				name: "delay",
				type: "number",
				default: "0",
				description: "Initial delay before streaming starts in ms",
			},
			{ name: "cursor", type: "boolean", default: "true", description: "Show blinking cursor" },
			{
				name: "cursorChar",
				type: "string",
				default: '"█"',
				description: "Character used as the cursor",
			},
			{
				name: "glitch",
				type: "boolean",
				default: "false",
				description: "Enable random character glitch effect after streaming",
			},
			{
				name: "onComplete",
				type: "() => void",
				description: "Callback fired when all lines finish streaming",
			},
		],
	},

	"noise-reveal": {
		name: "NoiseReveal",
		slug: "noise-reveal",
		description:
			"WebGL image reveal with a Perlin-noise dissolve mask, contracting radial gradient, and wave displacement",
		category: "media",
		group: "fancy",
		status: "done",
		credits: [
			{
				source: "Codrops",
				url: "https://tympanus.net/codrops/2024/12/02/how-to-code-a-shader-based-reveal-effect-with-react-three-fiber-glsl/",
			},
			{
				source: "colindmg/r3f-image-reveal-effect",
				url: "https://github.com/colindmg/r3f-image-reveal-effect",
			},
		],
		tags: ["media", "image", "reveal", "webgl", "shader", "threejs", "noise"],
		props: [
			{ name: "src", type: "string", description: "Image URL", required: true },
			{ name: "alt", type: "string", description: "Accessible label for the image" },
			{
				name: "trigger",
				type: '"view" | "manual"',
				default: '"view"',
				description: 'Reveal trigger: "view" = on viewport entry, "manual" = via revealed prop',
			},
			{
				name: "revealed",
				type: "boolean",
				default: "false",
				description: 'Manual reveal state (used with trigger="manual"; also allows re-hiding)',
			},
			{
				name: "duration",
				type: "number",
				default: "1.5",
				description: "Reveal animation duration in seconds",
			},
			{
				name: "delay",
				type: "number",
				default: "0",
				description: 'Delay before reveal in seconds (trigger="view")',
			},
		],
	},

	"liquid-text": {
		name: "LiquidText",
		slug: "liquid-text",
		description:
			"Big text that liquefies along the cursor's path via a raw-WebGL fluid solver, with chromatic-aberration fringing that relaxes back over time",
		category: "text",
		group: "fancy",
		status: "done",
		credits: [
			{ source: "Inspired by ryanritzenthaler.com (behavioral study)" },
			{ source: "Fluid solver after Pavel Dobryakov's WebGL fluid simulation" },
		],
		tags: ["text", "webgl", "fluid", "displacement", "cursor", "shader", "chromatic-aberration"],
		props: [
			{ name: "text", type: "string", default: '"Liquid"', description: "Text to display" },
			{
				name: "font",
				type: "string",
				default: '""',
				description: "Font family; empty string resolves via getComputedStyle(host).fontFamily",
			},
			{
				name: "fontSize",
				type: "number",
				default: "0",
				description: "Font size in pixels; 0 auto-fits to the container width",
			},
			{
				name: "fontWeight",
				type: "number | string",
				default: "700",
				description: "Font weight",
			},
			{
				name: "lightColor",
				type: "string",
				default: '"#000000"',
				description: "Text color in light mode",
			},
			{
				name: "darkColor",
				type: "string",
				default: '"#ffffff"',
				description: "Text color in dark mode",
			},
			{ name: "class", type: "string", description: "Additional CSS classes" },
			{
				name: "strength",
				type: "number",
				default: "0.5",
				description: "Geometric UV warp gain",
			},
			{
				name: "radius",
				type: "number",
				default: "160",
				description: "Splat radius in screen pixels",
			},
			{
				name: "forceGain",
				type: "number",
				default: "17",
				description: "Mouse-delta to force multiplier",
			},
			{
				name: "dissipation",
				type: "number",
				default: "0.98",
				description: "Per-frame velocity decay factor",
			},
			{
				name: "viscosity",
				type: "number",
				default: "4",
				description: "Jacobi viscous diffusion strength (8 iterations)",
			},
			{
				name: "chromaticRatio",
				type: "number",
				default: "0.2",
				description: "Chromatic offset as a ratio of the warp",
			},
			{
				name: "staticBelow",
				type: "number",
				default: "1024",
				description:
					"innerWidth at/below which the component renders as static DOM text (also used at mount)",
			},
			{
				name: "interactive",
				type: "boolean",
				default: "true",
				description: "Whether pointer movement drives the fluid simulation",
			},
			{
				name: "pauseWhenHidden",
				type: "boolean",
				default: "true",
				description: "Pause the render loop while the document is hidden",
			},
		],
	},

	// =========================================================================
	// AI — chat & agent surfaces
	// =========================================================================
	"pixel-loader": {
		name: "PixelLoader",
		slug: "pixel-loader",
		description:
			"Grid of pixels pulsing in a diagonal wave as a pre-token loading indicator for AI responses",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "reasoning", "loading", "indicator"],
		props: [
			{ name: "cols", type: "number", default: "5", description: "Number of pixel columns" },
			{ name: "rows", type: "number", default: "5", description: "Number of pixel rows" },
			{
				name: "cellSize",
				type: "number",
				default: "6",
				description: "Size of a single pixel in px",
			},
			{ name: "gap", type: "number", default: "2", description: "Space between pixels in px" },
			{
				name: "color",
				type: "string",
				default: '"var(--ft-pixel-color, currentColor)"',
				description: "Pixel colour, any CSS colour value",
			},
			{
				name: "speed",
				type: "number",
				default: "1.6",
				description: "Duration of one full pulse cycle in seconds",
			},
			{
				name: "label",
				type: "string",
				default: '"Loading"',
				description: "Accessible label announced by assistive tech",
			},
		],
	},
	"typing-indicator": {
		name: "TypingIndicator",
		slug: "typing-indicator",
		description:
			"Animated three-dot presence indicator with a staggered CSS wave, tuned to signal activity without pulling focus",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "indicator", "presence"],
		props: [
			{ name: "size", type: "number", default: "6", description: "Dot diameter in pixels" },
			{
				name: "color",
				type: "string",
				default: '"var(--ft-typing-color, currentColor)"',
				description: "Dot color; any CSS color or custom property expression",
			},
			{
				name: "speed",
				type: "number",
				default: "1.2",
				description: "Duration of one full animation cycle in seconds",
			},
			{
				name: "label",
				type: "string",
				default: '"Typing"',
				description: "Visually hidden text announced to assistive technology",
			},
		],
	},
	"thinking-indicator": {
		name: "ThinkingIndicator",
		slug: "thinking-indicator",
		description:
			"Live agent status line with a shimmering activity label and an elapsed timer, as a bare inline row or a bordered status pill",
		category: "ai-agents",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "agents", "reasoning", "status", "indicator"],
		props: [
			{
				name: "status",
				type: "string",
				description: 'What the agent is doing right now, e.g. "Reading files"',
				required: true,
			},
			{
				name: "running",
				type: "boolean",
				default: "true",
				description: "Whether the activity is in flight: drives the shimmer and the live timer",
			},
			{
				name: "variant",
				type: '"inline" | "pill"',
				default: '"inline"',
				description: "Bare text row, or a bordered chip with a leading pulse dot",
			},
			{
				name: "since",
				type: "number",
				description: "Epoch ms the activity started; the internal stopwatch ticks from it",
			},
			{
				name: "elapsedMs",
				type: "number",
				description: "Externally-driven elapsed time in ms; overrides the internal stopwatch",
			},
			{
				name: "showElapsed",
				type: "boolean",
				default: "true",
				description: "Show the elapsed duration alongside the status",
			},
		],
		slots: [
			{
				name: "done",
				description: "Rendered instead of the status label once running is false",
			},
		],
	},
	"streaming-text": {
		name: "StreamingText",
		slug: "streaming-text",
		description:
			"Renders a growing string as a live token stream: the appended delta lands tinted and settles, with an optional block cursor while the response is in flight",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "streaming", "text", "reasoning"],
		props: [
			{
				name: "text",
				type: "string",
				description: "The accumulated text so far, not the latest delta; reassign as chunks arrive",
				required: true,
			},
			{
				name: "streaming",
				type: "boolean",
				default: "false",
				description: "Show a soft block cursor after the last character",
			},
			{
				name: "markdown",
				type: "boolean",
				default: "false",
				description:
					"Render as markdown instead of the tinted plain-text stream; disables the delta tint",
			},
			{
				name: "settleMs",
				type: "number",
				default: "350",
				description: "How long a newly arrived chunk stays tinted in ms, plain mode only",
			},
			{
				name: "tintColor",
				type: "string",
				description: "Colour a chunk fades from, and the cursor's fill; sets --ft-tint-color",
			},
			{
				name: "onComplete",
				type: "() => void",
				description: "Called once when streaming goes from true to false",
			},
		],
	},
	"reasoning-panel": {
		name: "ReasoningPanel",
		slug: "reasoning-panel",
		description:
			"Collapsible reasoning trace that streams while the model thinks, then folds itself into a one-line summary",
		category: "ai-agents",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "agents", "reasoning", "disclosure", "streaming"],
		props: [
			{
				name: "text",
				type: "string",
				description: "The reasoning trace so far; hand over a longer string to stream more in",
				required: true,
			},
			{
				name: "streaming",
				type: "boolean",
				default: "false",
				description:
					"Whether the trace is still growing; drives the timer, shimmer, and autoscroll",
			},
			{
				name: "open",
				type: "boolean",
				description:
					"Expanded state (bindable). Left undefined, the panel opens while streaming and collapses 600ms after it ends, until the reader toggles it by hand",
			},
			{
				name: "label",
				type: "string",
				default: '"Reasoning"',
				description: "Header text",
			},
			{
				name: "since",
				type: "number",
				description: "Epoch ms the current burst started at; pins the live timer's origin",
			},
			{
				name: "durationMs",
				type: "number",
				description:
					"Final duration for the summary line; falls back to the duration the panel measured itself",
			},
			{
				name: "maxHeight",
				type: "string",
				default: '"12rem"',
				description: "Scroll height of the trace once expanded",
			},
			{
				name: "onToggle",
				type: "(open: boolean) => void",
				description: "Called on every open/close, by click or on the panel's own initiative",
			},
		],
	},
	"chat-message": {
		name: "ChatMessage",
		slug: "chat-message",
		description:
			"One conversation turn, aligned and dressed by its role, streaming its body while the answer arrives, with an action rail that fades in on hover and a version navigator underneath",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		dependencies: ["streaming-text"],
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "message", "compound", "streaming"],
		props: [
			{
				name: "role",
				type: '"user" | "assistant" | "system"',
				default: '"assistant"',
				description: "Who produced the turn; drives alignment, chrome, and the accessible name",
			},
			{
				name: "content",
				type: "string",
				default: '""',
				description:
					"The body so far, not the latest delta; reassign with a longer string as chunks arrive",
			},
			{
				name: "streaming",
				type: "boolean",
				default: "false",
				description: "Whether content is still growing; shows the trailing cursor",
			},
			{
				name: "markdown",
				type: "boolean",
				default: "false",
				description: "Render the body as markdown instead of a tinted plain-text stream",
			},
			{
				name: "timestamp",
				type: "Date | number",
				description:
					"When the turn was produced; rendered relative, with the exact time as its tooltip",
			},
		],
		slots: [
			{ name: "avatar", description: "Rendered beside the body: an image, initials, an icon" },
			{
				name: "children",
				description: "Replaces the default body rendering entirely; content is then ignored",
			},
			{
				name: "actions",
				description: "The action rail — put ChatMessageActions here; fades in on hover or focus",
			},
			{
				name: "footer",
				description: "Rendered under the body — where ChatMessageBranches belongs",
			},
		],
	},
	"prompt-suggestions": {
		name: "PromptSuggestions",
		slug: "prompt-suggestions",
		description:
			"Row of prompt pills that cascade in after a reply lands, offering the user a next turn without composing one",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "suggestions", "pills"],
		props: [
			{
				name: "suggestions",
				type: "string[]",
				description: "Prompt texts offered to the user, in display order",
				required: true,
			},
			{
				name: "onSelect",
				type: "(suggestion: string, index: number) => void",
				description: "Called with the chosen prompt and its index when a pill is activated",
			},
			{
				name: "visible",
				type: "boolean",
				default: "true",
				description: "Whether the pills are shown; flipping this to true replays the entrance",
			},
			{
				name: "staggerMs",
				type: "number",
				default: "60",
				description: "Delay between two consecutive pills entering, in milliseconds",
			},
			{
				name: "label",
				type: "string",
				default: '"Suggestions"',
				description: "Accessible name of the group wrapping the pills",
			},
		],
		slots: [
			{
				name: "item",
				description: "Custom pill content, receiving the suggestion and its index",
			},
		],
	},
	"chat-error": {
		name: "ChatError",
		slug: "chat-error",
		description:
			"Quiet inline failure banner for a chat turn: the error, an optional detail line, and a retry button that disables itself while the retry is in flight",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "error", "feedback", "retry"],
		props: [
			{
				name: "message",
				type: "string",
				default: '"Something went wrong"',
				description: "The failure line",
			},
			{
				name: "detail",
				type: "string",
				description: "Secondary muted line under the message, e.g. the error code",
			},
			{
				name: "onRetry",
				type: "() => void",
				description: "Pressing retry calls this; the retry button only exists when it is set",
			},
			{
				name: "retryLabel",
				type: "string",
				default: '"Retry"',
				description: "Label for the retry button",
			},
			{
				name: "retrying",
				type: "boolean",
				default: "false",
				description: "Whether a retry is in flight: disables the button and marks the row busy",
			},
		],
		slots: [
			{
				name: "icon",
				description: "Leading icon, replacing the default warning triangle",
			},
			{
				name: "children",
				description: "Rendered instead of the message and detail block",
			},
		],
	},
	"tool-call": {
		name: "ToolCall",
		slug: "tool-call",
		description:
			"One tool invocation in a disclosure card: status dot, tool name, duration, and the request and result payloads pretty-printed on expand",
		category: "ai-agents",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "agents", "tool", "disclosure"],
		props: [
			{
				name: "call",
				type: "ToolCallData",
				description:
					"The invocation to render: id, name, status, and whatever payloads exist so far",
				required: true,
			},
			{
				name: "open",
				type: "boolean",
				description:
					'Expanded state (bindable). Left undefined the card stays collapsed, except that a call with status "error" opens itself — until the reader toggles it by hand',
			},
			{
				name: "onToggle",
				type: "(open: boolean) => void",
				description: "Called on every open/close, by click or on the card's own initiative",
			},
		],
		slots: [
			{ name: "input", description: "Replaces the default request rendering; receives call.input" },
			{
				name: "output",
				description: "Replaces the default result rendering; receives call.output",
			},
			{ name: "icon", description: "Leading icon, replacing the default wrench" },
		],
	},
	"tool-timeline": {
		name: "ToolTimeline",
		slug: "tool-timeline",
		description:
			"Compact session summary of an agent's tool calls: one row per action on a vertical rail, with the target it touched, its diff stats, and when it ran",
		category: "ai-agents",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "agents", "tool", "timeline", "activity"],
		props: [
			{
				name: "items",
				type: "ToolTimelineItemData[]",
				description: "The agent's activity log, oldest first",
				required: true,
			},
			{
				name: "onSelect",
				type: "(item: ToolTimelineItemData, index: number) => void",
				description: "Called when a row is activated; supplying it turns every row into a button",
			},
			{
				name: "compact",
				type: "boolean",
				default: "false",
				description: "Tighter rows with the detail line dropped",
			},
			{
				name: "label",
				type: "string",
				default: '"Activity"',
				description: "Accessible name for the list",
			},
		],
		slots: [
			{
				name: "item",
				description: "Replaces the built-in row body, keeping the rail and its dot",
			},
		],
	},
	"terminal-block": {
		name: "TerminalBlock",
		slug: "terminal-block",
		description:
			"Live command transcript: the prompt line, output as it streams in with its ANSI colours read, a block cursor while it runs, and an exit-status footer when it stops",
		category: "ai-agents",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "agents", "terminal", "streaming", "output"],
		props: [
			{
				name: "output",
				type: "string",
				description:
					"Everything the command has printed so far, not the latest chunk; reassign as lines arrive",
				required: true,
			},
			{
				name: "command",
				type: "string",
				description: "The command that produced the output, shown after the prompt glyph",
			},
			{
				name: "prompt",
				type: "string",
				default: '"$"',
				description: "Prompt glyph in front of the command",
			},
			{
				name: "running",
				type: "boolean",
				default: "false",
				description: "Whether the command is still running: shows the cursor, pins the scroll",
			},
			{
				name: "exitCode",
				type: "number | null",
				default: "null",
				description: "Anything other than null ends the run and shows the status footer",
			},
			{
				name: "durationMs",
				type: "number",
				description: "How long the run took, shown next to the exit status",
			},
			{
				name: "ansi",
				type: "boolean",
				default: "true",
				description:
					"Read the SGR subset and colour the output; false still strips the escapes, it just paints nothing",
			},
			{
				name: "maxHeight",
				type: "string",
				default: '"20rem"',
				description: "Height at which the output starts scrolling",
			},
		],
		slots: [
			{
				name: "header",
				description: "Title bar above the output — window dots, a file name, a copy button",
			},
		],
	},
	"code-diff": {
		name: "CodeDiff",
		slug: "code-diff",
		description:
			"Unified diff tuned for chat width: one foldable card per file, tinted add/delete rows, and a copy-safe gutter",
		category: "ai-agents",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "agents", "diff", "code", "review"],
		props: [
			{
				name: "diff",
				type: "string",
				description:
					"Raw unified diff text, headers and all; parsed on every change, so a patch still arriving can be handed over as it grows",
				required: true,
			},
			{
				name: "filename",
				type: "string",
				description: "Header label when the patch names no file, or names exactly one",
			},
			{
				name: "lineNumbers",
				type: "boolean",
				default: "true",
				description: "Whether to show the old/new line-number gutters",
			},
			{
				name: "collapsed",
				type: "boolean",
				default: "false",
				description:
					"Whether the bodies are folded away (bindable). Set it and the whole patch folds; a click folds one file and writes back whether anything is left open",
			},
			{
				name: "maxLines",
				type: "number",
				default: "0",
				description:
					'Lines shown per file before the rest hide behind a "Show N more lines" button; 0 shows everything',
			},
			{
				name: "wrap",
				type: "boolean",
				default: "false",
				description: "Whether long lines wrap instead of scrolling sideways",
			},
		],
	},
	sources: {
		name: "Sources",
		slug: "sources",
		description:
			"The citations under an answer: a pill carrying a stack of domain monograms and a count, expanding into scannable source cards with title, host, and the line worth reading",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "citations", "sources", "compound"],
		props: [
			{
				name: "sources",
				type: "SourceData[]",
				description: "The documents backing the answer, in reading order",
				required: true,
			},
			{
				name: "open",
				type: "boolean",
				default: "false",
				description: "Whether the list is expanded; bindable",
			},
			{
				name: "onToggle",
				type: "(open: boolean) => void",
				description:
					"Called when the pill is clicked, with the state it moved to; driving open yourself does not fire it",
			},
		],
		slots: [
			{
				name: "children",
				description:
					"Replaces the default trigger-and-list composition entirely; omit it and the root renders both",
			},
			{
				name: "item",
				description:
					"On SourcesList — replaces the default card; receives the source and its index",
			},
			{
				name: "icon",
				description: "On SourceCard — replaces the monogram: a favicon you host, a logo",
			},
		],
	},
	"inline-citation": {
		name: "InlineCitation",
		slug: "inline-citation",
		description:
			"A numbered reference that sits inside a sentence and reveals the document behind it — title, domain and snippet — in a floating card on hover or focus",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		dependencies: ["sources"],
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "citations", "tooltip"],
		props: [
			{
				name: "source",
				type: "SourceData",
				description: "The document being cited; its title, domain and snippet fill the card",
				required: true,
			},
			{
				name: "index",
				type: "number",
				description: "The reference number shown in the marker, e.g. 3 renders [3]",
				required: true,
			},
			{
				name: "href",
				type: "string",
				default: "source.url",
				description:
					"Link target; an explicit empty string renders an unlinked marker that only reveals the card",
			},
			{
				name: "onOpen",
				type: "() => void",
				description: "Called each time the card appears, once per appearance rather than per hover",
			},
		],
		slots: [
			{
				name: "preview",
				description: "Replaces the default card body; receives the source",
			},
		],
	},
	"web-search": {
		name: "WebSearch",
		slug: "web-search",
		description:
			"A search the agent ran: the query in a search-bar header, an indeterminate scanning bar while it runs, and results that land one row at a time",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "search", "results", "knowledge"],
		props: [
			{
				name: "query",
				type: "string",
				description: "What the agent looked up, shown in the search-bar header",
				required: true,
			},
			{
				name: "results",
				type: "SearchResultData[]",
				description: "Hits found so far, oldest first; appending to it lands a new row",
				required: true,
			},
			{
				name: "searching",
				type: "boolean",
				default: "false",
				description:
					"Whether the lookup is still running: drives the scanning bar and the waiting state",
			},
			{
				name: "onSelect",
				type: "(result: SearchResultData, index: number) => void",
				description: "Called when a row is activated; supplying it turns every row into a button",
			},
			{
				name: "maxVisible",
				type: "number",
				default: "0",
				description: "Rows shown before the expander takes over; 0 shows every result",
			},
			{
				name: "label",
				type: "string",
				default: '"Web search"',
				description: "Accessible name for the whole block",
			},
		],
		slots: [
			{
				name: "item",
				description: "Replaces the built-in row body, keeping the row element and its behaviour",
			},
		],
	},
	"image-generation": {
		name: "ImageGeneration",
		slug: "image-generation",
		description:
			"Fixed frame that holds its place while a model draws: an empty outline, then a pixel grid working over a drifting dot field, then the finished image easing out of a blur",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		dependencies: ["pixel-loader"],
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "image", "generation", "media"],
		props: [
			{
				name: "status",
				type: '"idle" | "generating" | "done" | "error"',
				description: "Which stage of the generation to render",
				required: true,
			},
			{
				name: "src",
				type: "string | null",
				description: 'The generated image, shown once status is "done"',
			},
			{
				name: "alt",
				type: "string",
				description: "Describes the image to assistive tech — typically the prompt",
				required: true,
			},
			{
				name: "aspectRatio",
				type: "string",
				default: '"1 / 1"',
				description: "CSS aspect-ratio of the frame, holding the layout across every state",
			},
			{
				name: "prompt",
				type: "string",
				description: "Muted caption line under the frame",
			},
			{
				name: "errorText",
				type: "string",
				default: '"Generation failed"',
				description: "The failure line shown in the error state",
			},
			{
				name: "onRetry",
				type: "() => void",
				description: "Pressing retry calls this; the retry button only exists when it is set",
			},
			{
				name: "onLoad",
				type: "() => void",
				description: "Called once the generated image has finished loading",
			},
		],
	},
	"agent-plan": {
		name: "AgentPlan",
		slug: "agent-plan",
		description:
			"Glanceable checklist of an agent's plan: a done/total count and completion bar over one row per step, with a status glyph, an optional detail line, and substeps indented under a rail",
		category: "ai-agents",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "agents", "plan", "checklist", "progress"],
		props: [
			{
				name: "steps",
				type: "PlanStepData[]",
				description:
					"The plan, in the order the agent means to work through it; nests one level via substeps",
				required: true,
			},
			{
				name: "label",
				type: "string",
				default: '"Plan"',
				description: "Header text, sitting beside the done/total count",
			},
			{
				name: "showProgress",
				type: "boolean",
				default: "true",
				description:
					"Whether the thin completion bar shows under the header; its fraction counts substeps as steps",
			},
			{
				name: "onSelect",
				type: "(step: PlanStepData) => void",
				description: "Called when a row is activated; supplying it turns every row into a button",
			},
		],
		slots: [
			{
				name: "item",
				description:
					"Replaces the built-in row body, keeping the glyph and the indent; receives the step and its position in visual order",
			},
		],
	},
	"subagent-list": {
		name: "SubagentList",
		slug: "subagent-list",
		description:
			"Fan-out panel for parallel workers: one row per delegated agent with its status dot, model badge, task, and its own progress bar",
		category: "ai-agents",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "agents", "parallel", "progress", "workers"],
		props: [
			{
				name: "agents",
				type: "SubagentData[]",
				description:
					"The delegated workers, in the order they were spawned: id, name, task, status, and optionally progress and model",
				required: true,
			},
			{
				name: "label",
				type: "string",
				description:
					'Accessible name for the list. Left unset it is derived from the statuses — "2 agents running" while anything runs, "3 agents finished" once the last one lands',
			},
			{
				name: "onSelect",
				type: "(agent: SubagentData, index: number) => void",
				description: "Called when a row is activated; supplying it turns every row into a button",
			},
			{
				name: "compact",
				type: "boolean",
				default: "false",
				description: "Tighter rows with the task line dropped",
			},
		],
		slots: [
			{
				name: "item",
				description: "Replaces the built-in row body, keeping the status dot",
			},
		],
	},
	"approval-card": {
		name: "ApprovalCard",
		slug: "approval-card",
		description:
			"A human-in-the-loop gate before a side effect: the agent states what it is about to do, and the footer swaps its approve and deny buttons for a one-line verdict once someone decides",
		category: "ai-agents",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "agents", "approval", "human-in-the-loop", "gate"],
		props: [
			{
				name: "title",
				type: "string",
				description: 'What permission is being asked for, e.g. "Run database migration"',
				required: true,
			},
			{
				name: "description",
				type: "string",
				description: "Muted second line under the title — the consequence, the blast radius",
			},
			{
				name: "state",
				type: '"pending" | "approved" | "denied"',
				default: '"pending"',
				description:
					"Which side of the gate we are on (bindable). Buttons exist only while pending; writing a resolved value from outside settles the card without firing a callback",
			},
			{
				name: "destructive",
				type: "boolean",
				default: "false",
				description:
					"Marks the action as irreversible: red approve button, a warning tint on the card, and an alert mark on the shield so the warning is not carried by colour alone",
			},
			{
				name: "approveLabel",
				type: "string",
				default: '"Approve"',
				description: "Label for the approve button",
			},
			{
				name: "denyLabel",
				type: "string",
				default: '"Deny"',
				description: "Label for the deny button",
			},
			{
				name: "onApprove",
				type: "() => void",
				description: "Called when approve is pressed, after state has been written",
			},
			{
				name: "onDeny",
				type: "() => void",
				description: "Called when deny is pressed, after state has been written",
			},
			{
				name: "busy",
				type: "boolean",
				default: "false",
				description:
					"The consumer is executing the decision: both buttons go disabled and the card is marked aria-busy",
			},
		],
		slots: [
			{
				name: "children",
				description:
					"Detail region between the header and the footer — a diff, a command preview, the payload about to be posted",
			},
		],
	},
	"recommendation-card": {
		name: "RecommendationCard",
		slug: "recommendation-card",
		description:
			"An agent's proposal awaiting an answer: a kicker, the recommendation, a confidence figure counted up beside a ring that fills to match, and two buttons that collapse into one quiet resolved line",
		category: "ai-agents",
		group: "fancy",
		status: "done",
		dependencies: ["number-ticker"],
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "agents", "recommendation", "confidence"],
		props: [
			{
				name: "title",
				type: "string",
				description: 'What the agent is proposing, e.g. "Add an index on orders.customer_id"',
				required: true,
			},
			{
				name: "description",
				type: "string",
				description: "Secondary muted line under the title — the reasoning, the expected effect",
			},
			{
				name: "confidence",
				type: "number",
				description:
					"How sure the agent is, from 0 to 1. Omitted, the whole confidence block disappears rather than reading as zero; out-of-range numbers are clamped and the band shifts colour at 0.75 and 0.5",
			},
			{
				name: "acceptLabel",
				type: "string",
				default: '"Apply"',
				description: "Label for the confirm button",
			},
			{
				name: "dismissLabel",
				type: "string",
				default: '"Dismiss"',
				description: "Label for the decline button",
			},
			{
				name: "onAccept",
				type: "() => void",
				description: "Called when the recommendation is accepted, after `state` has been written",
			},
			{
				name: "onDismiss",
				type: "() => void",
				description: "Called when the recommendation is dismissed, after `state` has been written",
			},
			{
				name: "state",
				type: '"open" | "accepted" | "dismissed"',
				default: '"open"',
				description:
					"Where the recommendation stands (bindable). Resolving swaps the buttons for a quiet line inside a polite live region; a resolved card refuses to resolve again",
			},
			{
				name: "badge",
				type: "string",
				description: 'Small kicker above the title, e.g. "Suggestion"',
			},
		],
		slots: [
			{
				name: "children",
				description:
					"The detail region between the header and the footer — a snippet of the change being proposed",
			},
		],
	},
	"artifact-card": {
		name: "ArtifactCard",
		slug: "artifact-card",
		description:
			"A generated document as a tangible object: title, kind, a version navigator, and the first six lines of the text itself streaming in behind a fade",
		category: "ai-agents",
		group: "fancy",
		status: "done",
		dependencies: ["streaming-text"],
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "agents", "artifact", "document", "versioned", "streaming"],
		props: [
			{
				name: "title",
				type: "string",
				description: "What the document is called",
				required: true,
			},
			{
				name: "kind",
				type: "string",
				default: '"Document"',
				description: "The kind of thing it is, on the muted line under the title",
			},
			{
				name: "version",
				type: "number",
				description: "Which revision is on screen, 1-based; rendered as v3",
			},
			{
				name: "versionCount",
				type: "number",
				description: "How many revisions exist; with version the badge reads v3/5",
			},
			{
				name: "onVersionChange",
				type: "(version: number) => void",
				description:
					"Asked for another revision by 1-based number, never one outside its bounds; supplying it turns the badge into a navigator",
			},
			{
				name: "status",
				type: '"idle" | "streaming" | "done" | "error"',
				default: '"done"',
				description:
					"Where the document is in its life; streaming sweeps the top edge and trails a cursor, error grows a tinted footer",
			},
			{
				name: "preview",
				type: "string",
				description:
					"The text so far, not the latest delta; clamped to roughly six lines behind a bottom fade",
			},
			{
				name: "onOpen",
				type: "() => void",
				description:
					"Asked to open the document; supplying it makes the whole card activatable by click, Enter, or Space",
			},
		],
		slots: [
			{
				name: "actions",
				description:
					"Buttons for the top-right rail; each keeps its own click, without opening the card",
			},
		],
	},
	"ai-data-table": {
		name: "AiDataTable",
		slug: "ai-data-table",
		description:
			"Compact comparison table for a model's structured answer: real table semantics, tabular numeric columns, check-or-dash booleans, and one tintable column — rendered in the order it arrived, with no sorting",
		category: "ai-agents",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "agents", "table", "comparison", "structured-output"],
		props: [
			{
				name: "columns",
				type: "AiDataTableColumn[]",
				description:
					"Columns in render order: key, label, and optional align / numeric. A numeric column gets tabular figures and right alignment",
				required: true,
			},
			{
				name: "rows",
				type: "AiDataTableRow[]",
				description:
					"Rows keyed by column key, in the order the model produced them; a missing key renders as empty",
				required: true,
			},
			{
				name: "caption",
				type: "string",
				description:
					"Names the table for assistive tech; rendered in a visually-hidden <caption> unless captionVisible",
			},
			{
				name: "captionVisible",
				type: "boolean",
				default: "false",
				description: "Also shows the caption, as a muted line above the table",
			},
			{
				name: "dense",
				type: "boolean",
				default: "false",
				description: "Tighter rows, for a table read at a glance rather than studied",
			},
			{
				name: "highlightColumn",
				type: "string",
				description:
					"Key of the column to tint — the recommendation, or whichever criterion decided it",
			},
		],
		slots: [
			{
				name: "cell",
				description:
					"Replaces the default rendering of every cell; receives the raw value and { row, key }",
			},
		],
	},
	composer: {
		name: "Composer",
		slug: "composer",
		description:
			"The input at the bottom of a chat, taken apart: a root that owns the draft and eight parts that read it — a growing textarea, a send button that becomes a stop button, a toolbar, a model picker, an attachment row with its chips, and a completion menu you can mount twice on the same draft for / commands and @ mentions",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "composer", "input", "compound"],
		props: [
			{
				name: "value",
				type: "string",
				default: '""',
				description:
					"The draft text, bindable. Cleared by a successful submit; the attachments are not, since only the consumer knows whether an upload is still in flight",
			},
			{
				name: "attachments",
				type: "AttachmentData[]",
				default: "[]",
				description:
					"Files riding along with the draft, bindable. The consumer owns uploading them and pushing the results here",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description:
					"Blocks typing, sending, and attaching. Every part reads it off the context, so one flag takes the whole composition inert",
			},
			{
				name: "streaming",
				type: "boolean",
				default: "false",
				description:
					"A response is arriving: the send button becomes a stop button, the textarea goes readonly rather than disabled, and a submit is refused whatever triggered it",
			},
			{
				name: "placeholder",
				type: "string",
				description:
					"Placeholder for the default input. Ignored once children replaces the composition — the ComposerInput inside it carries its own",
			},
			{
				name: "onSubmit",
				type: "(payload: { text: string; attachments: AttachmentData[] }) => void",
				description:
					"Called with the trimmed draft and a snapshot of the attachments. Never fires on an empty draft that carries no files",
			},
			{
				name: "onStop",
				type: "() => void",
				description: "Called when the stop button is pressed while streaming",
			},
			{
				name: "onAttach",
				type: "(files: File[]) => void",
				description:
					"Called with the files handed to the picker. Upload them, then push the results onto attachments — the composer never uploads anything itself",
			},
		],
		slots: [
			{
				name: "children",
				description:
					"Replaces the default input-and-send-row composition entirely: mount the parts in whatever order the layout needs",
			},
			{
				name: "accessory",
				description:
					"An overlay covering the composer — a voice panel, a drop target, a confirmation. It sits above the composition rather than replacing it, so the draft is still there when it lifts",
			},
		],
	},
	"voice-input": {
		name: "VoiceInput",
		slug: "voice-input",
		description:
			"A mic button that opens into a recording panel: a live waveform painted from amplitude levels you supply, a stopwatch, the transcript as it arrives, and a cross and a check to throw it away or keep it",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "voice", "waveform", "input"],
		props: [
			{
				name: "active",
				type: "boolean",
				default: "false",
				description:
					"Whether a recording is in progress (bindable). Every button writes through it; setting it from outside opens or closes the panel without firing a callback",
			},
			{
				name: "transcript",
				type: "string",
				default: '""',
				description:
					"Live text pushed by the consumer as their recogniser produces it, rendered muted under the waveform; a growing string grows in place",
			},
			{
				name: "samples",
				type: "ArrayLike<number>",
				description:
					"Amplitude levels in 0..1 bridged from your own audio pipeline, one entry per bar. The component never opens a microphone itself",
			},
			{
				name: "demo",
				type: "boolean",
				default: "false",
				description:
					"Draw a deterministic synthetic wave when no samples arrive, so the panel is legible on a page with no audio behind it. Real samples always win",
			},
			{
				name: "onStart",
				type: "() => void",
				description: "Called when the mic button starts a recording",
			},
			{
				name: "onStop",
				type: "() => void",
				description: "Called when the check ends the recording and keeps the transcript",
			},
			{
				name: "onCancel",
				type: "() => void",
				description: "Called when the cross abandons the recording",
			},
			{
				name: "height",
				type: "number",
				default: "48",
				description: "Waveform height in CSS pixels, clamped to 16..240",
			},
			{
				name: "color",
				type: "string",
				default: "var(--ft-voice-color, currentColor)",
				description:
					"Any CSS colour for the bars, including a var() or currentColor — written onto the canvas as its CSS color and read back resolved, because a 2D context understands neither",
			},
		],
	},
	"context-ring": {
		name: "ContextRing",
		slug: "context-ring",
		description:
			"How much of the context window is gone, in the space of a favicon: a donut that fills as the conversation grows, the compact count beside it, and an optional popover breaking the total down by what is holding it",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "tokens", "context", "indicator"],
		props: [
			{
				name: "usage",
				type: "TokenUsageData",
				description:
					"Context-window consumption: tokens used, out of how many, and optionally the breakdown rows the popover lists",
				required: true,
			},
			{
				name: "size",
				type: "number",
				default: "28",
				description: "Outer diameter of the ring, in pixels; drives the viewBox and the radius",
			},
			{
				name: "strokeWidth",
				type: "number",
				default: "3",
				description:
					"Thickness of the track and the arc, in pixels; clamped to the radius so a thick ring cannot eat its own centre",
			},
			{
				name: "showLabel",
				type: "boolean",
				default: "true",
				description:
					'Whether the compact "12.4k / 200k" figure is shown beside the ring — exact under a thousand, one decimal under 100k, rounded above',
			},
			{
				name: "warnAt",
				type: "number",
				default: "0.75",
				description:
					"Fraction at which the ring leaves the quiet band and takes the running colour",
			},
			{
				name: "criticalAt",
				type: "number",
				default: "0.9",
				description:
					"Fraction at which the ring takes the error colour. Floored at warnAt, so a threshold set below the warning cannot create a band that never wins",
			},
			{
				name: "label",
				type: "string",
				default: '"Context usage"',
				description:
					"Accessible name for the meter, and — when expandable — for the button that contains it",
			},
			{
				name: "expandable",
				type: "boolean",
				default: "false",
				description:
					"Turns the ring into a button that toggles a popover listing usage.breakdown; closes on Escape, on a click outside, or on a second press",
			},
		],
	},
	"scroll-anchor": {
		name: "ScrollAnchor",
		slug: "scroll-anchor",
		description:
			"A scroll region that stays pinned to its last line while content streams in, lets go when the reader scrolls up, and floats a pill offering the way back down",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "scroll", "streaming", "utility"],
		props: [
			{
				name: "active",
				type: "boolean",
				default: "true",
				description:
					"Whether the region pins itself to the bottom as content arrives — bind it to your streaming flag. False leaves an ordinary scroll box, and hides the return button with it",
			},
			{
				name: "bottomThreshold",
				type: "number",
				default: "40",
				description: "How close to the bottom (px) still counts as pinned",
			},
			{
				name: "returnLabel",
				type: "string",
				default: '"Jump to latest"',
				description: "Label on the floating return button, and its accessible name",
			},
			{
				name: "showReturn",
				type: "boolean",
				default: "true",
				description:
					"Whether the floating return button appears once the reader scrolls away from the bottom",
			},
			{
				name: "maxHeight",
				type: "string",
				default: '"100%"',
				description: "Height cap on the scrolling region — any CSS length",
			},
			{
				name: "onStickChange",
				type: "(stuck: boolean) => void",
				description: "Called when the region pins itself or lets go, never on every scroll",
			},
		],
		slots: [{ name: "children", description: "The scrolling content" }],
	},
	"thread-list": {
		name: "ThreadList",
		slug: "thread-list",
		description:
			"Conversation history for a chat sidebar: one row per thread with an unread dot, its last message, and a relative timestamp, plus selection and per-row delete",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "threads", "history", "navigation"],
		props: [
			{
				name: "threads",
				type: "ThreadData[]",
				description: "The conversations to list, in the order they should appear",
				required: true,
			},
			{
				name: "activeId",
				type: "string",
				description:
					"Id of the selected conversation (bindable). A click writes the new id back whether or not onSelect is supplied",
			},
			{
				name: "onSelect",
				type: "(thread: ThreadData) => void",
				description: "Called with the conversation the reader picked",
			},
			{
				name: "onDelete",
				type: "(thread: ThreadData) => void",
				description: "Supplying it puts a delete button on every row, revealed on hover or focus",
			},
			{
				name: "label",
				type: "string",
				default: '"Conversations"',
				description: "Accessible name for the list",
			},
		],
		slots: [
			{
				name: "item",
				description:
					"Replaces the built-in row body; receives the thread and whether it is the active one",
			},
			{
				name: "empty",
				description: 'Replaces the built-in "No conversations yet" line',
			},
		],
	},
	"chat-panel": {
		name: "ChatPanel",
		slug: "chat-panel",
		description:
			"The shell a conversation lives in: a sticky header, a transcript that pins itself to the bottom while an answer arrives and offers the way back once you scroll up, and a sticky composer row",
		category: "ai-chat",
		group: "fancy",
		status: "done",
		credits: [{ source: "assistant-ui", url: "https://www.assistant-ui.com/elements" }],
		tags: ["ai", "chat", "panel", "shell", "compound"],
		props: [
			{
				name: "streaming",
				type: "boolean",
				default: "false",
				description:
					"Whether a reply is still arriving; pins the transcript to its bottom until the reader scrolls up",
			},
			{
				name: "empty",
				type: "boolean",
				default: "false",
				description: "Renders the emptyState snippet in place of the message stream",
			},
			{
				name: "returnLabel",
				type: "string",
				default: '"Jump to latest"',
				description: "Label on the pill offered once the reader scrolls away from the bottom",
			},
		],
		slots: [
			{ name: "header", description: "Sticky top region: a title, a model name, a close button" },
			{ name: "children", description: "The message stream, filling the scroll region" },
			{ name: "composer", description: "Sticky bottom region — where Composer belongs" },
			{
				name: "emptyState",
				description: "Rendered instead of children while empty — where ChatEmptyState belongs",
			},
		],
	},

	// =========================================================================
	// Core — actions
	// =========================================================================

	button: {
		name: "Button",
		slug: "button",
		description:
			"The foundational push-button: six variants, three sizes, a loading state, and a polymorphic href/anchor mode",
		category: "actions",
		group: "core",
		status: "done",
		tags: ["button", "cta", "actions", "form", "link", "loading", "icon"],
		props: [
			{
				name: "variant",
				type: '"primary" | "secondary" | "outline" | "ghost" | "accent" | "destructive"',
				default: '"primary"',
				description: "Visual treatment",
			},
			{
				name: "size",
				type: '"sm" | "md" | "lg"',
				default: '"md"',
				description: "Padding / font-size / radius scale",
			},
			{
				name: "type",
				type: '"button" | "submit" | "reset"',
				default: '"button"',
				description: "Native type; ignored once href renders an anchor instead",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description: "Greys the button out and blocks activation",
			},
			{
				name: "loading",
				type: "boolean",
				default: "false",
				description:
					"Spinner in place of iconStart, aria-busy, inert to activation on both the button and anchor branch — does not dim the button",
			},
			{
				name: "href",
				type: "string",
				description: "Renders an <a> instead of a <button> when set",
			},
			{
				name: "target",
				type: "string",
				description: 'Anchor target. "_blank" forces a safe rel',
			},
			{
				name: "rel",
				type: "string",
				description: 'Anchor rel, widened rather than replaced when target="_blank"',
			},
			{
				name: "fullWidth",
				type: "boolean",
				default: "false",
				description: "Stretches the button to its container's width",
			},
			{
				name: "label",
				type: "string",
				description: "Accessible name for a button whose content is icon-only",
			},
			{
				name: "onclick",
				type: "(event: MouseEvent) => void",
				description: "Fires on activation; never called while disabled or loading",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes",
			},
			{
				name: "ref",
				type: "HTMLButtonElement | HTMLAnchorElement | null",
				default: "null",
				description: "Bindable element reference",
			},
		],
		slots: [
			{ name: "children", description: "The button's label / content" },
			{
				name: "iconStart",
				description: "Rendered before the label; replaced by the spinner while loading",
			},
			{ name: "iconEnd", description: "Rendered after the label" },
		],
	},

	"icon-button": {
		name: "IconButton",
		slug: "icon-button",
		description:
			"Square or circular icon-only button built on Button, with a required accessible label",
		category: "actions",
		group: "core",
		status: "done",
		dependencies: ["button"],
		tags: ["button", "icon", "action", "accessibility"],
		props: [
			{
				name: "label",
				type: "string",
				description: "Accessible name. Required — there is no visible text to fall back on",
				required: true,
			},
			{
				name: "variant",
				type: '"primary" | "secondary" | "outline" | "ghost" | "accent" | "destructive"',
				default: '"outline"',
				description: "Visual treatment, forwarded to the underlying Button",
			},
			{
				name: "size",
				type: '"sm" | "md" | "lg"',
				default: '"md"',
				description: "Square footprint (30 / 36 / 42px) and resting radius",
			},
			{
				name: "shape",
				type: '"square" | "circle"',
				default: '"square"',
				description: "Square keeps the size's own radius; circle rounds it fully",
			},
			{
				name: "type",
				type: '"button" | "submit" | "reset"',
				default: '"button"',
				description: "Native type; ignored once href renders an anchor instead",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description: "Greys the control out and blocks activation",
			},
			{
				name: "loading",
				type: "boolean",
				default: "false",
				description: "Spinner in place of the icon, aria-busy, blocks activation",
			},
			{
				name: "href",
				type: "string",
				description: "Renders an <a> instead of a <button> when set",
			},
			{ name: "target", type: "string", description: 'Anchor target. "_blank" forces a safe rel' },
			{
				name: "rel",
				type: "string",
				description: 'Anchor rel, widened rather than replaced when target="_blank"',
			},
			{
				name: "onclick",
				type: "(event: MouseEvent) => void",
				description: "Fires on activation; never called while disabled or loading",
			},
			{ name: "class", type: "string", description: "Additional CSS classes" },
			{
				name: "ref",
				type: "HTMLButtonElement | HTMLAnchorElement | null",
				default: "null",
				description: "Bindable element reference",
			},
		],
		slots: [{ name: "children", description: "The icon, rendered centred" }],
	},

	"button-group": {
		name: "ButtonGroup",
		slug: "button-group",
		description:
			"Joins a row of adjacent actions into one seamless control — one border, one divider, no doubled edges",
		category: "actions",
		group: "core",
		status: "done",
		tags: ["button", "group", "segmented", "split button", "toolbar", "actions"],
		props: [
			{
				name: "orientation",
				type: '"horizontal" | "vertical"',
				default: '"horizontal"',
				description: "Stacking axis for the joined items",
			},
			{
				name: "label",
				type: "string",
				description: "Accessible name for the group, exposed as aria-label",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes",
			},
			{
				name: "ref",
				type: "HTMLDivElement | null",
				default: "null",
				description: "Bindable reference to the root <div>",
			},
		],
		slots: [{ name: "children", description: "The adjacent actions to join" }],
	},

	link: {
		name: "Link",
		slug: "link",
		description:
			"Inline text link with a muted variant, configurable underline, and a safe external-link mode with a new-tab arrow",
		category: "actions",
		group: "core",
		status: "done",
		tags: ["link", "anchor", "external", "underline", "typography"],
		props: [
			{
				name: "href",
				type: "string",
				description: "Destination URL",
				required: true,
			},
			{
				name: "variant",
				type: '"default" | "muted"',
				default: '"default"',
				description:
					"default reads as inline copy; muted recedes into supporting text at a smaller size",
			},
			{
				name: "external",
				type: "boolean",
				default: "false",
				description: "Appends an arrow glyph, defaults target to _blank, and guarantees a safe rel",
			},
			{
				name: "underline",
				type: '"hover" | "always" | "none"',
				default: '"hover"',
				description: "When the underline shows",
			},
			{
				name: "target",
				type: "string",
				description: "Anchor target; external fills this in as _blank when left unset",
			},
			{
				name: "rel",
				type: "string",
				description:
					"Anchor rel; merged with noopener noreferrer whenever the link opens a new tab",
			},
			{
				name: "onclick",
				type: "(event: MouseEvent) => void",
				description: "Native click handler",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes",
			},
			{
				name: "ref",
				type: "HTMLAnchorElement | null",
				default: "null",
				description: "Bindable element reference",
			},
		],
		slots: [{ name: "children", description: "The link's text or content" }],
	},

	toggle: {
		name: "Toggle",
		slug: "toggle",
		description:
			"Two-state button carrying aria-pressed, for a single on/off option like a formatting mark or a filter",
		category: "actions",
		group: "core",
		status: "done",
		tags: ["toggle", "button", "pressed", "formatting", "switch"],
		props: [
			{
				name: "pressed",
				type: "boolean",
				default: "false",
				description: "Whether the toggle is currently pressed (active); bindable",
			},
			{
				name: "onPressedChange",
				type: "(pressed: boolean) => void",
				description: "Called with the new pressed state whenever the toggle is activated",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description: "Disables the toggle; blocks both the state change and the callback",
			},
			{
				name: "size",
				type: '"sm" | "md" | "lg"',
				default: '"md"',
				description: "Visual size of the control",
			},
			{
				name: "variant",
				type: '"ghost" | "outline"',
				default: '"ghost"',
				description: '"ghost" has no resting border, "outline" keeps one at rest',
			},
			{
				name: "label",
				type: "string",
				description: "Accessible name — required when children is icon-only",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes",
			},
			{
				name: "ref",
				type: "HTMLButtonElement | null",
				default: "null",
				description: "Bindable element reference",
			},
		],
		slots: [
			{
				name: "children",
				description: "Toggle content, typically a single glyph or a short label",
			},
		],
	},

	"toggle-group": {
		name: "ToggleGroup",
		slug: "toggle-group",
		description:
			"A segmented row of toggle buttons with roving-tabindex keyboard navigation and single or multiple selection.",
		category: "actions",
		group: "core",
		status: "done",
		tags: ["toggle", "segmented-control", "roving-tabindex", "compound", "selection", "toolbar"],
		props: [
			{
				name: "type",
				type: '"single" | "multiple"',
				default: '"single"',
				description: "Whether one item can be active at a time, or several.",
			},
			{
				name: "value",
				type: "string | string[]",
				default: '""',
				description:
					'The active value(s), bindable — a string when type="single", an array of strings when type="multiple".',
			},
			{
				name: "onValueChange",
				type: "(value: string | string[]) => void",
				description:
					"Called with the new value, shaped to match `type`, whenever the selection changes.",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description: "Disables every item in the group.",
			},
			{
				name: "size",
				type: '"sm" | "md" | "lg"',
				default: '"md"',
				description: "Sizes every item.",
			},
			{
				name: "orientation",
				type: '"horizontal" | "vertical"',
				default: '"horizontal"',
				description: "The rail's stacking axis; both arrow-key pairs work either way.",
			},
			{
				name: "label",
				type: "string",
				description: "Accessible name for the group.",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes, merged onto the root.",
			},
			{
				name: "ref",
				type: "HTMLDivElement | null",
				default: "null",
				description: "Bindable reference to the root element.",
			},
			{
				name: "ToggleGroupItem.value",
				type: "string",
				required: true,
				description: "The item's value — what gets added to or removed from the group's selection.",
			},
			{
				name: "ToggleGroupItem.disabled",
				type: "boolean",
				default: "false",
				description: "Disables just this item, independent of the group's own `disabled`.",
			},
			{
				name: "ToggleGroupItem.label",
				type: "string",
				description: "Accessible name for icon-only content on this item. Also the text fallback.",
			},
			{
				name: "ToggleGroupItem.class",
				type: "string",
				description: "Additional CSS classes, merged onto the item's button.",
			},
			{
				name: "ToggleGroupItem.ref",
				type: "HTMLButtonElement | null",
				default: "null",
				description: "Bindable reference to the item's button element.",
			},
		],
		slots: [
			{ name: "children", description: "The ToggleGroup's content — the ToggleGroupItems." },
			{
				name: "ToggleGroupItem.children",
				description: "The item's content, typically a glyph or a short label.",
			},
		],
	},

	"copy-button": {
		name: "CopyButton",
		slug: "copy-button",
		description:
			"Button preset wired to the clipboard, swapping its icon and label to a success skin for a moment after a successful copy",
		category: "actions",
		group: "core",
		status: "done",
		dependencies: ["button"],
		tags: ["copy", "clipboard", "button", "success"],
		props: [
			{
				name: "value",
				type: "string",
				description: "The text written to the clipboard on activation",
				required: true,
			},
			{
				name: "label",
				type: "string",
				default: '"Copy"',
				description: "Idle label",
			},
			{
				name: "copiedLabel",
				type: "string",
				default: '"Copied"',
				description: "Label shown for resetMs after a successful copy",
			},
			{
				name: "resetMs",
				type: "number",
				default: "2000",
				description: "How long the copied state holds before reverting, in milliseconds",
			},
			{
				name: "variant",
				type: "ButtonVariant",
				default: '"outline"',
				description: "Passed straight through to the underlying Button",
			},
			{
				name: "size",
				type: "ButtonSize",
				default: '"md"',
				description: "Passed straight through to the underlying Button",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description: "Disables the button and blocks the copy",
			},
			{
				name: "iconOnly",
				type: "boolean",
				default: "false",
				description: "Drops the visible label, moving it to aria-label instead",
			},
			{
				name: "onCopy",
				type: "(value: string, ok: boolean) => void",
				description: "Called with the value and whether the write actually succeeded",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes",
			},
			{
				name: "ref",
				type: "HTMLButtonElement | HTMLAnchorElement | null",
				default: "null",
				description: "Bindable element reference, matching Button's own ref type",
			},
		],
		slots: [{ name: "children", description: "Overrides the default icon + label content" }],
	},

	// =========================================================================
	// Core — forms
	// =========================================================================

	label: {
		name: "Label",
		slug: "label",
		description:
			"A form label with a decorative required asterisk, wired to a FormField's context when it has one",
		category: "forms",
		group: "core",
		status: "done",
		tags: ["label", "form", "accessibility"],
		props: [
			{
				name: "for",
				type: "string",
				description: "Explicit target id. Inside a FormField, the field's own control id wins",
			},
			{
				name: "required",
				type: "boolean",
				default: "false",
				description:
					"Renders the required asterisk. Inside a FormField, the field's own `required` wins",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes",
			},
			{
				name: "ref",
				type: "HTMLLabelElement | null",
				default: "null",
				description: "Bindable element reference",
			},
		],
		slots: [{ name: "children", description: "The label text/content" }],
	},

	"form-field": {
		name: "FormField",
		slug: "form-field",
		description:
			"Wraps a control with a label, help/error text and id wiring, so a screen reader gets the full picture without manual aria plumbing",
		category: "forms",
		group: "core",
		status: "done",
		dependencies: ["label"],
		tags: ["form", "field", "label", "validation", "accessibility", "compound"],
		props: [
			{
				name: "label",
				type: "string",
				description:
					"Label text — the common case. For custom label markup, render a Label in children instead",
			},
			{
				name: "description",
				type: "string",
				description: "Help text under the control, replaced by error while the field is invalid",
			},
			{
				name: "error",
				type: "string",
				description: "Error text. Setting it marks the field invalid and replaces the help text",
			},
			{
				name: "valid",
				type: "boolean",
				default: "false",
				description:
					"Decorative checkmark next to the help text; error always wins if both are set",
			},
			{
				name: "required",
				type: "boolean",
				default: "false",
				description:
					"Marks the field required: the label gets an asterisk, the control gets aria-required",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description: "Disables the field: reaches the wrapped control through context",
			},
			{
				name: "id",
				type: "string",
				description:
					"Opts out of the generated id. description/error ids are suffixes of this same value",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes, merged onto the root",
			},
			{
				name: "ref",
				type: "HTMLDivElement | null",
				default: "null",
				description: "Bindable reference to the root element",
			},
		],
		slots: [{ name: "children", description: "The control" }],
	},

	input: {
		name: "Input",
		slug: "input",
		description:
			"A single-line text field with resting, focus, error and disabled looks, built on a native input",
		category: "forms",
		group: "core",
		status: "done",
		tags: ["input", "text-field", "form", "validation"],
		props: [
			{
				name: "value",
				type: "string",
				default: '""',
				description: "Current value; bindable",
			},
			{
				name: "onValueChange",
				type: "(value: string) => void",
				description: "Called with the new value on every input event",
			},
			{
				name: "type",
				type: '"text" | "email" | "url" | "tel" | "password" | "search" | "number"',
				default: '"text"',
				description: "Native input type",
			},
			{
				name: "placeholder",
				type: "string",
				description: "Shown while the field is empty",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description: "Blocks focus and typing; excluded from form submission",
			},
			{
				name: "readonly",
				type: "boolean",
				default: "false",
				description: "Blocks typing but stays focusable and is still submitted, unlike disabled",
			},
			{
				name: "required",
				type: "boolean",
				default: "false",
				description: "Native required",
			},
			{
				name: "invalid",
				type: "boolean",
				default: "false",
				description: "Drives the error border and aria-invalid",
			},
			{
				name: "id",
				type: "string",
				description: "Element id",
			},
			{
				name: "name",
				type: "string",
				description: "Native name, read on form submission",
			},
			{
				name: "autocomplete",
				type: "FullAutoFill",
				description:
					"Native autocomplete hint; the union from svelte/elements, not an arbitrary string",
			},
			{
				name: "label",
				type: "string",
				description: "Accessible name — for a control with no visible Label next to it",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes",
			},
			{
				name: "ref",
				type: "HTMLInputElement | null",
				default: "null",
				description: "Bindable element reference",
			},
		],
	},

	textarea: {
		name: "Textarea",
		slug: "textarea",
		description:
			"A multi-line text field with an optional live character counter and auto-growing height, built on a native textarea",
		category: "forms",
		group: "core",
		status: "done",
		tags: ["textarea", "text-field", "form", "validation", "counter", "auto-resize"],
		props: [
			{
				name: "value",
				type: "string",
				default: '""',
				description: "Current value; bindable",
			},
			{
				name: "onValueChange",
				type: "(value: string) => void",
				description: "Called with the new value on every input event",
			},
			{
				name: "placeholder",
				type: "string",
				description: "Shown while the field is empty",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description: "Blocks focus and typing; excluded from form submission",
			},
			{
				name: "readonly",
				type: "boolean",
				default: "false",
				description: "Blocks typing but stays focusable and is still submitted, unlike disabled",
			},
			{
				name: "required",
				type: "boolean",
				default: "false",
				description: "Native required",
			},
			{
				name: "invalid",
				type: "boolean",
				default: "false",
				description: "Drives the error border and aria-invalid",
			},
			{
				name: "id",
				type: "string",
				description: "Element id",
			},
			{
				name: "name",
				type: "string",
				description: "Native name, read on form submission",
			},
			{
				name: "autocomplete",
				type: "FullAutoFill",
				description:
					"Native autocomplete hint; the union from svelte/elements, not an arbitrary string",
			},
			{
				name: "label",
				type: "string",
				description: "Accessible name — for a control with no visible Label next to it",
			},
			{
				name: "rows",
				type: "number",
				default: "3",
				description: "Visible height in text rows before anything grows it; also the no-JS height",
			},
			{
				name: "maxlength",
				type: "number",
				description: "Native character ceiling; also the counter's denominator",
			},
			{
				name: "showCount",
				type: "boolean",
				default: "false",
				description: 'Renders the live "n / max" counter under the field',
			},
			{
				name: "autoResize",
				type: "boolean",
				default: "false",
				description: "Grows to fit content instead of scrolling; disables manual resize",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes — applied to the textarea itself, not the wrapper",
			},
			{
				name: "ref",
				type: "HTMLTextAreaElement | null",
				default: "null",
				description: "Bindable element reference",
			},
		],
	},

	checkbox: {
		name: "Checkbox",
		slug: "checkbox",
		description:
			"A tri-look checkbox — unchecked, checked, indeterminate and disabled — built on a native checkbox input",
		category: "forms",
		group: "core",
		status: "done",
		tags: ["checkbox", "form", "indeterminate", "validation"],
		props: [
			{
				name: "checked",
				type: "boolean",
				default: "false",
				description: "Whether the box is checked; bindable",
			},
			{
				name: "indeterminate",
				type: "boolean",
				default: "false",
				description: "Mixed/dash visual state; bindable",
			},
			{
				name: "onCheckedChange",
				type: "(checked: boolean) => void",
				description: "Called with the new checked value whenever the box is activated",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description: "Blocks interaction; excluded from form submission",
			},
			{
				name: "required",
				type: "boolean",
				default: "false",
				description: "Native required",
			},
			{
				name: "invalid",
				type: "boolean",
				default: "false",
				description: "Drives the error border and aria-invalid",
			},
			{
				name: "id",
				type: "string",
				description: "Element id",
			},
			{
				name: "name",
				type: "string",
				description: "Native name, read on form submission",
			},
			{
				name: "value",
				type: "string",
				description: "Form value submitted while checked",
			},
			{
				name: "label",
				type: "string",
				description:
					"Accessible name, rendered as aria-label; skip it when children already supplies the visible label text",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes, merged onto the wrapping label",
			},
			{
				name: "ref",
				type: "HTMLInputElement | null",
				default: "null",
				description: "Bindable element reference to the native input",
			},
		],
		slots: [
			{
				name: "children",
				description: "Visible label text, rendered beside the box",
			},
		],
	},

	"radio-group": {
		name: "RadioGroup",
		slug: "radio-group",
		description:
			"A set of mutually exclusive options, built on real input type=radio elements sharing one name so the browser gives the roving tab stop and keyboard navigation for free.",
		category: "forms",
		group: "core",
		status: "done",
		tags: ["radio", "form", "selection", "compound", "validation"],
		props: [
			{
				name: "value",
				type: "string",
				default: '""',
				description: 'The selected value, bindable — "" means nothing is selected.',
			},
			{
				name: "onValueChange",
				type: "(value: string) => void",
				description: "Called with the new value whenever the selection changes.",
			},
			{
				name: "name",
				type: "string",
				description:
					"Shared name for the native radios. Generated per instance when omitted, so two groups on the same page never fight over each other's selection.",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description: "Disables every item in the group.",
			},
			{
				name: "required",
				type: "boolean",
				default: "false",
				description: "Marks the group required for native form validation.",
			},
			{
				name: "invalid",
				type: "boolean",
				default: "false",
				description: "Marks the group invalid — sets aria-invalid.",
			},
			{
				name: "orientation",
				type: '"horizontal" | "vertical"',
				default: '"vertical"',
				description: "The list's stacking axis.",
			},
			{
				name: "label",
				type: "string",
				description:
					"Accessible name, standalone. Inside a FormField that rendered its own label, its labelId wins instead; a FormField with no label of its own falls back to this.",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes, merged onto the root.",
			},
			{
				name: "ref",
				type: "HTMLDivElement | null",
				default: "null",
				description: "Bindable reference to the root element.",
			},
			{
				name: "RadioGroupItem.value",
				type: "string",
				required: true,
				description: "This item's value — what the group's value becomes when it is picked.",
			},
			{
				name: "RadioGroupItem.disabled",
				type: "boolean",
				default: "false",
				description: "Disables just this item, independent of the group's own disabled.",
			},
			{
				name: "RadioGroupItem.label",
				type: "string",
				description: "Visible label text. Also the fallback content, and the fallback name.",
			},
			{
				name: "RadioGroupItem.class",
				type: "string",
				description: "Additional CSS classes, merged onto the wrapping label.",
			},
			{
				name: "RadioGroupItem.ref",
				type: "HTMLInputElement | null",
				default: "null",
				description: "Bindable reference to the item's native input.",
			},
		],
		slots: [
			{ name: "children", description: "The RadioGroup's content — the RadioGroupItems." },
			{
				name: "RadioGroupItem.children",
				description: "Custom content rendered in place of the item's label.",
			},
		],
	},

	switch: {
		name: "Switch",
		slug: "switch",
		description:
			"A sliding on/off control that takes effect immediately, built on a native checkbox input",
		category: "forms",
		group: "core",
		status: "done",
		tags: ["switch", "toggle", "form", "settings"],
		props: [
			{
				name: "checked",
				type: "boolean",
				default: "false",
				description: "Whether the switch is on; bindable",
			},
			{
				name: "onCheckedChange",
				type: "(checked: boolean) => void",
				description: "Called with the new value whenever the switch is activated",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description: "Blocks interaction; excluded from form submission",
			},
			{
				name: "required",
				type: "boolean",
				default: "false",
				description: "Native required",
			},
			{
				name: "id",
				type: "string",
				description: "Element id",
			},
			{
				name: "name",
				type: "string",
				description: "Native name, read on form submission",
			},
			{
				name: "value",
				type: "string",
				description: "Form value submitted while on",
			},
			{
				name: "label",
				type: "string",
				description:
					"Accessible name, rendered as aria-label; skip it when children already supplies the visible label text",
			},
			{
				name: "size",
				type: '"sm" | "md" | "lg"',
				default: '"md"',
				description: "Track/knob size",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes, merged onto the wrapping label",
			},
			{
				name: "ref",
				type: "HTMLInputElement | null",
				default: "null",
				description: "Bindable element reference to the native input",
			},
		],
		slots: [
			{
				name: "children",
				description: "Visible label text, rendered beside the track",
			},
		],
	},

	slider: {
		name: "Slider",
		slug: "slider",
		description:
			"Restyled native range input with a purple-to-cyan gradient fill that tracks the current value and a glowing thumb",
		category: "forms",
		group: "core",
		status: "done",
		tags: ["slider", "range", "form", "input"],
		props: [
			{ name: "value", type: "number", default: "0", description: "Current value; bindable" },
			{
				name: "onValueChange",
				type: "(value: number) => void",
				description: "Called with the new value on every input event",
			},
			{ name: "min", type: "number", default: "0", description: "Lower bound" },
			{ name: "max", type: "number", default: "100", description: "Upper bound" },
			{
				name: "step",
				type: "number",
				default: "1",
				description: "Increment size, including fractional steps",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description:
					"Blocks dragging and keyboard interaction. Overridden by a surrounding FormField",
			},
			{
				name: "id",
				type: "string",
				description: "Element id. Overridden by a surrounding FormField's own controlId",
			},
			{ name: "name", type: "string", description: "Native name, read on form submission" },
			{
				name: "label",
				type: "string",
				description: "Accessible name — for a control with no visible Label next to it",
			},
			{
				name: "showValue",
				type: "boolean",
				default: "false",
				description: "Shows the current value in a bubble that tracks the thumb",
			},
			{
				name: "showBounds",
				type: "boolean",
				default: "false",
				description: "Shows min and max as end labels below the track",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes, applied to the outer wrapper",
			},
			{
				name: "ref",
				type: "HTMLInputElement | null",
				default: "null",
				description: "Reference to the underlying input type=range",
			},
		],
	},

	"number-input": {
		name: "NumberInput",
		slug: "number-input",
		description:
			"Numeric field with decrement/increment buttons that clamp to min/max, disable themselves at the bounds, and step fractional values without float drift",
		category: "forms",
		group: "core",
		status: "done",
		tags: ["number", "stepper", "form", "input", "quantity"],
		props: [
			{
				name: "value",
				type: "number | null",
				default: "null",
				description: "Current value; bindable. null when the field is empty",
			},
			{
				name: "onValueChange",
				type: "(value: number | null) => void",
				description: "Called with the new value on every change, including a clear to null",
			},
			{ name: "min", type: "number", description: "Lower bound. Leave unset for no lower bound" },
			{ name: "max", type: "number", description: "Upper bound. Leave unset for no upper bound" },
			{
				name: "step",
				type: "number",
				default: "1",
				description: "Increment size, including fractional steps",
			},
			{
				name: "disabled",
				type: "boolean",
				default: "false",
				description:
					"Blocks focus, typing and the step buttons; excluded from form submission. Overridden by a surrounding FormField",
			},
			{
				name: "readonly",
				type: "boolean",
				default: "false",
				description:
					"Blocks typing and the step buttons but stays focusable and is still submitted, unlike disabled",
			},
			{
				name: "required",
				type: "boolean",
				default: "false",
				description: "Native required. Overridden by a surrounding FormField",
			},
			{
				name: "invalid",
				type: "boolean",
				default: "false",
				description:
					"Drives the error border and aria-invalid. Overridden by a surrounding FormField",
			},
			{
				name: "id",
				type: "string",
				description: "Element id. Overridden by a surrounding FormField's own controlId",
			},
			{ name: "name", type: "string", description: "Native name, read on form submission" },
			{
				name: "label",
				type: "string",
				description: "Accessible name — for a control with no visible Label next to it",
			},
			{
				name: "class",
				type: "string",
				description: "Additional CSS classes, applied to the outer bordered wrapper",
			},
			{
				name: "ref",
				type: "HTMLInputElement | null",
				default: "null",
				description: "Reference to the underlying input type=number",
			},
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
 * Get components grouped by category, filtered to a single group ("core" or "fancy")
 */
export function getComponentsGroupedByCategoryForGroup(
	group: "core" | "fancy"
): Record<ComponentCategory, ComponentMeta[]> {
	const grouped = {} as Record<ComponentCategory, ComponentMeta[]>;

	for (const category of categories) {
		grouped[category] = [];
	}

	for (const component of Object.values(registry)) {
		if (component.group === group) {
			grouped[component.category].push(component);
		}
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
