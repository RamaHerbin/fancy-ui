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
	/** How many rows away from the pointer the bars still react. */
	reach?: number;
	/** Extra length, in px, a bar gains right under the pointer. Labels slide by the same amount. */
	maxExtend?: number;
	/** Short ruler ticks drawn between two rows. */
	minorTicks?: number;
	/** Accessible name of the `<nav>` landmark. */
	ariaLabel?: string;
	/**
	 * Plays the `tick` cue each time a mouse or pen moves onto a new row and
	 * `select` when an item that is not already current is activated. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/** Additional CSS classes on the `<nav>`. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";
import { useMediaQuery, useReducedMotion } from "../../internals/motion/use-media-query.js";

defineOptions({ name: "TickNav", inheritAttrs: false });

const props = withDefaults(defineProps<TickNavProps>(), {
	reach: 3,
	maxExtend: 32,
	minorTicks: 3,
	ariaLabel: "Navigation",
	sound: false,
});

/** Id of the current item. */
const value = defineModel<string>("value");

defineSlots<{
	/**
	 * Content of the floating card shown beside the row under the pointer (or
	 * keyboard focus). Leave it out and no card is rendered.
	 */
	preview?(p: { item: TickNavItem }): unknown;
}>();

const list = useTemplateRef<HTMLUListElement>("list");
/** Row under the pointer or keyboard focus; -1 when none. */
const active = ref(-1);
/** Centre of the active row, in list-local px, for the preview card. */
const activeY = ref(0);

const reduced = useReducedMotion();
// `any-hover: none` only when NO attached device can hover (see Dock): a
// hybrid with a mouse still gets the effect; touch is filtered by pointerType.
const coarse = useMediaQuery("(any-hover: none)");

const ticks = computed(() => Math.max(0, Math.round(props.minorTicks)));
const activeItem = computed(() => (active.value >= 0 ? props.items[active.value] : undefined));

// ---------------------------------------------------------------------------
// Proximity field. Per-row extension 0..1 is eased toward its target in a
// rAF loop and written straight to `--tn-e` / `--tn-e-next` on each <li>,
// never through reactive state: a reactive write per row per frame would
// re-render the whole list 60 times a second for what is purely a style.
// ---------------------------------------------------------------------------
let centers: number[] = [];
let rowHeight = 0;
let current: number[] = [];
let target: number[] = [];
let pointerY: number | null = null;
let inside = false;
let frame = 0;
let lastT = 0;

function rows(): HTMLLIElement[] {
	return list.value ? Array.from(list.value.querySelectorAll<HTMLLIElement>(":scope > li")) : [];
}

function measure(): void {
	const els = rows();
	centers = els.map((el) => el.offsetTop + el.offsetHeight / 2);
	rowHeight = els[0]?.offsetHeight ?? 0;
	if (current.length !== els.length) {
		current = els.map((_, i) => current[i] ?? 0);
		target = els.map((_, i) => target[i] ?? 0);
	}
}

function smoothstep(x: number): number {
	const t = Math.min(1, Math.max(0, x));
	return t * t * (3 - 2 * t);
}

function retarget(): void {
	const span = Math.max(1, props.reach) * rowHeight;
	for (let i = 0; i < centers.length; i++) {
		target[i] =
			pointerY === null || span === 0
				? 0
				: smoothstep(1 - Math.abs(pointerY - (centers[i] ?? 0)) / span);
	}
}

function paint(): void {
	const els = rows();
	for (let i = 0; i < els.length; i++) {
		const e = current[i] ?? 0;
		const next = current[i + 1] ?? e;
		els[i]?.style.setProperty("--tn-e", e.toFixed(4));
		els[i]?.style.setProperty("--tn-e-next", next.toFixed(4));
	}
}

function step(t: number): void {
	const dt = lastT ? Math.min(64, t - lastT) : 16;
	lastT = t;
	let moving = false;
	for (let i = 0; i < current.length; i++) {
		const goal = target[i] ?? 0;
		const from = current[i] ?? 0;
		// Rise quickly toward the pointer, relax slowly behind it: the bars
		// leave a fading trail where the pointer has just been.
		const tau = goal > from ? 70 : 260;
		const next = reduced.value ? goal : goal + (from - goal) * Math.exp(-dt / tau);
		current[i] = Math.abs(next - goal) < 0.002 ? goal : next;
		if (current[i] !== goal) moving = true;
	}
	paint();
	frame = moving ? requestAnimationFrame(step) : 0;
	if (!moving) lastT = 0;
}

function kick(): void {
	retarget();
	if (!frame) frame = requestAnimationFrame(step);
}

onBeforeUnmount(() => {
	if (frame) cancelAnimationFrame(frame);
	frame = 0;
});

// Re-measure when rows are added/removed or resized; repaint so a restored
// list does not keep stale extensions.
watch(
	[() => props.items.length, list],
	([, el], _old, onCleanup) => {
		if (!el) return;
		measure();
		paint();
		const ro = new ResizeObserver(() => {
			measure();
			retarget();
			paint();
		});
		ro.observe(el);
		onCleanup(() => ro.disconnect());
	},
	{ flush: "post" }
);

function indexAt(y: number): number {
	const half = rowHeight / 2;
	for (let i = 0; i < centers.length; i++) {
		if (Math.abs(y - (centers[i] ?? 0)) <= half) return i;
	}
	return -1;
}

function setActive(i: number, fromPointer: boolean): void {
	if (i === active.value) return;
	active.value = i;
	if (i >= 0) activeY.value = centers[i] ?? 0;
	if (i >= 0 && fromPointer && props.sound && !props.items[i]?.disabled) soundFx.play("tick");
}

function onPointerMove(event: PointerEvent): void {
	if (event.pointerType === "touch" || !event.isPrimary || !list.value) return;
	// Re-measure once per visit: cheap, and catches layout shifts (fonts,
	// a parent that scrolled or reflowed) that never resized the list itself.
	if (!inside) {
		measure();
		inside = true;
	}
	const y = event.clientY - list.value.getBoundingClientRect().top;
	setActive(indexAt(y), true);
	if (coarse.value) return;
	pointerY = y;
	kick();
}

function onPointerLeave(event: PointerEvent): void {
	if (event.pointerType === "touch") return;
	inside = false;
	pointerY = null;
	setActive(-1, false);
	kick();
}

// Keyboard focus drives the same field, so the effect is not mouse-only.
function onFocusIn(event: FocusEvent): void {
	const el = event.target as HTMLElement | null;
	const li = el?.closest("li");
	if (!li || !list.value || li.parentElement !== list.value) return;
	if (!el?.matches(":focus-visible")) return;
	measure();
	const i = rows().indexOf(li as HTMLLIElement);
	setActive(i, false);
	pointerY = centers[i] ?? null;
	kick();
}

function onFocusOut(event: FocusEvent): void {
	const next = event.relatedTarget as Node | null;
	if (next && list.value?.contains(next)) return;
	if (pointerY !== null && active.value >= 0) {
		pointerY = null;
		setActive(-1, false);
		kick();
	}
}

function activate(item: TickNavItem, event: MouseEvent): void {
	if (item.disabled) {
		event.preventDefault();
		return;
	}
	if (item.id === value.value) return;
	if (props.sound) soundFx.play("select");
	value.value = item.id;
	props.onValueChange?.(item.id);
}
</script>

<template>
	<nav
		:aria-label="ariaLabel"
		:class="cn('tn-root relative', props.class)"
		:style="{ '--tn-max': `${maxExtend}px` }"
		:data-reduced="reduced ? '' : undefined"
	>
		<ul
			ref="list"
			class="tn-list"
			@pointermove="onPointerMove"
			@pointerleave="onPointerLeave"
			@focusin="onFocusIn"
			@focusout="onFocusOut"
		>
			<li
				v-for="(item, i) in items"
				:key="item.id"
				class="tn-row"
				:data-current="item.id === value ? '' : undefined"
				:data-active="i === active ? '' : undefined"
				:data-disabled="item.disabled ? '' : undefined"
			>
				<span class="tn-rail" aria-hidden="true">
					<span class="tn-bar">
						<svg class="tn-wave" preserveAspectRatio="none" viewBox="0 0 64 8">
							<path
								d="M0 4 Q2 0 4 4 T8 4 T12 4 T16 4 T20 4 T24 4 T28 4 T32 4 T36 4 T40 4 T44 4 T48 4 T52 4 T56 4 T60 4 T64 4 T68 4 T72 4"
							/>
						</svg>
					</span>
					<template v-if="i < items.length - 1">
						<span
							v-for="(_, k) in ticks"
							:key="k"
							class="tn-minor"
							:style="{ '--tn-f': (k + 1) / (ticks + 1) }"
						></span>
					</template>
				</span>
				<a
					v-if="item.href && !item.disabled"
					class="tn-link"
					:href="item.href"
					:aria-current="item.id === value ? 'page' : undefined"
					@click="activate(item, $event)"
				>
					<span class="tn-label">{{ item.label }}</span>
					<span v-if="item.badge" class="tn-badge">{{ item.badge }}</span>
				</a>
				<button
					v-else
					type="button"
					class="tn-link"
					:disabled="item.disabled"
					:aria-current="item.id === value ? 'page' : undefined"
					@click="activate(item, $event)"
				>
					<span class="tn-label">{{ item.label }}</span>
					<span v-if="item.badge" class="tn-badge">{{ item.badge }}</span>
				</button>
			</li>
		</ul>

		<div
			v-if="$slots.preview"
			class="tn-preview"
			aria-hidden="true"
			:data-open="activeItem ? '' : undefined"
			:style="{ '--tn-py': `${activeY}px` }"
		>
			<slot v-if="activeItem" name="preview" :item="activeItem" />
		</div>
	</nav>
</template>

<style scoped>
.tn-root {
	--tn-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	--tn-muted: color-mix(in oklab, currentColor 28%, transparent);
	--tn-row-h: 2.25rem;
	--tn-bar-w: 1.75rem;
	--tn-gap: 0.75rem;
	--tn-minor-w: 0.875rem;
	--tn-current-w: 3.25rem;
	color: inherit;
}

.tn-list {
	position: relative;
	margin: 0;
	padding: 0;
	list-style: none;
}

.tn-row {
	--tn-e: 0;
	--tn-e-next: 0;
	position: relative;
	display: flex;
	align-items: center;
	height: var(--tn-row-h);
}

.tn-rail {
	position: absolute;
	inset-block: 0;
	left: 0;
	width: calc(var(--tn-current-w) + var(--tn-max));
	pointer-events: none;
}

.tn-bar,
.tn-minor {
	position: absolute;
	left: 0;
	height: 1px;
	border-radius: 1px;
}

.tn-bar {
	top: 50%;
	width: calc(var(--tn-bar-w) + var(--tn-e) * var(--tn-max));
	background: color-mix(in oklab, var(--tn-accent) calc(var(--tn-e) * 100%), var(--tn-muted));
	transition: background-color 0.2s;
}

.tn-row[data-current] .tn-bar {
	width: calc(var(--tn-current-w) + var(--tn-e) * var(--tn-max));
	background: var(--tn-accent);
}

/* The active row's bar turns into a moving sine. The flat bar fades out
	   under it, so the swap reads as the line starting to vibrate. */
.tn-wave {
	position: absolute;
	left: 0;
	top: -4px;
	width: 100%;
	height: 9px;
	overflow: hidden;
	opacity: 0;
	fill: none;
	stroke: var(--tn-accent);
	stroke-width: 1.25;
	vector-effect: non-scaling-stroke;
	transition: opacity 0.15s;
}

.tn-wave path {
	stroke-dasharray: 4 0;
}

.tn-row[data-active] .tn-bar {
	background: transparent;
}

.tn-row[data-active] .tn-wave {
	opacity: 1;
}

.tn-row[data-active] .tn-wave path {
	animation: tn-wave 0.6s linear infinite;
}

@keyframes tn-wave {
	to {
		transform: translateX(-8px);
	}
}

.tn-minor {
	top: calc(50% + var(--tn-f) * var(--tn-row-h));
	--tn-m: calc(var(--tn-e) * (1 - var(--tn-f)) + var(--tn-e-next) * var(--tn-f));
	width: calc(var(--tn-minor-w) + var(--tn-m) * var(--tn-max) * 0.6);
	background: color-mix(
		in oklab,
		var(--tn-accent) calc(var(--tn-m) * 80%),
		color-mix(in oklab, var(--tn-muted) 60%, transparent)
	);
}

.tn-link {
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	height: 100%;
	/* The label rides the tip of its bar: same gap whatever the bar's length. */
	margin-left: calc(var(--tn-bar-w) + var(--tn-gap) - 0.5rem);
	padding: 0 0.5rem;
	border: 0;
	background: none;
	font: inherit;
	color: color-mix(in oklab, currentColor 62%, transparent);
	text-decoration: none;
	text-align: left;
	cursor: pointer;
	transform: translateX(calc(var(--tn-e) * var(--tn-max)));
	transition:
		color 0.2s,
		margin-left 0.3s cubic-bezier(0.22, 1, 0.36, 1);
	outline: none;
}

.tn-row[data-active] .tn-link {
	color: inherit;
}

.tn-row[data-current] .tn-link {
	margin-left: calc(var(--tn-current-w) + var(--tn-gap) - 0.5rem);
	color: var(--tn-accent);
}

.tn-link:focus-visible .tn-label {
	outline: 2px solid var(--tn-accent);
	outline-offset: 3px;
	border-radius: 2px;
}

.tn-row[data-disabled] .tn-link {
	cursor: not-allowed;
	opacity: 0.45;
}

.tn-label {
	white-space: nowrap;
}

.tn-badge {
	font-size: 0.7em;
	opacity: 0.6;
}

.tn-preview {
	position: absolute;
	top: 0;
	left: calc(100% + var(--tn-max) + 0.75rem);
	z-index: 10;
	pointer-events: none;
	opacity: 0;
	transform: translateY(calc(var(--tn-py) - 50%)) scale(0.97);
	transform-origin: left center;
	transition:
		transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
		opacity 0.16s ease;
}

.tn-preview[data-open] {
	opacity: 1;
	transform: translateY(calc(var(--tn-py) - 50%)) scale(1);
}

.tn-root[data-reduced] .tn-preview,
.tn-root[data-reduced] .tn-wave {
	transition: none;
}

@media (prefers-reduced-motion: reduce) {
	.tn-row[data-active] .tn-wave path {
		animation: none;
	}
	.tn-preview {
		transition: opacity 0.16s ease;
	}
}
</style>
