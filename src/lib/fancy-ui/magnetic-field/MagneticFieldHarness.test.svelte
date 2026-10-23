<!--
  Test-only rig: a real MagneticField with a list of MagneticItems and an
  optional MagnetPuck, wired the way a consumer would. The puck's position is
  forwarded through this component's own bindable prop so a test can
  round-trip it. Attribute bags land on the root and the first item. Not
  exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import MagneticField from "./MagneticField.svelte";
	import MagneticItem from "./MagneticItem.svelte";
	import MagnetPuck from "./MagnetPuck.svelte";
	import type {
		MagneticFieldSource,
		MagneticPoint,
		MagneticSpring,
		MagneticSpringPreset,
	} from "./magnetic-field-core.js";

	interface Item {
		id: string;
		label: string;
		mass?: number;
		strength?: number;
		pull?: boolean;
		rotate?: boolean;
		inline?: boolean;
	}

	interface Props {
		items?: Item[];
		source?: MagneticFieldSource;
		position?: MagneticPoint | null;
		radius?: number;
		strength?: number;
		maxTranslate?: number;
		maxRotate?: number;
		spring?: MagneticSpringPreset | Partial<MagneticSpring>;
		polarity?: 1 | -1;
		disabled?: boolean;
		onActiveChange?: (active: boolean) => void;
		withPuck?: boolean;
		puckPosition?: MagneticPoint;
		sticky?: boolean;
		rootClass?: string;
		rootRef?: HTMLDivElement | null;
		itemRef?: HTMLElement | null;
		rootAttrs?: Record<string, unknown>;
		itemAttrs?: Record<string, unknown>;
	}

	const DEFAULT_ITEMS: Item[] = [
		{ id: "a", label: "Alpha" },
		{ id: "b", label: "Beta", mass: 2.5 },
	];

	let {
		items = DEFAULT_ITEMS,
		source,
		position,
		radius,
		strength,
		maxTranslate,
		maxRotate,
		spring,
		polarity,
		disabled,
		onActiveChange,
		withPuck = false,
		puckPosition = $bindable({ x: 48, y: 48 }),
		sticky,
		rootClass,
		rootRef = $bindable(null),
		itemRef = $bindable(null),
		rootAttrs = {},
		itemAttrs = {},
	}: Props = $props();

	// Changes `radius` alone: a `rerender` re-notifies every prop at once.
	let radiusOverride = $state<number | undefined>(undefined);
	export function setRadius(next: number) {
		radiusOverride = next;
	}
</script>

<MagneticField
	bind:ref={rootRef}
	data-testid="field"
	class={rootClass}
	{source}
	{position}
	radius={radiusOverride ?? radius}
	{strength}
	{maxTranslate}
	{maxRotate}
	{spring}
	{polarity}
	{disabled}
	{onActiveChange}
	{...rootAttrs}
>
	{#each items as item, i (item.id)}
		{#if i === 0}
			<MagneticItem
				bind:ref={itemRef}
				data-testid={`item-${item.id}`}
				mass={item.mass}
				strength={item.strength}
				pull={item.pull}
				rotate={item.rotate}
				inline={item.inline}
				{...itemAttrs}
			>
				<button type="button">{item.label}</button>
			</MagneticItem>
		{:else}
			<MagneticItem
				data-testid={`item-${item.id}`}
				mass={item.mass}
				strength={item.strength}
				pull={item.pull}
				rotate={item.rotate}
				inline={item.inline}
			>
				<span>{item.label}</span>
			</MagneticItem>
		{/if}
	{/each}
	{#if withPuck}
		<MagnetPuck data-testid="puck" bind:position={puckPosition} {sticky} />
	{/if}
</MagneticField>
