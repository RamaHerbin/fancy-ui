/**
 * Builder Registry
 *
 * Defines which components are available in the site builder,
 * along with their editable prop schemas and builder metadata.
 * Separate from the fancy-ui registry (which tracks porting status).
 */

import type { BuilderComponentMeta } from "../types/registry.js";

// =============================================================================
// Layout Primitives
// =============================================================================

const layoutPrimitives: Record<string, BuilderComponentMeta> = {
	_section: {
		name: "Section",
		slug: "_section",
		description: "Page section with optional padding and background",
		icon: "LayoutTemplate",
		paletteCategory: "layout",
		acceptsChildren: true,
		propSchemas: {
			anchorId: {
				type: "string",
				label: "Anchor ID",
				default: "",
				description: "HTML id for anchor linking (e.g. bio, courses)",
				placeholder: "section-id",
				group: "Content",
			},
			padding: {
				type: "spacing",
				label: "Padding",
				default: "py-16 px-4",
				properties: ["padding"],
				group: "Layout",
			},
			maxWidth: {
				type: "select",
				label: "Max Width",
				default: "max-w-6xl",
				options: [
					{ label: "Full", value: "" },
					{ label: "Small (3xl)", value: "max-w-3xl" },
					{ label: "Medium (5xl)", value: "max-w-5xl" },
					{ label: "Large (6xl)", value: "max-w-6xl" },
					{ label: "XL (7xl)", value: "max-w-7xl" },
				],
				group: "Layout",
			},
			background: {
				type: "string",
				label: "Background",
				default: "",
				description: "Tailwind bg class (e.g. bg-muted, bg-primary/10)",
				group: "Style",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_container: {
		name: "Container",
		slug: "_container",
		description: "Centered container with max width",
		icon: "Box",
		paletteCategory: "layout",
		acceptsChildren: true,
		propSchemas: {
			maxWidth: {
				type: "select",
				label: "Max Width",
				default: "max-w-6xl",
				options: [
					{ label: "Small (3xl)", value: "max-w-3xl" },
					{ label: "Medium (5xl)", value: "max-w-5xl" },
					{ label: "Large (6xl)", value: "max-w-6xl" },
					{ label: "XL (7xl)", value: "max-w-7xl" },
				],
				group: "Layout",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_grid: {
		name: "Grid",
		slug: "_grid",
		description: "CSS Grid layout with configurable columns",
		icon: "LayoutGrid",
		paletteCategory: "layout",
		acceptsChildren: true,
		propSchemas: {
			columns: {
				type: "select",
				label: "Columns",
				default: "3",
				options: [
					{ label: "1 Column", value: "1" },
					{ label: "2 Columns", value: "2" },
					{ label: "3 Columns", value: "3" },
					{ label: "4 Columns", value: "4" },
				],
				group: "Layout",
			},
			gap: {
				type: "select",
				label: "Gap",
				default: "gap-6",
				options: [
					{ label: "None", value: "" },
					{ label: "Small", value: "gap-2" },
					{ label: "Medium", value: "gap-4" },
					{ label: "Large", value: "gap-6" },
					{ label: "XL", value: "gap-8" },
				],
				group: "Layout",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_flex: {
		name: "Flex",
		slug: "_flex",
		description: "Flexbox layout container",
		icon: "AlignHorizontalSpaceAround",
		paletteCategory: "layout",
		acceptsChildren: true,
		propSchemas: {
			direction: {
				type: "select",
				label: "Direction",
				default: "row",
				display: "icon-buttons",
				options: [
					{ label: "Row", value: "row", icon: "ArrowRight" },
					{ label: "Column", value: "column", icon: "ArrowDown" },
					{ label: "Row Reverse", value: "row-reverse", icon: "ArrowLeft" },
					{ label: "Column Reverse", value: "column-reverse", icon: "ArrowUp" },
				],
				group: "Layout",
			},
			align: {
				type: "select",
				label: "Align Items",
				default: "center",
				display: "icon-buttons",
				options: [
					{ label: "Start", value: "start", icon: "AlignStartVertical" },
					{ label: "Center", value: "center", icon: "AlignCenterVertical" },
					{ label: "End", value: "end", icon: "AlignEndVertical" },
					{ label: "Stretch", value: "stretch", icon: "StretchVertical" },
				],
				group: "Layout",
			},
			justify: {
				type: "select",
				label: "Justify Content",
				default: "start",
				display: "icon-buttons",
				options: [
					{ label: "Start", value: "start", icon: "AlignHorizontalJustifyStart" },
					{ label: "Center", value: "center", icon: "AlignHorizontalJustifyCenter" },
					{ label: "End", value: "end", icon: "AlignHorizontalJustifyEnd" },
					{ label: "Between", value: "between", icon: "AlignHorizontalSpaceBetween" },
					{ label: "Around", value: "around", icon: "AlignHorizontalSpaceAround" },
				],
				group: "Layout",
			},
			gap: {
				type: "select",
				label: "Gap",
				default: "gap-4",
				options: [
					{ label: "None", value: "" },
					{ label: "Small", value: "gap-2" },
					{ label: "Medium", value: "gap-4" },
					{ label: "Large", value: "gap-6" },
					{ label: "XL", value: "gap-8" },
				],
				group: "Layout",
			},
			wrap: {
				type: "boolean",
				label: "Wrap",
				default: false,
				group: "Layout",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_text: {
		name: "Text",
		slug: "_text",
		description: "Text block with configurable style",
		icon: "Type",
		paletteCategory: "text",
		acceptsChildren: false,
		propSchemas: {
			content: {
				type: "string",
				label: "Content",
				default: "Enter text here...",
				multiline: true,
				group: "Content",
			},
			tag: {
				type: "select",
				label: "HTML Tag",
				default: "p",
				options: [
					{ label: "Paragraph", value: "p" },
					{ label: "Heading 1", value: "h1" },
					{ label: "Heading 2", value: "h2" },
					{ label: "Heading 3", value: "h3" },
					{ label: "Heading 4", value: "h4" },
					{ label: "Span", value: "span" },
				],
				group: "Content",
			},
			anchorId: {
				type: "string",
				label: "Anchor ID",
				default: "",
				description: "HTML id for anchor linking",
				placeholder: "heading-id",
				group: "Content",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_image: {
		name: "Image",
		slug: "_image",
		description: "Image element with alt text",
		icon: "Image",
		paletteCategory: "media",
		acceptsChildren: false,
		propSchemas: {
			src: { type: "image", label: "Image URL", default: "", group: "Content" },
			alt: { type: "string", label: "Alt Text", default: "", group: "Content" },
			width: {
				type: "number",
				label: "Width",
				min: 0,
				step: 1,
				description: "Intrinsic width for CLS optimization",
				group: "Layout",
			},
			height: {
				type: "number",
				label: "Height",
				min: 0,
				step: 1,
				description: "Intrinsic height for CLS optimization",
				group: "Layout",
			},
			objectFit: {
				type: "select",
				label: "Object Fit",
				default: "cover",
				options: [
					{ label: "Cover", value: "cover" },
					{ label: "Contain", value: "contain" },
					{ label: "Fill", value: "fill" },
					{ label: "None", value: "none" },
				],
				group: "Layout",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_spacer: {
		name: "Spacer",
		slug: "_spacer",
		description: "Vertical space between blocks",
		icon: "SeparatorHorizontal",
		paletteCategory: "layout",
		acceptsChildren: false,
		propSchemas: {
			size: {
				type: "select",
				label: "Size",
				default: "h-8",
				options: [
					{ label: "XS", value: "h-2" },
					{ label: "Small", value: "h-4" },
					{ label: "Medium", value: "h-8" },
					{ label: "Large", value: "h-16" },
					{ label: "XL", value: "h-24" },
					{ label: "XXL", value: "h-32" },
				],
			},
		},
	},
};

// =============================================================================
// Content & Navigation Primitives
// =============================================================================

const contentPrimitives: Record<string, BuilderComponentMeta> = {
	_link: {
		name: "Link / Button",
		slug: "_link",
		description: "Clickable link or button with optional icon",
		icon: "ExternalLink",
		paletteCategory: "navigation",
		acceptsChildren: false,
		propSchemas: {
			text: { type: "string", label: "Text", default: "Click here", group: "Content" },
			href: {
				type: "link",
				label: "Link",
				default: { href: "#", target: "_self" },
				group: "Content",
			},
			variant: {
				type: "select",
				label: "Variant",
				default: "link",
				options: [
					{ label: "Link", value: "link" },
					{ label: "Button", value: "button" },
					{ label: "Ghost", value: "ghost" },
				],
				group: "Content",
			},
			icon: { type: "icon", label: "Icon", default: "", group: "Content" },
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_divider: {
		name: "Divider",
		slug: "_divider",
		description: "Horizontal rule / separator",
		icon: "Minus",
		paletteCategory: "layout",
		acceptsChildren: false,
		propSchemas: {
			style: {
				type: "select",
				label: "Style",
				default: "solid",
				options: [
					{ label: "Solid", value: "solid" },
					{ label: "Dashed", value: "dashed" },
					{ label: "Dotted", value: "dotted" },
				],
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_badge: {
		name: "Badge",
		slug: "_badge",
		description: "Small status or label tag",
		icon: "Tag",
		paletteCategory: "content",
		acceptsChildren: false,
		propSchemas: {
			text: { type: "string", label: "Text", default: "Badge" },
			variant: {
				type: "select",
				label: "Variant",
				default: "default",
				options: [
					{ label: "Default", value: "default" },
					{ label: "Secondary", value: "secondary" },
					{ label: "Outline", value: "outline" },
					{ label: "Destructive", value: "destructive" },
				],
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_list: {
		name: "List",
		slug: "_list",
		description: "Ordered or unordered list from items",
		icon: "List",
		paletteCategory: "content",
		acceptsChildren: false,
		propSchemas: {
			items: {
				type: "json",
				label: "Items",
				default: ["Item 1", "Item 2", "Item 3"],
				description: "JSON array of strings",
			},
			ordered: { type: "boolean", label: "Ordered", default: false },
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_card: {
		name: "Card",
		slug: "_card",
		description: "Card container with border and shadow",
		icon: "CreditCard",
		paletteCategory: "content",
		acceptsChildren: true,
		propSchemas: {
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"_card-header": {
		name: "Card Header",
		slug: "_card-header",
		description: "Header area of a card",
		icon: "CreditCard",
		paletteCategory: "content",
		acceptsChildren: true,
		propSchemas: {
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"_card-content": {
		name: "Card Content",
		slug: "_card-content",
		description: "Main content area of a card",
		icon: "CreditCard",
		paletteCategory: "content",
		acceptsChildren: true,
		propSchemas: {
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"_card-footer": {
		name: "Card Footer",
		slug: "_card-footer",
		description: "Footer area of a card",
		icon: "CreditCard",
		paletteCategory: "content",
		acceptsChildren: true,
		propSchemas: {
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"_rich-text": {
		name: "Rich Text",
		slug: "_rich-text",
		description: "Markdown-rendered text block",
		icon: "FileText",
		paletteCategory: "text",
		acceptsChildren: false,
		propSchemas: {
			content: {
				type: "string",
				label: "Content (Markdown)",
				default: "**Hello** world. This is *rich text*.",
				multiline: true,
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_icon: {
		name: "Icon",
		slug: "_icon",
		description: "Lucide icon with configurable size and color",
		icon: "Smile",
		paletteCategory: "content",
		acceptsChildren: false,
		propSchemas: {
			name: { type: "icon", label: "Icon", default: "Star", group: "Content" },
			size: {
				type: "number",
				label: "Size",
				default: 24,
				min: 12,
				max: 128,
				step: 4,
				group: "Style",
			},
			color: { type: "color", label: "Color", default: "", group: "Style" },
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_document: {
		name: "Document Card",
		slug: "_document",
		description: "Downloadable or embeddable document card",
		icon: "FileDown",
		paletteCategory: "content",
		acceptsChildren: false,
		propSchemas: {
			src: {
				type: "string",
				label: "Document URL",
				default: "",
				placeholder: "https://example.com/file.pdf",
			},
			title: { type: "string", label: "Title", default: "Document" },
			description: {
				type: "string",
				label: "Description",
				default: "",
			},
			action: {
				type: "select",
				label: "Action",
				default: "download",
				options: [
					{ label: "Download", value: "download" },
					{ label: "Embed", value: "embed" },
				],
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_nav: {
		name: "Navigation Bar",
		slug: "_nav",
		description: "Site navigation bar (reads items from site config)",
		icon: "Menu",
		paletteCategory: "navigation",
		acceptsChildren: false,
		propSchemas: {
			variant: {
				type: "select",
				label: "Variant",
				default: "sticky",
				options: [
					{ label: "Sticky", value: "sticky" },
					{ label: "Static", value: "static" },
				],
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_footer: {
		name: "Footer",
		slug: "_footer",
		description: "Site footer with copyright and links (reads from site config)",
		icon: "PanelBottom",
		paletteCategory: "navigation",
		acceptsChildren: false,
		propSchemas: {
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"_maths-background": {
		name: "Maths Background",
		slug: "_maths-background",
		description: "Decorative background with floating mathematical formulas and symbols",
		icon: "Pi",
		paletteCategory: "backgrounds",
		acceptsChildren: false,
		propSchemas: {
			density: {
				type: "number",
				label: "Formula density",
				default: 20,
				min: 5,
				max: 30,
				step: 1,
				description: "Number of floating formulas",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	_tabs: {
		name: "Tabs",
		slug: "_tabs",
		description: "Tabbed content container",
		icon: "PanelTop",
		paletteCategory: "content",
		acceptsChildren: true,
		allowedChildTypes: ["_tab-item"],
		propSchemas: {
			defaultTab: {
				type: "string",
				label: "Default Tab",
				default: "",
				description: "Value of the initially active tab",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"_tab-item": {
		name: "Tab Item",
		slug: "_tab-item",
		description: "Single tab panel within a Tabs block",
		icon: "PanelTop",
		paletteCategory: "content",
		acceptsChildren: true,
		propSchemas: {
			label: { type: "string", label: "Tab Label", default: "Tab" },
			value: {
				type: "string",
				label: "Tab Value",
				default: "tab",
				description: "Unique identifier for this tab",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},
};

// =============================================================================
// FancyUI Components
// =============================================================================

const fancyComponents: Record<string, BuilderComponentMeta> = {
	"border-beam": {
		name: "BorderBeam",
		slug: "border-beam",
		description: "Animated beam traveling around borders",
		icon: "Sparkles",
		paletteCategory: "effects",
		acceptsChildren: false,
		propSchemas: {
			size: {
				type: "number",
				label: "Beam Size",
				default: 200,
				min: 50,
				max: 500,
				step: 10,
				group: "Style",
			},
			duration: {
				type: "number",
				label: "Duration (s)",
				default: 15,
				min: 1,
				max: 60,
				step: 1,
				group: "Animation",
			},
			borderWidth: {
				type: "number",
				label: "Border Width",
				default: 1.5,
				min: 0.5,
				max: 5,
				step: 0.5,
				group: "Style",
			},
			anchor: {
				type: "number",
				label: "Anchor",
				default: 90,
				min: 0,
				max: 360,
				step: 1,
				group: "Style",
			},
			colorFrom: { type: "color", label: "Color From", default: "#ffaa40", group: "Style" },
			colorTo: { type: "color", label: "Color To", default: "#9c40ff", group: "Style" },
			delay: {
				type: "number",
				label: "Delay (s)",
				default: 0,
				min: 0,
				max: 10,
				step: 0.5,
				group: "Animation",
			},
		},
	},

	"glow-border": {
		name: "GlowBorder",
		slug: "glow-border",
		description: "Animated glowing border with gradient",
		icon: "Sun",
		paletteCategory: "effects",
		acceptsChildren: true,
		propSchemas: {
			borderRadius: {
				type: "number",
				label: "Border Radius",
				default: 10,
				min: 0,
				max: 50,
				step: 1,
				group: "Style",
			},
			borderWidth: {
				type: "number",
				label: "Border Width",
				default: 2,
				min: 1,
				max: 10,
				step: 1,
				group: "Style",
			},
			duration: {
				type: "number",
				label: "Duration (s)",
				default: 10,
				min: 1,
				max: 30,
				step: 1,
				group: "Animation",
			},
			color: { type: "color", label: "Color", default: "#FFFFFF", group: "Style" },
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	meteors: {
		name: "Meteors",
		slug: "meteors",
		description: "Animated meteor shower effect",
		icon: "Zap",
		paletteCategory: "effects",
		acceptsChildren: false,
		propSchemas: {
			count: {
				type: "number",
				label: "Count",
				default: 20,
				min: 1,
				max: 50,
				step: 1,
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"shimmer-button": {
		name: "ShimmerButton",
		slug: "shimmer-button",
		description: "Button with shimmer border effect",
		icon: "MousePointerClick",
		paletteCategory: "buttons",
		acceptsChildren: false,
		propSchemas: {
			text: {
				type: "string",
				label: "Button Text",
				default: "Click me",
				description: "Text displayed inside the button",
				group: "Content",
			},
			shimmerColor: {
				type: "color",
				label: "Shimmer Color",
				default: "#ffffff",
				group: "Style",
			},
			shimmerSize: { type: "string", label: "Shimmer Size", default: "0.05em", group: "Style" },
			borderRadius: {
				type: "string",
				label: "Border Radius",
				default: "100px",
				group: "Style",
			},
			shimmerDuration: { type: "string", label: "Duration", default: "3s", group: "Animation" },
			background: {
				type: "string",
				label: "Background",
				default: "rgba(0, 0, 0, 1)",
				group: "Style",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"rainbow-button": {
		name: "RainbowButton",
		slug: "rainbow-button",
		description: "Button with rainbow gradient border",
		icon: "Rainbow",
		paletteCategory: "buttons",
		acceptsChildren: false,
		propSchemas: {
			text: {
				type: "string",
				label: "Button Text",
				default: "Click me",
				description: "Text displayed inside the button",
			},
			speed: {
				type: "number",
				label: "Speed (s)",
				default: 2,
				min: 0.5,
				max: 10,
				step: 0.5,
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	marquee: {
		name: "Marquee",
		slug: "marquee",
		description: "Infinite scrolling content",
		icon: "MoveHorizontal",
		paletteCategory: "layout",
		acceptsChildren: true,
		propSchemas: {
			reverse: { type: "boolean", label: "Reverse", default: false, group: "Behavior" },
			pauseOnHover: {
				type: "boolean",
				label: "Pause on Hover",
				default: false,
				group: "Behavior",
			},
			vertical: { type: "boolean", label: "Vertical", default: false, group: "Behavior" },
			repeat: {
				type: "number",
				label: "Repeat",
				default: 4,
				min: 1,
				max: 10,
				step: 1,
				group: "Behavior",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	ripple: {
		name: "Ripple",
		slug: "ripple",
		description: "Concentric pulsing circles",
		icon: "Waves",
		paletteCategory: "effects",
		acceptsChildren: false,
		propSchemas: {
			baseCircleSize: {
				type: "number",
				label: "Circle Size",
				default: 210,
				min: 50,
				max: 500,
				step: 10,
			},
			numberOfCircles: {
				type: "number",
				label: "Circle Count",
				default: 7,
				min: 1,
				max: 15,
				step: 1,
			},
			waveSpeed: {
				type: "number",
				label: "Wave Speed",
				default: 80,
				min: 10,
				max: 200,
				step: 10,
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"sparkles-text": {
		name: "SparklesText",
		slug: "sparkles-text",
		description: "Text with animated sparkle stars",
		icon: "Sparkle",
		paletteCategory: "text",
		acceptsChildren: false,
		propSchemas: {
			text: { type: "string", label: "Text", default: "Sparkles" },
			sparklesCount: {
				type: "number",
				label: "Sparkle Count",
				default: 10,
				min: 1,
				max: 30,
				step: 1,
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"colourful-text": {
		name: "ColourfulText",
		slug: "colourful-text",
		description: "Per-character color animation",
		icon: "Palette",
		paletteCategory: "text",
		acceptsChildren: false,
		propSchemas: {
			text: { type: "string", label: "Text", default: "Colourful" },
			duration: {
				type: "number",
				label: "Duration (s)",
				default: 0.5,
				min: 0.1,
				max: 3,
				step: 0.1,
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"number-ticker": {
		name: "NumberTicker",
		slug: "number-ticker",
		description: "Animated number counter",
		icon: "Hash",
		paletteCategory: "text",
		acceptsChildren: false,
		propSchemas: {
			value: {
				type: "number",
				label: "Value",
				default: 100,
				min: 0,
				max: 999999,
				step: 1,
				group: "Content",
			},
			direction: {
				type: "select",
				label: "Direction",
				default: "up",
				options: [
					{ label: "Up", value: "up" },
					{ label: "Down", value: "down" },
				],
				group: "Content",
			},
			duration: {
				type: "number",
				label: "Duration (ms)",
				default: 1000,
				min: 100,
				max: 5000,
				step: 100,
				group: "Animation",
			},
			delay: {
				type: "number",
				label: "Delay (ms)",
				default: 0,
				min: 0,
				max: 3000,
				step: 100,
				group: "Animation",
			},
			decimalPlaces: {
				type: "number",
				label: "Decimal Places",
				default: 0,
				min: 0,
				max: 4,
				step: 1,
				group: "Content",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"flip-words": {
		name: "FlipWords",
		slug: "flip-words",
		description: "Cycling word animation",
		icon: "RotateCw",
		paletteCategory: "text",
		acceptsChildren: false,
		propSchemas: {
			words: {
				type: "json",
				label: "Words",
				default: ["Hello", "World", "Svelte"],
				description: "JSON array of words to cycle through",
			},
			duration: {
				type: "number",
				label: "Duration (ms)",
				default: 3000,
				min: 500,
				max: 10000,
				step: 100,
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"card-spotlight": {
		name: "CardSpotlight",
		slug: "card-spotlight",
		description: "Card with spotlight gradient on hover",
		icon: "Lightbulb",
		paletteCategory: "cards",
		acceptsChildren: true,
		propSchemas: {
			gradientSize: {
				type: "number",
				label: "Gradient Size",
				default: 200,
				min: 50,
				max: 500,
				step: 10,
			},
			gradientColor: {
				type: "color",
				label: "Gradient Color",
				default: "#262626",
			},
			gradientOpacity: {
				type: "number",
				label: "Gradient Opacity",
				default: 0.8,
				min: 0,
				max: 1,
				step: 0.1,
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"neon-border": {
		name: "NeonBorder",
		slug: "neon-border",
		description: "Dual-color neon glow border",
		icon: "Lightbulb",
		paletteCategory: "effects",
		acceptsChildren: true,
		propSchemas: {
			color1: { type: "color", label: "Color 1", default: "#0496ff", group: "Style" },
			color2: { type: "color", label: "Color 2", default: "#ff0a54", group: "Style" },
			animationType: {
				type: "select",
				label: "Animation",
				default: "half",
				options: [
					{ label: "None", value: "none" },
					{ label: "Half", value: "half" },
					{ label: "Full", value: "full" },
				],
				group: "Animation",
			},
			duration: {
				type: "number",
				label: "Duration (s)",
				default: 6,
				min: 1,
				max: 20,
				step: 1,
				group: "Animation",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"letter-pullup": {
		name: "LetterPullup",
		slug: "letter-pullup",
		description: "Staggered letter pull-up animation",
		icon: "ArrowUp",
		paletteCategory: "text",
		acceptsChildren: false,
		propSchemas: {
			words: { type: "string", label: "Text", default: "Letter Pullup" },
			delay: {
				type: "number",
				label: "Delay per letter (s)",
				default: 0.05,
				min: 0.01,
				max: 0.3,
				step: 0.01,
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"box-reveal": {
		name: "BoxReveal",
		slug: "box-reveal",
		description: "Content reveal with sliding box",
		icon: "Square",
		paletteCategory: "text",
		acceptsChildren: true,
		propSchemas: {
			color: { type: "color", label: "Box Color", default: "#5046e6" },
			duration: {
				type: "number",
				label: "Duration (s)",
				default: 0.5,
				min: 0.1,
				max: 2,
				step: 0.1,
			},
			delay: {
				type: "number",
				label: "Delay (s)",
				default: 0.25,
				min: 0,
				max: 2,
				step: 0.05,
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"hyper-text": {
		name: "HyperText",
		slug: "hyper-text",
		description: "Character scramble effect on hover",
		icon: "Sparkle",
		paletteCategory: "text",
		acceptsChildren: false,
		propSchemas: {
			text: { type: "string", label: "Text", default: "Hyper Text" },
			duration: {
				type: "number",
				label: "Duration (ms)",
				default: 800,
				min: 100,
				max: 3000,
				step: 100,
			},
			animateOnLoad: {
				type: "boolean",
				label: "Animate on Load",
				default: true,
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	focus: {
		name: "Focus",
		slug: "focus",
		description: "Word-by-word focus animation with blur",
		icon: "Eye",
		paletteCategory: "text",
		acceptsChildren: false,
		propSchemas: {
			sentence: {
				type: "string",
				label: "Sentence",
				default: "Inspira Focus Effect",
				group: "Content",
			},
			blurAmount: {
				type: "number",
				label: "Blur Amount",
				default: 5,
				min: 1,
				max: 20,
				step: 1,
				group: "Style",
			},
			borderColor: { type: "string", label: "Border Color", default: "green", group: "Style" },
			animationDuration: {
				type: "number",
				label: "Animation Duration (s)",
				default: 0.5,
				min: 0.1,
				max: 2,
				step: 0.1,
				group: "Animation",
			},
			pauseBetweenAnimations: {
				type: "number",
				label: "Pause Between (s)",
				default: 1,
				min: 0.1,
				max: 5,
				step: 0.1,
				group: "Animation",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	sparkles: {
		name: "Sparkles",
		slug: "sparkles",
		description: "Canvas particle background effect",
		icon: "Sparkles",
		paletteCategory: "backgrounds",
		acceptsChildren: false,
		propSchemas: {
			background: { type: "color", label: "Background", default: "#0d47a1", group: "Style" },
			particleColor: {
				type: "color",
				label: "Particle Color",
				default: "#ffffff",
				group: "Style",
			},
			minSize: {
				type: "number",
				label: "Min Size",
				default: 1,
				min: 0.1,
				max: 5,
				step: 0.1,
				group: "Particles",
			},
			maxSize: {
				type: "number",
				label: "Max Size",
				default: 3,
				min: 1,
				max: 10,
				step: 0.5,
				group: "Particles",
			},
			speed: {
				type: "number",
				label: "Speed",
				default: 4,
				min: 0.5,
				max: 20,
				step: 0.5,
				group: "Particles",
			},
			particleDensity: {
				type: "number",
				label: "Particle Density",
				default: 120,
				min: 10,
				max: 500,
				step: 10,
				group: "Particles",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	confetti: {
		name: "Confetti",
		slug: "confetti",
		description: "Confetti celebration effect",
		icon: "PartyPopper",
		paletteCategory: "effects",
		acceptsChildren: false,
		propSchemas: {
			manualstart: {
				type: "boolean",
				label: "Manual Start",
				default: false,
				description: "If true, confetti must be triggered manually",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"interactive-hover-button": {
		name: "InteractiveHoverButton",
		slug: "interactive-hover-button",
		description: "Button with sliding hover effect",
		icon: "MousePointerClick",
		paletteCategory: "buttons",
		acceptsChildren: false,
		propSchemas: {
			text: {
				type: "string",
				label: "Button Text",
				default: "Button",
				description: "Text displayed inside the button",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"gradient-button": {
		name: "GradientButton",
		slug: "gradient-button",
		description: "Button with animated gradient border",
		icon: "Paintbrush",
		paletteCategory: "buttons",
		acceptsChildren: false,
		propSchemas: {
			text: {
				type: "string",
				label: "Button Text",
				default: "Gradient Button",
				description: "Text displayed inside the button",
				group: "Content",
			},
			duration: {
				type: "number",
				label: "Duration (ms)",
				default: 2500,
				min: 500,
				max: 10000,
				step: 100,
				group: "Animation",
			},
			borderWidth: {
				type: "number",
				label: "Border Width",
				default: 2,
				min: 1,
				max: 8,
				step: 1,
				group: "Style",
			},
			borderRadius: {
				type: "number",
				label: "Border Radius",
				default: 8,
				min: 0,
				max: 50,
				step: 1,
				group: "Style",
			},
			blur: {
				type: "number",
				label: "Blur",
				default: 4,
				min: 0,
				max: 20,
				step: 1,
				group: "Style",
			},
			bgColor: { type: "color", label: "Background Color", default: "#000000", group: "Style" },
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"blur-reveal": {
		name: "BlurReveal",
		slug: "blur-reveal",
		description: "Scroll-triggered blur reveal animation",
		icon: "Eye",
		paletteCategory: "text",
		acceptsChildren: false,
		propSchemas: {
			text: {
				type: "string",
				label: "Text",
				default: "Blur Reveal Text",
				description: "Text content to reveal",
				group: "Content",
			},
			duration: {
				type: "number",
				label: "Duration (s)",
				default: 1,
				min: 0.1,
				max: 3,
				step: 0.1,
				group: "Animation",
			},
			delay: {
				type: "number",
				label: "Delay (s)",
				default: 0.2,
				min: 0,
				max: 2,
				step: 0.1,
				group: "Animation",
			},
			blur: { type: "string", label: "Blur Amount", default: "20px", group: "Style" },
			yOffset: {
				type: "number",
				label: "Y Offset",
				default: 20,
				min: 0,
				max: 100,
				step: 5,
				group: "Style",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"direction-aware-hover": {
		name: "DirectionAwareHover",
		slug: "direction-aware-hover",
		description: "Image card with direction-aware hover overlay",
		icon: "MousePointer",
		paletteCategory: "cards",
		acceptsChildren: false,
		propSchemas: {
			text: {
				type: "string",
				label: "Overlay Text",
				default: "Hover me",
				description: "Text shown on hover",
			},
			imageUrl: {
				type: "image",
				label: "Image URL",
				default: "https://picsum.photos/400/400",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"flip-card": {
		name: "FlipCard",
		slug: "flip-card",
		description: "Card that flips on hover",
		icon: "RotateCw",
		paletteCategory: "cards",
		acceptsChildren: false,
		propSchemas: {
			rotate: {
				type: "select",
				label: "Rotate Axis",
				default: "y",
				options: [
					{ label: "Horizontal (Y)", value: "y" },
					{ label: "Vertical (X)", value: "x" },
				],
			},
			frontText: { type: "string", label: "Front Text", default: "Front" },
			backText: { type: "string", label: "Back Text", default: "Back" },
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"bento-grid": {
		name: "BentoGrid",
		slug: "bento-grid",
		description: "Responsive bento-style grid layout",
		icon: "LayoutDashboard",
		paletteCategory: "cards",
		acceptsChildren: true,
		propSchemas: {
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"bento-grid-item": {
		name: "BentoGridItem",
		slug: "bento-grid-item",
		description: "Item for BentoGrid with header, title, description",
		icon: "LayoutDashboard",
		paletteCategory: "cards",
		acceptsChildren: false,
		propSchemas: {
			headerText: { type: "string", label: "Header Text", default: "" },
			titleText: { type: "string", label: "Title", default: "Title" },
			descriptionText: {
				type: "string",
				label: "Description",
				default: "Description",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"card-3d": {
		name: "Card3D",
		slug: "card-3d",
		description: "3D perspective card that follows cursor",
		icon: "Box",
		paletteCategory: "cards",
		acceptsChildren: false,
		propSchemas: {
			title: { type: "string", label: "Title", default: "3D Card" },
			description: {
				type: "string",
				label: "Description",
				default: "Hover to see the 3D effect",
			},
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},

	"container-scroll": {
		name: "ContainerScroll",
		slug: "container-scroll",
		description: "Scroll-triggered 3D card effect",
		icon: "ScrollText",
		paletteCategory: "effects",
		acceptsChildren: false,
		propSchemas: {
			titleText: {
				type: "string",
				label: "Title",
				default: "Scroll Animation",
			},
			subtitleText: {
				type: "string",
				label: "Subtitle",
				default: "Powered by FancyUI",
			},
			imageSrc: { type: "image", label: "Image", default: "" },
			imageAlt: { type: "string", label: "Image Alt", default: "Preview" },
			class: { type: "class", label: "CSS Classes", default: "", advanced: true },
		},
	},
};

// =============================================================================
// Combined Registry
// =============================================================================

export const builderRegistry: Record<string, BuilderComponentMeta> = {
	...layoutPrimitives,
	...contentPrimitives,
	...fancyComponents,
};

/** Get a builder component by slug */
export function getBuilderComponent(slug: string): BuilderComponentMeta | undefined {
	return builderRegistry[slug];
}

/** Get all builder components */
export function getAllBuilderComponents(): BuilderComponentMeta[] {
	return Object.values(builderRegistry);
}

/** Get builder components by palette category */
export function getBuilderComponentsByCategory(category: string): BuilderComponentMeta[] {
	return Object.values(builderRegistry).filter((c) => c.paletteCategory === category);
}

/** Check if a slug is a layout primitive */
export function isLayoutPrimitive(slug: string): boolean {
	return slug.startsWith("_");
}

/** Get default props for a component from its schema */
export function getDefaultProps(slug: string): Record<string, unknown> {
	const meta = builderRegistry[slug];
	if (!meta) return {};

	const defaults: Record<string, unknown> = {};
	for (const [key, schema] of Object.entries(meta.propSchemas)) {
		if (schema.default !== undefined) {
			defaults[key] = schema.default;
		}
	}
	return defaults;
}
