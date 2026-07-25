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
		description: "Scroll-triggered blur-to-clear reveal animation with staggered children",
		category: "text",
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
		description: "Animated beam effect that travels around borders",
		category: "effects",
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
		description: "Cursor-following image trail with 8 animation variants",
		category: "effects",
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
		description: "Button with ripple click effect",
		category: "buttons",
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
		description: "Animated starfield background with parallax mouse tracking",
		category: "backgrounds",
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
		description: "macOS-style dock with icon magnification on hover",
		category: "navigation",
		status: "done",
		credits: [{ source: "Magic UI", url: "https://magicui.design/docs/components/dock" }],
		tags: ["dock", "navigation", "macos", "magnification", "hover"],
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

	"fluid-cursor": {
		name: "FluidCursor",
		slug: "fluid-cursor",
		description: "WebGL fluid simulation that follows cursor movement",
		category: "effects",
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
		description: "Canvas-based grid of squares with flickering opacity",
		category: "backgrounds",
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
		description: "Per-character color animation with shuffling colors",
		category: "text",
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
		description: "Character scramble effect that activates on hover",
		category: "text",
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
		description: "Text with animated SVG sparkle stars overlay",
		category: "text",
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
		description: "Content reveal with sliding colored box animation",
		category: "text",
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
		description: "Card with mouse-following radial gradient spotlight overlay",
		category: "cards",
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
		description: "Concentric pulsing circles with ripple wave animation",
		category: "effects",
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
		description:
			"Canvas-based Matrix-style falling glyph rain with configurable color, speed, and density",
		category: "backgrounds",
		status: "done",
		tags: ["background", "matrix", "canvas", "animation", "glyphs", "cyberpunk"],
		props: [
			{
				name: "color",
				type: "string",
				default: '"#00ff41"',
				description: "Glyph color (the classic Matrix green)",
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
			"WebGL image reveal with a Perlin-noise dissolve mask, contracting radial gradient, and wave displacement, inspired by a Codrops shader effect",
		category: "media",
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
