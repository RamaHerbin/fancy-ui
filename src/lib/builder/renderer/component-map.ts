/**
 * Component Map
 *
 * Maps component slugs to their actual Svelte component constructors.
 * Used by BlockRenderer to resolve which component to render for each BlockNode.
 */

import type { Component } from 'svelte';

// Layout primitives
import SectionPrimitive from './primitives/Section.svelte';
import ContainerPrimitive from './primitives/Container.svelte';
import GridPrimitive from './primitives/Grid.svelte';
import FlexPrimitive from './primitives/Flex.svelte';
import TextPrimitive from './primitives/Text.svelte';
import ImagePrimitive from './primitives/Image.svelte';
import SpacerPrimitive from './primitives/Spacer.svelte';

// FancyUI components (direct — these accept props only, no snippet wiring needed)
import { BorderBeam } from '$lib/fancy-ui/border-beam/index.js';
import { GlowBorder } from '$lib/fancy-ui/glow-border/index.js';
import { Meteors } from '$lib/fancy-ui/meteors/index.js';
import { Marquee } from '$lib/fancy-ui/marquee/index.js';
import { Ripple } from '$lib/fancy-ui/ripple/index.js';
import { SparklesText } from '$lib/fancy-ui/sparkles-text/index.js';
import { ColourfulText } from '$lib/fancy-ui/colourful-text/index.js';
import { NumberTicker } from '$lib/fancy-ui/number-ticker/index.js';
import { FlipWords } from '$lib/fancy-ui/flip-words/index.js';
import { CardSpotlight } from '$lib/fancy-ui/card-spotlight/index.js';
import { NeonBorder } from '$lib/fancy-ui/neon-border/index.js';
import { LetterPullup } from '$lib/fancy-ui/letter-pullup/index.js';
import { BoxReveal } from '$lib/fancy-ui/box-reveal/index.js';

// Adapter wrappers (for components that use snippets instead of plain props)
import ShimmerButtonAdapter from './adapters/ShimmerButtonAdapter.svelte';
import RainbowButtonAdapter from './adapters/RainbowButtonAdapter.svelte';
import FlipCardAdapter from './adapters/FlipCardAdapter.svelte';
import BentoGridItemAdapter from './adapters/BentoGridItemAdapter.svelte';
import ContainerScrollAdapter from './adapters/ContainerScrollAdapter.svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = Component<any>;

/**
 * Static map from slug to Svelte component.
 * Add new components here as they become builder-compatible.
 */
export const componentMap: Record<string, AnyComponent> = {
	// Layout primitives
	_section: SectionPrimitive,
	_container: ContainerPrimitive,
	_grid: GridPrimitive,
	_flex: FlexPrimitive,
	_text: TextPrimitive,
	_image: ImagePrimitive,
	_spacer: SpacerPrimitive,

	// FancyUI components
	'border-beam': BorderBeam as AnyComponent,
	'glow-border': GlowBorder as AnyComponent,
	meteors: Meteors as AnyComponent,
	'shimmer-button': ShimmerButtonAdapter as AnyComponent,
	'rainbow-button': RainbowButtonAdapter as AnyComponent,
	marquee: Marquee as AnyComponent,
	ripple: Ripple as AnyComponent,
	'sparkles-text': SparklesText as AnyComponent,
	'colourful-text': ColourfulText as AnyComponent,
	'number-ticker': NumberTicker as AnyComponent,
	'flip-words': FlipWords as AnyComponent,
	'card-spotlight': CardSpotlight as AnyComponent,
	'neon-border': NeonBorder as AnyComponent,
	'letter-pullup': LetterPullup as AnyComponent,
	'box-reveal': BoxReveal as AnyComponent,

	// Adapters for multi-snippet components
	'flip-card': FlipCardAdapter as AnyComponent,
	'bento-grid-item': BentoGridItemAdapter as AnyComponent,
	'container-scroll': ContainerScrollAdapter as AnyComponent
};

/** Resolve a component slug to its Svelte constructor */
export function resolveComponent(slug: string): AnyComponent | undefined {
	return componentMap[slug];
}
