<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { TickNavItem } from "./types.js";

export interface TickNavProps {
	/** The rows, top to bottom. */
	items: TickNavItem[];
	/**
	 * Called with the id of an item that is activated and not already current.
	 * The current id is the `value` model (`v-model:value`).
	 */
	onValueChange?: (id: string) => void;
	/** Rows over which the neighbours of the hovered row still react. */
	reach?: number;
	/** Ruler ticks drawn between two rows. */
	minorTicks?: number;
	/** Accessible name of the `<nav>` landmark. */
	ariaLabel?: string;
	/**
	 * Plays a cue each time a mouse or pen plucks a line: `hover` for an
	 * item's line, a softer `tick` for a ruler tick. Off by default; only
	 * audible once the user has enabled sound.
	 */
	sound?: boolean;
	/** Additional CSS classes on the `<nav>`. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import {
	createTickNavCore,
	TICK_NAV_DEFAULTS,
	TICK_NAV_FLAT_PATH,
	type TickNavCore,
} from "./tick-nav-core.js";

defineOptions({ name: "TickNav", inheritAttrs: false });

const props = withDefaults(defineProps<TickNavProps>(), {
	reach: TICK_NAV_DEFAULTS.reach,
	minorTicks: 2,
	ariaLabel: "Navigation",
	sound: false,
});

/** Id of the current item. */
const value = defineModel<string>("value");

defineSlots<{
	/**
	 * Content of the card that follows the pointer while a row is hovered (or
	 * sits beside a keyboard-focused row). Leave it out and no card is rendered.
	 */
	preview?(p: { item: TickNavItem }): unknown;
}>();

const root = useTemplateRef<HTMLElement>("root");
const list = useTemplateRef<HTMLUListElement>("list");
/** Row under the pointer or keyboard focus; -1 when none. */
const active = ref(-1);
let core: TickNavCore | null = null;

const reduced = useReducedMotion();

const ticks = computed(() => Math.max(0, Math.round(props.minorTicks)));
const currentIndex = computed(() => props.items.findIndex((item) => item.id === value.value));
const activeItem = computed(() => (active.value >= 0 ? props.items[active.value] : undefined));

onMounted(() => {
	if (!root.value || !list.value) return;
	core = createTickNavCore(root.value, list.value, {
		reach: props.reach,
		current: currentIndex.value,
		reducedMotion: reduced.value,
		onActiveChange(index) {
			active.value = index;
		},
		onPluck(kind) {
			if (!props.sound) return;
			if (kind === "row") soundFx.play("hover");
			else soundFx.play("tick", { volume: 0.6 });
		},
	});
});

onBeforeUnmount(() => {
	core?.destroy();
	core = null;
	active.value = -1;
});

watch(
	[() => props.reach, currentIndex, reduced],
	() => {
		core?.update({
			reach: props.reach,
			current: currentIndex.value,
			reducedMotion: reduced.value,
		});
	},
	{ flush: "post" }
);

// Rows were added, removed or reordered: the core re-reads them after the DOM update.
watch(
	() => props.items.map((item) => item.id).join("\u0000"),
	() => core?.refresh(),
	{ flush: "post" }
);

function activate(item: TickNavItem, event: MouseEvent): void {
	if (item.disabled) {
		event.preventDefault();
		return;
	}
	if (item.id === value.value) return;
	value.value = item.id;
	props.onValueChange?.(item.id);
}
</script>

<template>
	<nav ref="root" :aria-label="ariaLabel" :class="cn('tn-root', props.class)">
		<ul ref="list" class="tn-list">
			<li
				v-for="(item, i) in items"
				:key="item.id"
				class="tn-item"
				:data-current="item.id === value ? '' : undefined"
				:data-active="i === active ? '' : undefined"
				:data-disabled="item.disabled ? '' : undefined"
			>
				<a
					v-if="item.href && !item.disabled"
					class="tn-link"
					:href="item.href"
					:aria-current="item.id === value ? 'page' : undefined"
					@click="activate(item, $event)"
				>
					<svg class="tn-bar" viewBox="0 0 54 8" preserveAspectRatio="none" aria-hidden="true">
						<path class="tn-path" :d="TICK_NAV_FLAT_PATH" />
					</svg>
					<span class="tn-label">
						{{ item.label }}
						<span v-if="item.badge" class="tn-badge">{{ item.badge }}</span>
					</span>
				</a>
				<button
					v-else
					type="button"
					class="tn-link"
					:disabled="item.disabled"
					:aria-current="item.id === value ? 'page' : undefined"
					@click="activate(item, $event)"
				>
					<svg class="tn-bar" viewBox="0 0 54 8" preserveAspectRatio="none" aria-hidden="true">
						<path class="tn-path" :d="TICK_NAV_FLAT_PATH" />
					</svg>
					<span class="tn-label">
						{{ item.label }}
						<span v-if="item.badge" class="tn-badge">{{ item.badge }}</span>
					</span>
				</button>
				<span v-if="ticks > 0 && i < items.length - 1" class="tn-ticks" aria-hidden="true">
					<span v-for="(_, k) in ticks" :key="k" class="tn-tick">
						<svg viewBox="0 0 54 8" preserveAspectRatio="none">
							<path class="tn-tick-path" :d="TICK_NAV_FLAT_PATH" />
						</svg>
					</span>
				</span>
			</li>
		</ul>

		<div v-if="$slots.preview && activeItem" class="tn-preview" aria-hidden="true">
			<slot name="preview" :item="activeItem" />
		</div>
	</nav>
</template>

<style scoped>
.tn-root {
	--tn-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	--tn-border: color-mix(in oklab, currentColor 16%, transparent);
	--tn-row-gap: 0.5rem;
	position: relative;
}

.tn-list,
.tn-item {
	display: flex;
	flex-direction: column;
	gap: var(--tn-row-gap);
	margin: 0;
	padding: 0;
	list-style: none;
}

/* A row is one pixel tall, like the ruler line it sits on; the ::after
	   below gives it a comfortable hit area that overlaps the ticks around it. */
.tn-link {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.75rem;
	height: 1px;
	margin: 0;
	padding: 0;
	border: 0;
	background: none;
	font: inherit;
	color: inherit;
	text-align: left;
	text-decoration: none;
	cursor: pointer;
	outline: none;
}

.tn-link::after {
	content: "";
	position: absolute;
	left: 0;
	top: 50%;
	width: 100%;
	height: 1.75rem;
	transform: translateY(-50%);
}

.tn-bar {
	flex-shrink: 0;
	width: var(--tn-len, 32px);
	height: 0.5rem;
	overflow: visible;
}

.tn-path {
	fill: none;
	stroke: color-mix(in oklab, var(--tn-accent) calc(var(--tn-near, 0) * 100%), var(--tn-border));
	stroke-width: 1.5;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.tn-item[data-current] .tn-path {
	stroke: var(--tn-accent);
}

.tn-label {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	white-space: nowrap;
	opacity: 0.4;
	transition:
		color 150ms ease,
		opacity 150ms ease;
}

.tn-item[data-active] .tn-label,
.tn-item[data-current] .tn-label {
	color: var(--tn-accent);
	opacity: 1;
}

.tn-item[data-disabled] .tn-link {
	cursor: not-allowed;
}

.tn-item[data-disabled] .tn-label {
	opacity: 0.2;
}

.tn-link:focus-visible .tn-label {
	outline: 2px solid var(--tn-accent);
	outline-offset: 4px;
	border-radius: 2px;
}

.tn-badge {
	font-size: 0.625rem;
	opacity: 0.7;
}

.tn-ticks {
	display: flex;
	flex-direction: column;
	gap: var(--tn-row-gap);
}

.tn-tick {
	position: relative;
	display: block;
	height: 1px;
	width: calc(24px + 16px * var(--tn-tick-near, 0));
}

.tn-tick svg {
	position: absolute;
	left: 0;
	top: 50%;
	width: 100%;
	height: 0.5rem;
	overflow: visible;
	transform: translateY(-50%);
}

.tn-tick-path {
	fill: none;
	stroke: color-mix(
		in oklab,
		var(--tn-accent) calc(var(--tn-tick-near, 0) * 60%),
		var(--tn-border)
	);
	stroke-width: 1;
	stroke-linecap: round;
}

.tn-preview {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 20;
	width: 13rem;
	aspect-ratio: 16 / 9;
	overflow: hidden;
	border: 1px solid color-mix(in oklab, currentColor 10%, transparent);
	border-radius: 0.75rem;
	background: var(--tn-preview-bg, Canvas);
	box-shadow:
		0 10px 15px -3px rgb(0 0 0 / 0.1),
		0 4px 6px -4px rgb(0 0 0 / 0.1);
	pointer-events: none;
	opacity: var(--tn-po, 0);
	transform: translate(var(--tn-px, 0), var(--tn-py, 0));
}
</style>
