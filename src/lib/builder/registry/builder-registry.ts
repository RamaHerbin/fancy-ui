/**
 * Builder Registry
 *
 * Defines which components are available in the site builder,
 * along with their editable prop schemas and builder metadata.
 * Separate from the fancy-ui registry (which tracks implementation status).
 */

import type { BuilderComponentMeta } from '../types/registry.js';

// =============================================================================
// Layout Primitives
// =============================================================================

const layoutPrimitives: Record<string, BuilderComponentMeta> = {
	_section: {
		name: 'Section',
		slug: '_section',
		description: 'Page section with optional padding and background',
		icon: 'LayoutTemplate',
		paletteCategory: 'layout',
		acceptsChildren: true,
		propSchemas: {
			class: { type: 'string', label: 'CSS Classes', default: '' },
			padding: {
				type: 'select',
				label: 'Padding',
				default: 'py-16 px-4',
				options: [
					{ label: 'None', value: '' },
					{ label: 'Small', value: 'py-8 px-4' },
					{ label: 'Medium', value: 'py-16 px-4' },
					{ label: 'Large', value: 'py-24 px-4' }
				]
			},
			maxWidth: {
				type: 'select',
				label: 'Max Width',
				default: 'max-w-6xl',
				options: [
					{ label: 'Full', value: '' },
					{ label: 'Small (3xl)', value: 'max-w-3xl' },
					{ label: 'Medium (5xl)', value: 'max-w-5xl' },
					{ label: 'Large (6xl)', value: 'max-w-6xl' },
					{ label: 'XL (7xl)', value: 'max-w-7xl' }
				]
			},
			background: {
				type: 'string',
				label: 'Background',
				default: '',
				description: 'Tailwind bg class (e.g. bg-muted, bg-primary/10)'
			}
		}
	},

	_container: {
		name: 'Container',
		slug: '_container',
		description: 'Centered container with max width',
		icon: 'Box',
		paletteCategory: 'layout',
		acceptsChildren: true,
		propSchemas: {
			class: { type: 'string', label: 'CSS Classes', default: '' },
			maxWidth: {
				type: 'select',
				label: 'Max Width',
				default: 'max-w-6xl',
				options: [
					{ label: 'Small (3xl)', value: 'max-w-3xl' },
					{ label: 'Medium (5xl)', value: 'max-w-5xl' },
					{ label: 'Large (6xl)', value: 'max-w-6xl' },
					{ label: 'XL (7xl)', value: 'max-w-7xl' }
				]
			}
		}
	},

	_grid: {
		name: 'Grid',
		slug: '_grid',
		description: 'CSS Grid layout with configurable columns',
		icon: 'LayoutGrid',
		paletteCategory: 'layout',
		acceptsChildren: true,
		propSchemas: {
			class: { type: 'string', label: 'CSS Classes', default: '' },
			columns: {
				type: 'select',
				label: 'Columns',
				default: '3',
				options: [
					{ label: '1 Column', value: '1' },
					{ label: '2 Columns', value: '2' },
					{ label: '3 Columns', value: '3' },
					{ label: '4 Columns', value: '4' }
				]
			},
			gap: {
				type: 'select',
				label: 'Gap',
				default: 'gap-6',
				options: [
					{ label: 'None', value: '' },
					{ label: 'Small', value: 'gap-2' },
					{ label: 'Medium', value: 'gap-4' },
					{ label: 'Large', value: 'gap-6' },
					{ label: 'XL', value: 'gap-8' }
				]
			}
		}
	},

	_flex: {
		name: 'Flex',
		slug: '_flex',
		description: 'Flexbox layout container',
		icon: 'AlignHorizontalSpaceAround',
		paletteCategory: 'layout',
		acceptsChildren: true,
		propSchemas: {
			class: { type: 'string', label: 'CSS Classes', default: '' },
			direction: {
				type: 'select',
				label: 'Direction',
				default: 'row',
				options: [
					{ label: 'Row', value: 'row' },
					{ label: 'Column', value: 'column' },
					{ label: 'Row Reverse', value: 'row-reverse' },
					{ label: 'Column Reverse', value: 'column-reverse' }
				]
			},
			align: {
				type: 'select',
				label: 'Align Items',
				default: 'center',
				options: [
					{ label: 'Start', value: 'start' },
					{ label: 'Center', value: 'center' },
					{ label: 'End', value: 'end' },
					{ label: 'Stretch', value: 'stretch' }
				]
			},
			justify: {
				type: 'select',
				label: 'Justify Content',
				default: 'start',
				options: [
					{ label: 'Start', value: 'start' },
					{ label: 'Center', value: 'center' },
					{ label: 'End', value: 'end' },
					{ label: 'Between', value: 'between' },
					{ label: 'Around', value: 'around' }
				]
			},
			gap: {
				type: 'select',
				label: 'Gap',
				default: 'gap-4',
				options: [
					{ label: 'None', value: '' },
					{ label: 'Small', value: 'gap-2' },
					{ label: 'Medium', value: 'gap-4' },
					{ label: 'Large', value: 'gap-6' },
					{ label: 'XL', value: 'gap-8' }
				]
			},
			wrap: {
				type: 'boolean',
				label: 'Wrap',
				default: false
			}
		}
	},

	_text: {
		name: 'Text',
		slug: '_text',
		description: 'Text block with configurable style',
		icon: 'Type',
		paletteCategory: 'text',
		acceptsChildren: false,
		propSchemas: {
			content: {
				type: 'string',
				label: 'Content',
				default: 'Enter text here...',
				multiline: true
			},
			tag: {
				type: 'select',
				label: 'HTML Tag',
				default: 'p',
				options: [
					{ label: 'Paragraph', value: 'p' },
					{ label: 'Heading 1', value: 'h1' },
					{ label: 'Heading 2', value: 'h2' },
					{ label: 'Heading 3', value: 'h3' },
					{ label: 'Heading 4', value: 'h4' },
					{ label: 'Span', value: 'span' }
				]
			},
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	_image: {
		name: 'Image',
		slug: '_image',
		description: 'Image element with alt text',
		icon: 'Image',
		paletteCategory: 'media',
		acceptsChildren: false,
		propSchemas: {
			src: { type: 'image', label: 'Image URL', default: '' },
			alt: { type: 'string', label: 'Alt Text', default: '' },
			width: { type: 'number', label: 'Width', min: 0, step: 1, description: 'Intrinsic width for CLS optimization' },
			height: { type: 'number', label: 'Height', min: 0, step: 1, description: 'Intrinsic height for CLS optimization' },
			class: { type: 'string', label: 'CSS Classes', default: '' },
			objectFit: {
				type: 'select',
				label: 'Object Fit',
				default: 'cover',
				options: [
					{ label: 'Cover', value: 'cover' },
					{ label: 'Contain', value: 'contain' },
					{ label: 'Fill', value: 'fill' },
					{ label: 'None', value: 'none' }
				]
			}
		}
	},

	_spacer: {
		name: 'Spacer',
		slug: '_spacer',
		description: 'Vertical space between blocks',
		icon: 'SeparatorHorizontal',
		paletteCategory: 'layout',
		acceptsChildren: false,
		propSchemas: {
			size: {
				type: 'select',
				label: 'Size',
				default: 'h-8',
				options: [
					{ label: 'XS', value: 'h-2' },
					{ label: 'Small', value: 'h-4' },
					{ label: 'Medium', value: 'h-8' },
					{ label: 'Large', value: 'h-16' },
					{ label: 'XL', value: 'h-24' },
					{ label: 'XXL', value: 'h-32' }
				]
			}
		}
	}
};

// =============================================================================
// FancyUI Components
// =============================================================================

const fancyComponents: Record<string, BuilderComponentMeta> = {
	'border-beam': {
		name: 'BorderBeam',
		slug: 'border-beam',
		description: 'Animated beam traveling around borders',
		icon: 'Sparkles',
		paletteCategory: 'effects',
		acceptsChildren: false,
		propSchemas: {
			size: { type: 'number', label: 'Beam Size', default: 200, min: 50, max: 500, step: 10 },
			duration: { type: 'number', label: 'Duration (s)', default: 15, min: 1, max: 60, step: 1 },
			borderWidth: {
				type: 'number',
				label: 'Border Width',
				default: 1.5,
				min: 0.5,
				max: 5,
				step: 0.5
			},
			anchor: { type: 'number', label: 'Anchor', default: 90, min: 0, max: 360, step: 1 },
			colorFrom: { type: 'color', label: 'Color From', default: '#ffaa40' },
			colorTo: { type: 'color', label: 'Color To', default: '#9c40ff' },
			delay: { type: 'number', label: 'Delay (s)', default: 0, min: 0, max: 10, step: 0.5 }
		}
	},

	'glow-border': {
		name: 'GlowBorder',
		slug: 'glow-border',
		description: 'Animated glowing border with gradient',
		icon: 'Sun',
		paletteCategory: 'effects',
		acceptsChildren: true,
		propSchemas: {
			borderRadius: {
				type: 'number',
				label: 'Border Radius',
				default: 10,
				min: 0,
				max: 50,
				step: 1
			},
			borderWidth: {
				type: 'number',
				label: 'Border Width',
				default: 2,
				min: 1,
				max: 10,
				step: 1
			},
			duration: { type: 'number', label: 'Duration (s)', default: 10, min: 1, max: 30, step: 1 },
			color: { type: 'color', label: 'Color', default: '#FFFFFF' },
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	meteors: {
		name: 'Meteors',
		slug: 'meteors',
		description: 'Animated meteor shower effect',
		icon: 'Zap',
		paletteCategory: 'effects',
		acceptsChildren: false,
		propSchemas: {
			count: { type: 'number', label: 'Count', default: 20, min: 1, max: 50, step: 1 },
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	'shimmer-button': {
		name: 'ShimmerButton',
		slug: 'shimmer-button',
		description: 'Button with shimmer border effect',
		icon: 'MousePointerClick',
		paletteCategory: 'buttons',
		acceptsChildren: false,
		propSchemas: {
			text: {
				type: 'string',
				label: 'Button Text',
				default: 'Click me',
				description: 'Text displayed inside the button'
			},
			shimmerColor: { type: 'color', label: 'Shimmer Color', default: '#ffffff' },
			shimmerSize: { type: 'string', label: 'Shimmer Size', default: '0.05em' },
			borderRadius: { type: 'string', label: 'Border Radius', default: '100px' },
			shimmerDuration: { type: 'string', label: 'Duration', default: '3s' },
			background: { type: 'string', label: 'Background', default: 'rgba(0, 0, 0, 1)' },
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	'rainbow-button': {
		name: 'RainbowButton',
		slug: 'rainbow-button',
		description: 'Button with rainbow gradient border',
		icon: 'Rainbow',
		paletteCategory: 'buttons',
		acceptsChildren: false,
		propSchemas: {
			text: {
				type: 'string',
				label: 'Button Text',
				default: 'Click me',
				description: 'Text displayed inside the button'
			},
			speed: { type: 'number', label: 'Speed (s)', default: 2, min: 0.5, max: 10, step: 0.5 },
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	marquee: {
		name: 'Marquee',
		slug: 'marquee',
		description: 'Infinite scrolling content',
		icon: 'MoveHorizontal',
		paletteCategory: 'layout',
		acceptsChildren: true,
		propSchemas: {
			reverse: { type: 'boolean', label: 'Reverse', default: false },
			pauseOnHover: { type: 'boolean', label: 'Pause on Hover', default: false },
			vertical: { type: 'boolean', label: 'Vertical', default: false },
			repeat: { type: 'number', label: 'Repeat', default: 4, min: 1, max: 10, step: 1 },
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	ripple: {
		name: 'Ripple',
		slug: 'ripple',
		description: 'Concentric pulsing circles',
		icon: 'Waves',
		paletteCategory: 'effects',
		acceptsChildren: false,
		propSchemas: {
			baseCircleSize: {
				type: 'number',
				label: 'Circle Size',
				default: 210,
				min: 50,
				max: 500,
				step: 10
			},
			numberOfCircles: {
				type: 'number',
				label: 'Circle Count',
				default: 7,
				min: 1,
				max: 15,
				step: 1
			},
			waveSpeed: {
				type: 'number',
				label: 'Wave Speed',
				default: 80,
				min: 10,
				max: 200,
				step: 10
			},
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	'sparkles-text': {
		name: 'SparklesText',
		slug: 'sparkles-text',
		description: 'Text with animated sparkle stars',
		icon: 'Sparkle',
		paletteCategory: 'text',
		acceptsChildren: false,
		propSchemas: {
			text: { type: 'string', label: 'Text', default: 'Sparkles' },
			sparklesCount: {
				type: 'number',
				label: 'Sparkle Count',
				default: 10,
				min: 1,
				max: 30,
				step: 1
			},
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	'colourful-text': {
		name: 'ColourfulText',
		slug: 'colourful-text',
		description: 'Per-character color animation',
		icon: 'Palette',
		paletteCategory: 'text',
		acceptsChildren: false,
		propSchemas: {
			text: { type: 'string', label: 'Text', default: 'Colourful' },
			duration: {
				type: 'number',
				label: 'Duration (s)',
				default: 0.5,
				min: 0.1,
				max: 3,
				step: 0.1
			},
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	'number-ticker': {
		name: 'NumberTicker',
		slug: 'number-ticker',
		description: 'Animated number counter',
		icon: 'Hash',
		paletteCategory: 'text',
		acceptsChildren: false,
		propSchemas: {
			value: { type: 'number', label: 'Value', default: 100, min: 0, max: 999999, step: 1 },
			direction: {
				type: 'select',
				label: 'Direction',
				default: 'up',
				options: [
					{ label: 'Up', value: 'up' },
					{ label: 'Down', value: 'down' }
				]
			},
			duration: {
				type: 'number',
				label: 'Duration (ms)',
				default: 1000,
				min: 100,
				max: 5000,
				step: 100
			},
			delay: { type: 'number', label: 'Delay (ms)', default: 0, min: 0, max: 3000, step: 100 },
			decimalPlaces: {
				type: 'number',
				label: 'Decimal Places',
				default: 0,
				min: 0,
				max: 4,
				step: 1
			},
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	'flip-words': {
		name: 'FlipWords',
		slug: 'flip-words',
		description: 'Cycling word animation',
		icon: 'RotateCw',
		paletteCategory: 'text',
		acceptsChildren: false,
		propSchemas: {
			words: {
				type: 'json',
				label: 'Words',
				default: ['Hello', 'World', 'Svelte'],
				description: 'JSON array of words to cycle through'
			},
			duration: {
				type: 'number',
				label: 'Duration (ms)',
				default: 3000,
				min: 500,
				max: 10000,
				step: 100
			},
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	'card-spotlight': {
		name: 'CardSpotlight',
		slug: 'card-spotlight',
		description: 'Card with spotlight gradient on hover',
		icon: 'Lightbulb',
		paletteCategory: 'cards',
		acceptsChildren: true,
		propSchemas: {
			gradientSize: {
				type: 'number',
				label: 'Gradient Size',
				default: 200,
				min: 50,
				max: 500,
				step: 10
			},
			gradientColor: { type: 'color', label: 'Gradient Color', default: '#262626' },
			gradientOpacity: {
				type: 'number',
				label: 'Gradient Opacity',
				default: 0.8,
				min: 0,
				max: 1,
				step: 0.1
			},
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	'neon-border': {
		name: 'NeonBorder',
		slug: 'neon-border',
		description: 'Dual-color neon glow border',
		icon: 'Lightbulb',
		paletteCategory: 'effects',
		acceptsChildren: true,
		propSchemas: {
			color1: { type: 'color', label: 'Color 1', default: '#0496ff' },
			color2: { type: 'color', label: 'Color 2', default: '#ff0a54' },
			animationType: {
				type: 'select',
				label: 'Animation',
				default: 'half',
				options: [
					{ label: 'None', value: 'none' },
					{ label: 'Half', value: 'half' },
					{ label: 'Full', value: 'full' }
				]
			},
			duration: { type: 'number', label: 'Duration (s)', default: 6, min: 1, max: 20, step: 1 },
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	'letter-pullup': {
		name: 'LetterPullup',
		slug: 'letter-pullup',
		description: 'Staggered letter pull-up animation',
		icon: 'ArrowUp',
		paletteCategory: 'text',
		acceptsChildren: false,
		propSchemas: {
			words: { type: 'string', label: 'Text', default: 'Letter Pullup' },
			delay: {
				type: 'number',
				label: 'Delay per letter (s)',
				default: 0.05,
				min: 0.01,
				max: 0.3,
				step: 0.01
			},
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	},

	'box-reveal': {
		name: 'BoxReveal',
		slug: 'box-reveal',
		description: 'Content reveal with sliding box',
		icon: 'Square',
		paletteCategory: 'text',
		acceptsChildren: true,
		propSchemas: {
			color: { type: 'color', label: 'Box Color', default: '#5046e6' },
			duration: {
				type: 'number',
				label: 'Duration (s)',
				default: 0.5,
				min: 0.1,
				max: 2,
				step: 0.1
			},
			delay: {
				type: 'number',
				label: 'Delay (s)',
				default: 0.25,
				min: 0,
				max: 2,
				step: 0.05
			},
			class: { type: 'string', label: 'CSS Classes', default: '' }
		}
	}
};

// =============================================================================
// Combined Registry
// =============================================================================

export const builderRegistry: Record<string, BuilderComponentMeta> = {
	...layoutPrimitives,
	...fancyComponents
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
export function getBuilderComponentsByCategory(
	category: string
): BuilderComponentMeta[] {
	return Object.values(builderRegistry).filter((c) => c.paletteCategory === category);
}

/** Check if a slug is a layout primitive */
export function isLayoutPrimitive(slug: string): boolean {
	return slug.startsWith('_');
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
