export interface ExampleMeta {
	name: string;
	title: string;
	description?: string;
}

export const examplesRegistry: Record<string, ExampleMeta[]> = {
	"shimmer-button": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "ShimmerColors",
			title: "Shimmer Colors",
			description: "Change the shimmer highlight color.",
		},
		{ name: "AnimationSpeed", title: "Animation Speed", description: "Control the shimmer speed." },
		{ name: "ShimmerSize", title: "Shimmer Size", description: "Adjust the border thickness." },
		{
			name: "CustomBackground",
			title: "Custom Background",
			description: "Set a custom background color.",
		},
		{ name: "BorderRadius", title: "Border Radius", description: "Change the button shape." },
	],
	"rainbow-button": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "AnimationSpeed",
			title: "Animation Speed",
			description: "Control the animation speed.",
		},
		{ name: "WithIcons", title: "With Icons", description: "Add icons inside the button." },
		{ name: "DisabledState", title: "Disabled State" },
		{ name: "AsLink", title: "As Link", description: "Render as an anchor element." },
		{
			name: "CustomStyling",
			title: "Custom Styling",
			description: "Override styles with the class prop.",
		},
	],
	"ripple-button": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "CustomColors",
			title: "Custom Ripple Colors",
			description: "Customize the ripple color.",
		},
		{
			name: "AnimationDuration",
			title: "Animation Duration",
			description: "Control the ripple speed.",
		},
		{
			name: "CustomStyling",
			title: "Custom Styling",
			description: "Override styles with the class prop.",
		},
		{
			name: "MultipleRipples",
			title: "Multiple Ripples",
			description: "Click rapidly to see multiple ripples.",
		},
	],
	"gradient-button": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColors", title: "Custom Colors", description: "Change the gradient colors." },
		{
			name: "BorderWidthBlur",
			title: "Border Width & Blur",
			description: "Adjust thickness and softness.",
		},
		{
			name: "AnimationSpeed",
			title: "Animation Speed",
			description: "Control the rotation speed.",
		},
		{ name: "BorderRadius", title: "Border Radius", description: "Change the button shape." },
		{
			name: "BackgroundColor",
			title: "Background Color",
			description: "Set the content area background.",
		},
		{ name: "Playground", title: "Interactive Playground" },
	],
	"interactive-hover-button": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomText", title: "Custom Text" },
		{ name: "CustomStyling", title: "Custom Styling" },
	],
	"colourful-text": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColors", title: "Custom Colors", description: "Define a custom color palette." },
		{
			name: "TransitionSpeed",
			title: "Transition Speed",
			description: "Control color change speed.",
		},
		{ name: "LongerText", title: "Longer Text" },
	],
	"flip-words": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "FastCycling", title: "Fast Cycling", description: "Shorter interval between words." },
		{ name: "MultiWordPhrases", title: "Multi-Word Phrases" },
	],
	"hyper-text": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "AnimateOnLoad", title: "Animate on Load", description: "Trigger animation on mount." },
		{ name: "SlowAnimation", title: "Slow Animation", description: "Longer animation duration." },
	],
	"letter-pullup": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "SlowerStagger",
			title: "Slower Stagger",
			description: "Increase delay between letters.",
		},
		{ name: "CustomStyling", title: "Custom Styling" },
	],
	"number-ticker": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "DecimalPlaces", title: "Decimal Places", description: "Control decimal precision." },
		{ name: "CountDown", title: "Count Down", description: "Animate from high to low." },
		{ name: "WithDelay", title: "With Delay", description: "Add a start delay." },
		{ name: "Playground", title: "Interactive Playground" },
	],
	"sparkles-text": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColors", title: "Custom Colors", description: "Change sparkle colors." },
		{ name: "LotsOfSparkles", title: "Lots of Sparkles", description: "Increase sparkle count." },
	],
	"line-shadow-text": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomShadowColor", title: "Custom Shadow Color" },
		{ name: "DarkBackground", title: "Dark Background" },
	],
	"text-generate-effect": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "WithoutBlur", title: "Without Blur", description: "Disable the blur effect." },
		{ name: "FastReveal", title: "Fast Reveal", description: "Quick word appearance." },
		{ name: "SlowDramatic", title: "Slow Dramatic", description: "Slow, dramatic reveal." },
		{ name: "DelayedStart", title: "Delayed Start", description: "Add initial delay." },
	],
	"box-reveal": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColors", title: "Custom Colors", description: "Change the reveal box color." },
		{ name: "SlowAnimation", title: "Slow Animation", description: "Longer reveal duration." },
	],
	"blur-reveal": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomDuration", title: "Custom Duration", description: "Control reveal speed." },
		{ name: "HeavyBlur", title: "Heavy Blur", description: "Stronger initial blur." },
		{
			name: "StaggeredCards",
			title: "Staggered Cards",
			description: "Multiple items with stagger.",
		},
	],
	focus: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomBorderColor", title: "Custom Border Color" },
		{ name: "ManualMode", title: "Manual Mode", description: "Hover to focus each word." },
		{ name: "HighBlur", title: "High Blur", description: "Strong blur effect." },
	],
	"container-text-flip": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomWords", title: "Custom Words" },
		{ name: "FastInterval", title: "Fast Interval", description: "Shorter flip interval." },
	],
	"border-beam": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColors", title: "Custom Colors", description: "Change beam gradient colors." },
		{ name: "AnimationSpeed", title: "Animation Speed", description: "Control beam speed." },
		{ name: "SizeAndWidth", title: "Size & Width", description: "Adjust beam dimensions." },
		{ name: "MultipleBeams", title: "Multiple Beams", description: "Stack multiple beams." },
		{ name: "Playground", title: "Interactive Playground" },
	],
	"glow-border": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColors", title: "Custom Colors", description: "Change glow colors." },
		{ name: "MultiColorGradient", title: "Multi-Color Gradient" },
		{ name: "BorderWidth", title: "Border Width", description: "Adjust glow thickness." },
		{ name: "CardExample", title: "Card Example" },
	],
	"neon-border": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "AnimationTypes",
			title: "Animation Types",
			description: "Different animation styles.",
		},
		{ name: "CustomColors", title: "Custom Colors" },
		{ name: "SpeedVariations", title: "Speed Variations" },
		{ name: "Playground", title: "Interactive Playground" },
	],
	"glowing-effect": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "WhiteVariant", title: "White Variant" },
		{ name: "WithBlur", title: "With Blur", description: "Add blur to the glow." },
	],
	meteors: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomCount", title: "Custom Count", description: "Control number of meteors." },
		{ name: "CardExample", title: "Card Example" },
	],
	ripple: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "StyledCircles", title: "Styled Circles" },
		{ name: "Playground", title: "Interactive Playground" },
	],
	confetti: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomOptions", title: "Custom Options", description: "Customize confetti behavior." },
	],
	"flickering-grid": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColors", title: "Custom Colors" },
		{ name: "GridSizeVariations", title: "Grid Size Variations" },
		{ name: "Playground", title: "Interactive Playground" },
	],
	sparkles: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColors", title: "Custom Colors" },
		{ name: "DenseAndFast", title: "Dense & Fast", description: "More particles, faster speed." },
	],
	"bg-falling-stars": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColor", title: "Custom Color" },
		{ name: "StarCount", title: "Star Count", description: "Control number of stars." },
	],
	"bg-stars": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColor", title: "Custom Color" },
		{ name: "AnimationSpeed", title: "Animation Speed" },
	],
	"matrix-rain": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "ComposedHero",
			title: "Composed Hero",
			description: "Hero section with matrix rain background.",
		},
		{ name: "Playground", title: "Interactive Playground" },
	],
	"terminal-text": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "NoCursor", title: "No Cursor" },
		{ name: "WithGlitch", title: "With Glitch", description: "Enable glitch effect." },
	],
	"card-spotlight": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColors", title: "Custom Colors" },
	],
	"glare-card": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "MultipleCards", title: "Multiple Cards" },
	],
	"card-3d": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "HighDepth", title: "High Depth", description: "Increase 3D depth effect." },
	],
	"flip-card": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "XAxisRotation", title: "X-Axis Rotation", description: "Flip vertically." },
		{ name: "MultipleCards", title: "Multiple Cards" },
	],
	book: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "ColorVariants", title: "Color Variants" },
		{ name: "Sizes", title: "Sizes", description: "Different book sizes." },
	],
	"text-reveal-card": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "FewerStars", title: "Fewer Stars" },
	],
	"direction-aware-hover": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "MultipleCards", title: "Multiple Cards" },
	],
	marquee: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "Vertical", title: "Vertical", description: "Vertical scrolling direction." },
	],
	dock: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "Direction", title: "Direction", description: "Change dock orientation." },
	],
	timeline: [{ name: "BasicUsage", title: "Basic Usage" }],
	"logo-cloud": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "IconGrid", title: "Icon Grid" },
		{ name: "StaticGrid", title: "Static Grid" },
	],
	"container-scroll": [{ name: "BasicUsage", title: "Basic Usage" }],
	"bento-grid": [
		{ name: "BasicUsage", title: "Basic Usage", description: "Slot-based BentoGridItem." },
		{ name: "CardVariant", title: "Card Variant", description: "Props-based BentoGridCard." },
	],
	"animated-beam": [{ name: "BasicUsage", title: "Basic Usage" }],
	"animated-testimonials": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "WithAutoplay", title: "With Autoplay", description: "Auto-advances every 3 seconds." },
	],
	"animated-tooltip": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "TeamMembers", title: "Team Members" },
	],
	"apple-card-carousel": [{ name: "BasicUsage", title: "Basic Usage" }],
	compare: [
		{ name: "BasicUsage", title: "Basic Usage", description: "Hover mode comparison." },
		{ name: "DragMode", title: "Drag Mode", description: "Click and drag to control." },
		{ name: "Autoplay", title: "Autoplay", description: "Automatic animation." },
		{
			name: "CustomContent",
			title: "Custom Content",
			description: "Use snippets instead of images.",
		},
	],
	"fluid-cursor": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColors", title: "Custom Colors", description: "Fixed teal fluid color." },
		{
			name: "HdrDemo",
			title: "HDR Mode",
			description:
				"WebGPU engine with extended tone mapping — glows brighter than white on HDR displays. Requires a WebGPU browser (Chrome/Edge 129+, Safari 26+) plus an HDR screen for the full glow; otherwise falls back to wide-gamut WebGL (Chrome 104+, Safari 16.4+, Firefox 132+), then to standard rendering.",
		},
	],
	"fireworks-hdr": [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description:
				"Ambient shells run on their own; tap the sky or use the handle to launch one. Brightest on an HDR display in a WebGPU browser, and safe (soft-knee SDR) everywhere else.",
		},
		{
			name: "CustomShapes",
			title: "Pattern shells",
			description:
				"Shells that break into a figure: the built-in heart and star, or any closed outline you pass as points. The burst is cut from the figure, so it draws itself in the sky and then droops.",
		},
	],
	"smooth-cursor": [{ name: "BasicUsage", title: "Basic Usage" }],
	"liquid-glass": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "Navbar",
			title: "Landing Page Navbar",
			description: "Landing page with a liquid glass pill navigation.",
		},
	],
	"frosted-glass": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "Navbar",
			title: "Landing Page Navbar",
			description: "Landing page with a glass pill navigation.",
		},
	],
	"tracing-beam": [{ name: "BasicUsage", title: "Basic Usage" }],
	"image-trail-cursor": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "Variants",
			title: "Animation Variants",
			description: "8 different trail animation styles.",
		},
	],
	"interactive-grid-pattern": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "Colored", title: "Colored Variant", description: "Custom hover color." },
	],
	"line-hover-link": [
		{ name: "AllVariants", title: "All Variants", description: "11 animated underline effects." },
		{ name: "Navigation", title: "Navigation Example" },
	],
	"displacement-text": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "CustomColor", title: "Custom Color" },
		{
			name: "ThemeAware",
			title: "Theme Aware",
			description: "Auto-switches between light and dark.",
		},
	],
	"noise-reveal": [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "Toggle the reveal manually with the revealed prop.",
		},
	],
	"line-reveal": [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "Resize the container — lines re-wrap without replaying the animation.",
		},
		{
			name: "CustomTiming",
			title: "Custom Stagger & Duration",
			description: "Slow down the per-line stagger and transition.",
		},
	],
	"editorial-engine": [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "Drag the orbs, click to pause them, resize the window.",
		},
	],
	"liquid-text": [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "Move the cursor across the text — it smears, then relaxes back.",
		},
		{ name: "Playground", title: "Interactive Playground" },
	],
	"pixel-loader": [{ name: "BasicUsage", title: "Basic Usage" }],
	"typing-indicator": [{ name: "BasicUsage", title: "Basic Usage" }],
	"thinking-indicator": [{ name: "BasicUsage", title: "Basic Usage" }],
	"streaming-text": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "Markdown", title: "Markdown Streaming" },
	],
	"reasoning-panel": [{ name: "BasicUsage", title: "Basic Usage" }],
	"chat-message": [{ name: "BasicUsage", title: "Basic Usage" }],
	"prompt-suggestions": [{ name: "BasicUsage", title: "Basic Usage" }],
	"chat-error": [{ name: "BasicUsage", title: "Basic Usage" }],
	"tool-call": [{ name: "BasicUsage", title: "Basic Usage" }],
	"tool-timeline": [{ name: "BasicUsage", title: "Basic Usage" }],
	"terminal-block": [{ name: "BasicUsage", title: "Basic Usage" }],
	"code-diff": [{ name: "BasicUsage", title: "Basic Usage" }],
	sources: [{ name: "BasicUsage", title: "Basic Usage" }],
	"inline-citation": [{ name: "BasicUsage", title: "Basic Usage" }],
	"web-search": [{ name: "BasicUsage", title: "Basic Usage" }],
	"image-generation": [{ name: "BasicUsage", title: "Basic Usage" }],
};
