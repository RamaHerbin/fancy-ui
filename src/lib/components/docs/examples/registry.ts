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
		{
			name: "HardSnap",
			title: "Hard Snap",
			description: 'mode="hard": no blur or easing, opacity snaps in stepped.',
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
	"pulse-beam": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "WorkingState",
			title: "Working State",
			description: "Toggle `active` to fade the glow in and out around a task list.",
		},
		{
			name: "OutsideVariant",
			title: "Outside Variant",
			description: "Ring plus a blurred halo behind the card.",
		},
		{ name: "Palettes", title: "Palettes", description: "Colorful, mono, ocean and sunset." },
		{ name: "PillButton", title: "Pill Button", description: "Outside halo on a small control." },
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
	"mosaic-glow": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "Colors",
			title: "Colors",
			description: "Any hex or rgb() colour for the halo and the surface.",
		},
		{ name: "DenseGrid", title: "Dense Grid", description: "Smaller tiles for a finer mosaic." },
		{
			name: "TrailAndIdle",
			title: "Trail and Idle",
			description: "A short, cursor-only trail versus a long comet that keeps drifting.",
		},
		{ name: "Playground", title: "Interactive Playground" },
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
		{
			name: "Wordmarks",
			title: "Wordmarks",
			description: "Static typographic row instead of image logos — no logo assets needed.",
		},
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
		{
			name: "BitmapDither",
			title: "Bitmap Dithering",
			description:
				"Retro ordered-dither rendering — the fluid is snapped to a chunky pixel grid and each color channel is quantized with a 4x4 Bayer threshold, so dot density encodes brightness. Forces the WebGL renderer (hdr is ignored).",
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
			description: "9 different trail animation styles, including a hard-edge pixelated snap.",
		},
	],
	"interactive-grid-pattern": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "Colored", title: "Colored Variant", description: "Custom hover color." },
		{
			name: "StaticGraphPaper",
			title: "Static Graph Paper",
			description: "Non-interactive grid with no per-rect listeners, for hard-edge art directions.",
		},
	],
	"line-hover-link": [
		{ name: "AllVariants", title: "All Variants", description: "12 animated underline effects." },
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
	"agent-plan": [{ name: "BasicUsage", title: "Basic Usage" }],
	"subagent-list": [{ name: "BasicUsage", title: "Basic Usage" }],
	"approval-card": [{ name: "BasicUsage", title: "Basic Usage" }],
	"recommendation-card": [{ name: "BasicUsage", title: "Basic Usage" }],
	"artifact-card": [{ name: "BasicUsage", title: "Basic Usage" }],
	"ai-data-table": [{ name: "BasicUsage", title: "Basic Usage" }],
	composer: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "FullComposer", title: "Full Composer" },
	],
	"voice-input": [{ name: "BasicUsage", title: "Basic Usage" }],
	"context-ring": [{ name: "BasicUsage", title: "Basic Usage" }],
	"scroll-anchor": [{ name: "BasicUsage", title: "Basic Usage" }],
	"thread-list": [{ name: "BasicUsage", title: "Basic Usage" }],
	"chat-panel": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "FullConversation", title: "Full Conversation" },
	],

	button: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "Variants", title: "Variants", description: "All six visual treatments." },
		{ name: "Sizes", title: "Sizes", description: "Small, medium, and large." },
		{
			name: "LoadingState",
			title: "Loading State",
			description: "Spinner in place of the icon, activation blocked, no dimming.",
		},
		{ name: "WithIcons", title: "With Icons", description: "iconStart and iconEnd snippets." },
		{
			name: "AsLink",
			title: "As Link",
			description: "href renders an anchor instead of a button.",
		},
		{
			name: "DisabledState",
			title: "Disabled State",
			description: "Disabled on the button vs. the anchor — two different mechanisms.",
		},
	],
	"icon-button": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "Variants", title: "Variants" },
		{ name: "Sizes", title: "Sizes" },
		{ name: "Shapes", title: "Shapes" },
	],
	"button-group": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "SegmentedControl",
			title: "Segmented Control",
			description:
				"A Day / Week / Month picker; the active item is the demo's own state, not ButtonGroup's.",
		},
		{
			name: "SplitButton",
			title: "Split Button",
			description: "A wide primary action and a narrow trailing trigger, joined by the same seam.",
		},
		{
			name: "Vertical",
			title: "Vertical",
			description:
				'orientation="vertical" stacks the items and rotates the divider onto the same axis.',
		},
	],
	link: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "Variants", title: "Variants", description: "Default vs. muted color treatment." },
		{
			name: "ExternalLink",
			title: "External Link",
			description: "Off-site link with the arrow glyph, new tab, and safe rel.",
		},
		{
			name: "UnderlineModes",
			title: "Underline Modes",
			description: "hover, always, and none underline behavior.",
		},
	],
	toggle: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A single icon-only toggle with a bound pressed state.",
		},
		{ name: "Sizes", title: "Sizes", description: "The three available sizes, sm/md/lg." },
		{ name: "Variants", title: "Variants", description: "Ghost vs. outline, resting and pressed." },
		{
			name: "TextFormatting",
			title: "Text Formatting",
			description: "A bold/italic/underline row with a live preview.",
		},
	],
	"toggle-group": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "SingleSelection",
			title: "Single Selection",
			description: "Activating the active item again clears it.",
		},
		{
			name: "MultipleSelection",
			title: "Multiple Selection",
			description: 'Independent on/off marks with type="multiple".',
		},
		{
			name: "Vertical",
			title: "Vertical",
			description: "A vertical rail — both arrow-key pairs still work.",
		},
		{
			name: "DisabledItems",
			title: "Disabled Items",
			description: "One item unavailable; the keyboard model skips it.",
		},
	],
	"copy-button": [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "An outline button that copies a value on click.",
		},
		{
			name: "IconOnly",
			title: "Icon Only",
			description: "Drops the visible label into aria-label for a toolbar.",
		},
		{
			name: "CustomLabels",
			title: "Custom Labels",
			description: "Overrides the idle and copied label text.",
		},
		{
			name: "Variants",
			title: "Variants",
			description: "Four Button variants used as the idle skin.",
		},
	],

	label: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "Required",
			title: "Required",
			description: "The asterisk is decoration — the accessible cue is the control's own required.",
		},
		{
			name: "WithFormField",
			title: "With FormField",
			description: "for and required resolve from context — nothing to wire by hand.",
		},
	],
	"form-field": [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A labelled field with help text underneath.",
		},
		{
			name: "WithError",
			title: "With Error",
			description: "error replaces the help text and marks the field invalid.",
		},
		{
			name: "Validated",
			title: "Validated",
			description: "valid's decorative checkmark, plus a control drawing its own success look.",
		},
		{
			name: "Disabled",
			title: "Disabled",
			description: "disabled reaches the control through context.",
		},
	],
	input: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A single email field with a bound value.",
		},
		{
			name: "States",
			title: "States",
			description: "Resting, focus, error and disabled, side by side.",
		},
		{
			name: "Types",
			title: "Types",
			description: "Every native input type the component accepts.",
		},
		{
			name: "WithFormField",
			title: "With FormField",
			description: "Wrapped in FormField and Label — no id or invalid prop needed on Input itself.",
		},
	],
	textarea: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A single multi-line message field with a bound value.",
		},
		{
			name: "WithCounter",
			title: "With Counter",
			description: 'maxlength plus the live "n / max" counter.',
		},
		{
			name: "AutoResize",
			title: "Auto Resize",
			description: "Grows with content instead of scrolling.",
		},
	],
	checkbox: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A single checkbox with a bound checked state.",
		},
		{
			name: "States",
			title: "States",
			description: "Unchecked, checked, indeterminate and disabled, side by side.",
		},
		{
			name: "Indeterminate",
			title: "Indeterminate",
			description: "A parent checkbox reflecting a mixed selection of children.",
		},
		{
			name: "WithFormField",
			title: "With FormField",
			description: "Wrapped in FormField — no id or invalid prop needed on Checkbox itself.",
		},
	],
	"radio-group": [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "Three options, one selected by default.",
		},
		{
			name: "Horizontal",
			title: "Horizontal",
			description: "The list laid out along a row instead of a column.",
		},
		{
			name: "DisabledItems",
			title: "Disabled Items",
			description: "One option unavailable — skipped by the keyboard and never selectable.",
		},
		{
			name: "WithFormField",
			title: "With FormField",
			description: "Wrapped in FormField — required and the error message driven by context.",
		},
	],
	switch: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A single switch with a bound checked state and no visible label text.",
		},
		{
			name: "Sizes",
			title: "Sizes",
			description: "The three available sizes, sm/md/lg.",
		},
		{
			name: "WithLabel",
			title: "With Label",
			description: "Visible label text rendered beside the track via children.",
		},
	],
	slider: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "WithBounds", title: "With Bounds", description: "Shows the min/max end labels." },
		{ name: "Steps", title: "Steps", description: "A stepped 0–5 rating scale." },
	],
	"number-input": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "WithLimits",
			title: "With Limits",
			description: "Bounded 1–8 with the buttons disabling at the edges.",
		},
		{
			name: "FractionalSteps",
			title: "Fractional Steps",
			description: "0.1 steps over a 0–1 range, without float drift.",
		},
	],

	dialog: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A trigger, title, description, body and footer.",
		},
		{
			name: "ControlledOpen",
			title: "Controlled Open",
			description: "Non-bound open plus onOpenChange, no trigger snippet.",
		},
		{
			name: "NotDismissible",
			title: "Not Dismissible",
			description: "dismissible={false} — Escape and outside click both disabled.",
		},
		{
			name: "CustomInitialFocus",
			title: "Custom Initial Focus",
			description: "Sends focus to a specific field instead of the default close button.",
		},
	],
	"alert-dialog": [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A destructive delete confirmation with a trigger.",
		},
		{
			name: "ControlledOpen",
			title: "Controlled Open",
			description: "Non-bound open plus onOpenChange, triggered from a list row.",
		},
		{
			name: "CustomLabels",
			title: "Custom Labels",
			description: "A non-delete use case — signing out of every device.",
		},
	],
	sheet: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{ name: "Sides", title: "Sides", description: "Slide in from any edge of the viewport." },
		{ name: "WithFooter", title: "With Footer", description: "Pin actions below the body." },
	],
	drawer: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "WithForm",
			title: "With Form",
			description: "House form fields with a pinned footer.",
		},
		{ name: "NoSwipe", title: "No Swipe", description: "Disable the drag-to-close gesture." },
	],
	popover: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A Dimensions panel with two labelled fields, matching the mockup.",
		},
		{
			name: "Sides",
			title: "Sides",
			description: "The panel placed on each of the four sides.",
		},
		{
			name: "WithForm",
			title: "With Form",
			description:
				"An interactive form inside the panel, closing itself on submit — bind:open plus focus-trapped input and button.",
		},
	],
	tooltip: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A heart IconButton with a tooltip, matching the mockup.",
		},
		{
			name: "Sides",
			title: "Sides",
			description: "The tooltip placed on each of the four sides.",
		},
		{
			name: "Delays",
			title: "Delays",
			description: "openDelay and closeDelay tuned away from their defaults.",
		},
	],
	"hover-card": [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A profile preview that opens on hover or focus.",
		},
		{
			name: "WithStats",
			title: "With Stats",
			description: "A richer card with a stats row, anchored above the trigger.",
		},
	],
	toast: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "Call toast() from a click handler; <Toaster /> renders the result.",
		},
		{
			name: "Variants",
			title: "Variants",
			description: "Success, error, info and loading, side by side.",
		},
		{
			name: "WithAction",
			title: "With Action",
			description: "An error toast carrying a Retry action.",
		},
		{
			name: "Persistent",
			title: "Persistent",
			description: "duration: Infinity — dismissed only by the user, never automatically.",
		},
	],

	select: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "Three frameworks, one selected by default.",
		},
		{
			name: "WithFormField",
			title: "With FormField",
			description: "Wrapped in FormField — required and the error message driven by context.",
		},
		{
			name: "DisabledOptions",
			title: "Disabled Options",
			description: "One option unavailable — skipped by keyboard, typeahead and pointer selection.",
		},
		{
			name: "Placement",
			title: "Placement",
			description: "The panel anchored on all four sides of the trigger.",
		},
	],
	combobox: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "Four frameworks, filtered by typing.",
		},
		{
			name: "CustomFilter",
			title: "Custom Filter",
			description:
				"Matches by value prefix instead of the label — shows the highlight degrading gracefully when the match isn't a literal label substring.",
		},
		{
			name: "WithFormField",
			title: "With FormField",
			description: "Wrapped in FormField — required and the error message driven by context.",
		},
	],
	autocomplete: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A city field with six candidate suggestions.",
		},
		{
			name: "MinLength",
			title: "Min Length",
			description: "Suggestions stay hidden until the third character.",
		},
		{
			name: "WithFormField",
			title: "With FormField",
			description: "Wrapped in FormField — required and the error message driven by context.",
		},
	],
	"search-input": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "Debounced",
			title: "Debounced",
			description: "onSearch fires 300ms after typing settles instead of on every keystroke.",
		},
		{ name: "WithFormField", title: "With FormField" },
	],
	"password-input": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "WithStrength",
			title: "With Strength Meter",
			description: "showStrength turns on the meter and label once there's a value.",
		},
		{
			name: "NewPassword",
			title: "New Password",
			description: 'autocomplete="new-password" plus showStrength, inside a FormField.',
		},
	],
	"file-upload": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "MultipleWithProgress",
			title: "Multiple, With Progress",
			description:
				"Driving status/progress from an onFilesChange callback with a simulated upload.",
		},
		{
			name: "Constraints",
			title: "Constraints",
			description: "accept, maxSize and maxFiles all enforced in JS on both the picker and a drop.",
		},
		{ name: "WithFormField", title: "With FormField" },
	],
	"date-picker": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "WithBounds",
			title: "With Bounds",
			description: "Restricted to a 30-day window starting today.",
		},
		{
			name: "DisabledDates",
			title: "Disabled Dates",
			description: "Weekends rejected via isDateDisabled.",
		},
		{
			name: "WithFormField",
			title: "With FormField",
			description: "Wrapped in FormField — required and the error message driven by context.",
		},
	],
	"time-picker": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "CustomStep",
			title: "Custom Step",
			description: "15-minute slots instead of the default 30.",
		},
		{
			name: "WithBounds",
			title: "With Bounds",
			description: "Restricted to business hours, 09:00 to 17:00.",
		},
	],

	navbar: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "WithActions",
			title: "With Actions",
			description: "Search and a sign-in button on the right.",
		},
		{
			name: "StickyBar",
			title: "Sticky Bar",
			description: "Pinned to the top of a scrolling container with a blurred background.",
		},
	],
	sidebar: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "WithBadges",
			title: "With Badges",
			description: "A count folded into an item's accessible name, and a second grouped section.",
		},
		{
			name: "Collapsed",
			title: "Collapsed",
			description: "Icon-only rail — labels and badge meaning move to sr-only text, never removed.",
		},
		{
			name: "WithFooter",
			title: "With Footer",
			description: "An avatar and name row, above a separator, pinned to the bottom.",
		},
	],
	tabs: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "Three tabs, automatic activation, the underline variant.",
		},
		{
			name: "SegmentedVariant",
			title: "Segmented Variant",
			description: "The pill-rail visual style instead of the accent underline.",
		},
		{
			name: "ManualActivation",
			title: "Manual Activation",
			description: "Arrow keys only move focus; Enter/Space or a click selects.",
		},
		{
			name: "VerticalTabs",
			title: "Vertical Tabs",
			description: "Stacked in a column, with Up/Down driving the roving tabindex.",
		},
		{
			name: "DisabledTab",
			title: "Disabled Tab",
			description: "One trigger unavailable — skipped by the arrows and Home/End.",
		},
	],
	breadcrumb: [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description: "A three-level trail; the last item is the current page.",
		},
		{
			name: "Truncated",
			title: "Truncated",
			description: "A five-level trail collapsed to first, ellipsis, and last two.",
		},
		{
			name: "CustomSeparator",
			title: "Custom Separator",
			description: "A '>' glyph in place of the default slash.",
		},
	],
	pagination: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "ManyPages",
			title: "Many Pages",
			description: "A 200-page run — the sequence stays a handful of numbers plus two ellipses.",
		},
		{
			name: "WithEdges",
			title: "With First/Last",
			description: "First/Last jump buttons alongside Previous/Next.",
		},
		{ name: "DisabledState", title: "Disabled State" },
	],
	stepper: [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "VerticalStepper",
			title: "Vertical Stepper",
			description: "Stacked in a column instead of a horizontal row.",
		},
		{
			name: "ClickableSteps",
			title: "Clickable Steps",
			description: "Steps render as buttons a reader can click to jump between them.",
		},
		{
			name: "WithDescriptions",
			title: "With Descriptions",
			description: "A secondary line under each step's label.",
		},
	],
	"dropdown-menu": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "WithShortcuts",
			title: "With Shortcuts",
			description: "Display-only keyboard shortcuts rendered as trailing kbd tags.",
		},
		{
			name: "DestructiveItem",
			title: "Destructive Item",
			description: "A destructive action set apart with the destructive variant.",
		},
		{
			name: "WithSubmenu",
			title: "With Submenu",
			description: "A nested submenu that opens on hover, click or ArrowRight.",
		},
		{
			name: "DisabledItems",
			title: "Disabled Items",
			description: "Disabled rows are skipped by keyboard navigation and inert to click.",
		},
	],
	"context-menu": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "WithSubmenu",
			title: "With Submenu",
			description:
				"A nested submenu inside a context menu, using the same Sub primitives as DropdownMenu.",
		},
		{
			name: "DisabledItems",
			title: "Disabled Items",
			description: "Disabled rows are skipped by keyboard navigation and inert to click.",
		},
	],
	"command-menu": [
		{ name: "BasicUsage", title: "Basic Usage" },
		{
			name: "GroupedItems",
			title: "Grouped Items",
			description: "Items with no group render first, then each group under its own heading.",
		},
		{
			name: "EmptyState",
			title: "Empty State",
			description: "The message shown when nothing matches the query.",
		},
		{
			name: "CustomFilter",
			title: "Custom Filter",
			description: "Replacing the default filter entirely, e.g. with a prefix match.",
		},
		{
			name: "WithKeywords",
			title: "With Keywords",
			description: "Matching on keywords that never appear in the visible label.",
		},
	],
	"navigation-menu": [
		{
			name: "BasicUsage",
			title: "Basic Usage",
			description:
				"Two triggers, each opening a two-column panel with a feature tile and link rows.",
		},
		{
			name: "SimpleLinks",
			title: "Simple Links",
			description: "A single trigger opening a plain, single-column stack of links.",
		},
		{
			name: "WithCurrentPage",
			title: "With Current Page",
			description: "A panel where one link is marked as the current page.",
		},
	],
	sound: [
		{
			name: "BasicUsage",
			title: "Sound Lab",
			description:
				"Every cue, its volume, and when to reach for it. Nothing plays until you switch sound on.",
		},
		{
			name: "ProgrammaticPlay",
			title: "Programmatic Play",
			description:
				"sound.play() from an async handler — a no-op while sound is off, so call sites never branch on it.",
		},
		{
			name: "SoundFeedbackAction",
			title: "The soundFeedback Action",
			description:
				"use:soundFeedback on any element, with cues swapped at runtime through the action's update path.",
		},
		{
			name: "WithButtons",
			title: "With Buttons",
			description:
				"Button and CopyButton playing their own press and copy cues through the opt-in prop.",
		},
		{
			name: "WithFormControls",
			title: "With Form Controls",
			description: "Checkbox, Switch and RadioGroup — toggle-on, toggle-off and select.",
		},
		{
			name: "WithMenus",
			title: "With Menus",
			description: "Select and DropdownMenu — open, close and select, one cue per interaction.",
		},
	],
};
