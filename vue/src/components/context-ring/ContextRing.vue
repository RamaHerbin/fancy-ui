<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { TokenUsageData } from "../../internals/ai-types.js";

/**
 * Props for ContextRing
 */
export interface ContextRingProps {
	/** Context-window consumption: how many tokens are used, out of how many, and of what. */
	usage: TokenUsageData;
	/** Outer diameter of the ring, in pixels. */
	size?: number;
	/** Thickness of both the track and the arc, in pixels. */
	strokeWidth?: number;
	/** Whether the compact "12.4k / 200k" figure is shown beside the ring. */
	showLabel?: boolean;
	/** Fraction at which the ring leaves the quiet band, 0–1. */
	warnAt?: number;
	/** Fraction at which the ring turns to the error colour, 0–1. */
	criticalAt?: number;
	/** Accessible name for the meter — what this ring is measuring. */
	label?: string;
	/** Whether clicking the ring opens a popover listing `usage.breakdown`. */
	expandable?: boolean;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useFloat } from "../../internals/use-float.js";
import { useFancyId } from "../../internals/use-id.js";
import { sound as soundFx } from "../../sound/sound.js";

defineOptions({ name: "ContextRing", inheritAttrs: false });

const {
	usage,
	size = 28,
	strokeWidth = 3,
	showLabel = true,
	warnAt = 0.75,
	criticalAt = 0.9,
	label = "Context usage",
	expandable = false,
	class: className,
	sound: soundProp = false,
} = defineProps<ContextRingProps>();

/** Shown in the popover when a caller asked for one but sent no rows. */
const NO_BREAKDOWN = "No breakdown reported.";

const uid = useFancyId();
const panelId = `${uid}-breakdown`;

// -----------------------------------------------------------------------------
// Numbers
// -----------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(value, max));
}

/** A fraction prop that arrived as nonsense falls back rather than poisoning the bands. */
function fractionProp(value: number, fallback: number): number {
	return Number.isFinite(value) ? clamp(value, 0, 1) : fallback;
}

/**
 * The ring's own tiny formatter, deliberately not `Intl.NumberFormat`'s compact
 * notation: that rounds 12,400 to "12K" and drops the digit the reader is
 * actually watching. Below a thousand the count is exact, below a hundred
 * thousand it keeps one decimal, and above that the decimal is noise on a
 * figure nobody reads that precisely. A whole number never carries a hanging
 * ".0" — "1k", not "1.0k".
 */
function compact(value: number): string {
	if (!Number.isFinite(value)) return "0";
	const n = Math.max(0, Math.round(value));
	if (n < 1000) return String(n);
	if (n < 100_000) {
		const fixed = (n / 1000).toFixed(1);
		return `${fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed}k`;
	}
	return `${Math.round(n / 1000)}k`;
}

/** The spoken figure is grouped in full, because "12.4k" is a glance, not a reading. */
function grouped(value: number): string {
	return Math.max(0, Math.round(Number.isFinite(value) ? value : 0)).toLocaleString("en-US");
}

const used = computed(() => (Number.isFinite(usage.used) ? Math.max(0, usage.used) : 0));
// A budget of zero — or of nothing at all — is an empty ring, not a division.
const max = computed(() => (Number.isFinite(usage.max) && usage.max > 0 ? usage.max : 0));
const fraction = computed(() => (max.value > 0 ? Math.min(1, used.value / max.value) : 0));

// `criticalAt` is floored at `warnAt` so a caller who swaps the two gets a ring
// that still escalates in one direction instead of one band that can never win.
const warn = computed(() => fractionProp(warnAt, 0.75));
const critical = computed(() => Math.max(warn.value, fractionProp(criticalAt, 0.9)));
const band = computed(() =>
	fraction.value >= critical.value ? "critical" : fraction.value >= warn.value ? "warn" : "ok"
);

const labelText = computed(() => `${compact(used.value)} / ${compact(max.value)}`);
// Over budget pins the meter at its maximum, which is what `aria-valuenow` is
// allowed to say; the text beside it still reports the real figure.
const valueNow = computed(() => Math.round(Math.min(used.value, max.value)));
const valueMax = computed(() => Math.round(max.value));
const valueText = computed(() => `${grouped(used.value)} of ${grouped(max.value)} tokens`);

const rows = computed(() => usage.breakdown ?? []);

// -----------------------------------------------------------------------------
// Geometry
// -----------------------------------------------------------------------------

const px = computed(() => (Number.isFinite(size) ? Math.max(8, size) : 28));
// The stroke is centred on the radius, so it cannot be wider than the ring has
// room for — past that the arc eats its own centre and the shape stops reading.
const stroke = computed(() =>
	clamp(Number.isFinite(strokeWidth) ? strokeWidth : 3, 0.5, Math.max(0.5, px.value / 2 - 0.5))
);
const centre = computed(() => px.value / 2);
const radius = computed(() => Math.max(0.5, (px.value - stroke.value) / 2));
const circumference = computed(() => 2 * Math.PI * radius.value);

// The ring is painted empty and its target written a frame later, so the sweep
// runs from a value the browser has already put on screen. Everything the meter
// *means* — its value, its text, its band — is derived above and needs no mount,
// so a server render is exact and only the entrance waits for the client.
const filled = ref(false);
const sweep = computed(() => (filled.value ? fraction.value : 0));
const dashOffset = computed(() => circumference.value * (1 - sweep.value));

onMounted(() => {
	// Reduced motion wants the settled arc, not a fast one: write it in the same
	// breath so there is never a frame of empty ring to notice.
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		filled.value = true;
		return;
	}

	// `onMounted` still runs inside the frame that mounted the ring, so setting
	// the target here would land in the same paint as the empty arc and the
	// browser would have nothing to transition between. Two frames out is the
	// guarantee: the first callback can still belong to the mounting frame, the
	// second cannot, so the empty ring is on screen before the target is written.
	let second = 0;
	const first = requestAnimationFrame(() => {
		second = requestAnimationFrame(() => {
			filled.value = true;
		});
	});

	onBeforeUnmount(() => {
		cancelAnimationFrame(first);
		cancelAnimationFrame(second);
	});
});

// -----------------------------------------------------------------------------
// Breakdown popover
// -----------------------------------------------------------------------------

const open = ref(false);
const trigger = useTemplateRef<HTMLButtonElement>("trigger");
const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// One place every dismissal funnels through, so the toggle, Escape and an
// outside pointerdown all give exactly one `close` cue rather than each
// wiring its own.
function close() {
	if (!open.value) return;
	open.value = false;
	if (soundProp) soundFx.play("close");
}

function toggle() {
	if (!open.value) {
		open.value = true;
		if (soundProp) soundFx.play("open");
		return;
	}
	close();
}

// Taking expandability away takes the panel with it. Left open, it would keep
// its window listeners with no trigger on screen, and turning expandability
// back on would reopen a panel nobody asked to see again.
//
// Deliberately NOT `immediate: true`: an immediate watcher also runs inside
// `setup`, on the server, where writing component state is a hydration hazard.
// Nothing is lost by skipping the first pass — the panel starts closed, so the
// Svelte `$effect`'s own mount run is a no-op on exactly the same state.
watch(
	() => expandable,
	(isExpandable) => {
		if (!isExpandable) open.value = false;
	},
	{ flush: "post" }
);

// Escape and a click elsewhere both dismiss. Bound to the window rather than to
// the panel so they work whether or not anything inside it holds focus; the
// listeners exist only while the panel does.
watch(
	open,
	(isOpen, _prev, onCleanup) => {
		if (!isOpen) return;

		const onKeydown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			close();
			// Focus goes back to what opened the panel, not to the top of the page.
			trigger.value?.focus();
		};
		const onPointerDown = (event: Event) => {
			const target = event.target as Node | null;
			if (target && el.value?.contains(target)) return;
			close();
		};

		window.addEventListener("keydown", onKeydown);
		window.addEventListener("pointerdown", onPointerDown, true);
		onCleanup(() => {
			window.removeEventListener("keydown", onKeydown);
			window.removeEventListener("pointerdown", onPointerDown, true);
		});
	},
	{ flush: "post" }
);

// Rendered only while it is on screen: a breakdown that lives in the DOM
// permanently is a hidden list every screen-reader element list has to step
// over. The anchor is read through a getter so `useFloat` re-measures the
// trigger on every scroll and resize tick rather than holding a stale rect.
const panel = useTemplateRef<HTMLDivElement>("panel");
useFloat(panel, () => ({
	anchor: () => trigger.value?.getBoundingClientRect() ?? null,
	placement: "bottom-end",
	offset: 8,
}));
</script>

<template>
	<div ref="el" :class="cn('ft-ctxring inline-flex items-center gap-2', className)" :data-band="band">
		<!--
			An explicit `aria-label`, because a button flattens everything inside it to
			presentational: the `role="meter"` and its value below never reach
			assistive tech once they are nested here. The button's own name carries
			both the meter's name and its current reading instead.
		-->
		<button
			v-if="expandable"
			ref="trigger"
			type="button"
			class="ft-ctxring-trigger hover:bg-foreground/5 focus-visible:ring-ring -mx-1 -my-0.5 inline-flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
			:aria-expanded="open"
			:aria-controls="panelId"
			:aria-label="`${label}, ${valueText}`"
			@click="toggle"
		>
			<!--
				One `meter` for the pair: the arc says nothing out loud and the compact
				figure is a glance rather than a reading, so assistive tech is given the
				full count once through `aria-valuetext` and both halves are hidden
				behind it.
			-->
			<span
				class="ft-ctxring-meter inline-flex flex-none"
				role="meter"
				:aria-label="label"
				:aria-valuenow="valueNow"
				aria-valuemin="0"
				:aria-valuemax="valueMax"
				:aria-valuetext="valueText"
			>
				<svg
					class="ft-ctxring-ring"
					:viewBox="`0 0 ${px} ${px}`"
					:style="{ width: `${px}px`, height: `${px}px` }"
					aria-hidden="true"
				>
					<circle
						class="ft-ctxring-track"
						:cx="centre"
						:cy="centre"
						:r="radius"
						fill="none"
						:stroke-width="stroke"
					/>
					<circle
						class="ft-ctxring-value"
						:class="{
							'ft-status-pending': band === 'ok',
							'ft-status-running': band === 'warn',
							'ft-status-error': band === 'critical',
						}"
						:cx="centre"
						:cy="centre"
						:r="radius"
						fill="none"
						:stroke-width="stroke"
						stroke-linecap="round"
						:stroke-dasharray="circumference"
						:stroke-dashoffset="dashOffset"
						:transform="`rotate(-90 ${centre} ${centre})`"
					/>
				</svg>
			</span>

			<span
				v-if="showLabel"
				class="ft-ctxring-label text-foreground/70 text-xs tabular-nums"
				aria-hidden="true"
			>
				{{ labelText }}
			</span>
		</button>

		<template v-else>
			<span
				class="ft-ctxring-meter inline-flex flex-none"
				role="meter"
				:aria-label="label"
				:aria-valuenow="valueNow"
				aria-valuemin="0"
				:aria-valuemax="valueMax"
				:aria-valuetext="valueText"
			>
				<svg
					class="ft-ctxring-ring"
					:viewBox="`0 0 ${px} ${px}`"
					:style="{ width: `${px}px`, height: `${px}px` }"
					aria-hidden="true"
				>
					<circle
						class="ft-ctxring-track"
						:cx="centre"
						:cy="centre"
						:r="radius"
						fill="none"
						:stroke-width="stroke"
					/>
					<circle
						class="ft-ctxring-value"
						:class="{
							'ft-status-pending': band === 'ok',
							'ft-status-running': band === 'warn',
							'ft-status-error': band === 'critical',
						}"
						:cx="centre"
						:cy="centre"
						:r="radius"
						fill="none"
						:stroke-width="stroke"
						stroke-linecap="round"
						:stroke-dasharray="circumference"
						:stroke-dashoffset="dashOffset"
						:transform="`rotate(-90 ${centre} ${centre})`"
					/>
				</svg>
			</span>

			<span
				v-if="showLabel"
				class="ft-ctxring-label text-foreground/70 text-xs tabular-nums"
				aria-hidden="true"
			>
				{{ labelText }}
			</span>
		</template>

		<!--
			Rendered only while it is on screen: a breakdown that lives in the DOM
			permanently is a hidden list every screen-reader element list has to
			step over.
		-->
		<div
			v-if="expandable && open"
			ref="panel"
			:id="panelId"
			role="group"
			:aria-label="`${label} breakdown`"
			class="ft-ctxring-panel z-50 rounded-lg border p-2 text-left text-xs shadow-lg"
		>
			<ul v-if="rows.length > 0" class="flex flex-col gap-1">
				<!--
					Keyed on the label *and* the index: a model happily reports two rows
					called "System prompt", and a key that is only the label would make
					the second one replace the first.
				-->
				<li
					v-for="(row, i) in rows"
					:key="`${row.label}#${i}`"
					class="ft-ctxring-row flex items-baseline justify-between gap-4"
				>
					<!-- The single space between the two spans is written out: the source
					     markup leaves whitespace there and the row's spoken/copied text
					     depends on it, but Vue drops a newline-only gap between two
					     elements. Written inline, with no whitespace of its own on either
					     side, so the row reads with exactly one space like the source. -->
					<span class="min-w-0 truncate">{{ row.label }}</span
					>{{ " " }}<span class="ft-ctxring-row-value flex-none tabular-nums">{{
						compact(row.tokens)
					}}</span>
				</li>
			</ul>
			<p v-else class="ft-ctxring-empty italic">{{ NO_BREAKDOWN }}</p>
		</div>
	</div>
</template>

<style scoped>
/*
 * Every colour is read at the point of use through two hooks: this ring's own
 * `--ft-ctxring-*`, then the `--ft-status-*` vocabulary the whole AI family
 * shares, then the literal. Setting either anywhere up the tree retints the
 * ring without having to win a specificity fight against these scoped rules,
 * and the shared one recolours every sibling component at once.
 */
.ft-ctxring-track {
	stroke: var(--ft-ctxring-track, color-mix(in oklab, currentColor 15%, transparent));
}

/*
 * The band is carried by the arc's length as much as by its hue — a quarter
 * ring and a nearly closed one are told apart without seeing colour at all,
 * and the figure beside it says the count in words either way.
 */
.ft-ctxring-value.ft-status-pending {
	stroke: var(
		--ft-ctxring-ok,
		var(--ft-status-pending, light-dark(oklch(0.5 0.02 260), oklch(0.72 0.02 260)))
	);
}

.ft-ctxring-value.ft-status-running {
	stroke: var(
		--ft-ctxring-warn,
		var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
	);
}

.ft-ctxring-value.ft-status-error {
	stroke: var(
		--ft-ctxring-critical,
		var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
	);
}

.ft-ctxring-panel {
	width: var(--ft-ctxring-panel-width, 14rem);
	max-width: calc(100vw - 1rem);
	background: var(--ft-ctxring-panel-bg, var(--color-popover, canvas));
	border-color: var(--ft-ctxring-panel-border, var(--color-border, currentColor));
	color: var(--ft-ctxring-panel-fg, var(--color-popover-foreground, canvastext));
}

.ft-ctxring-row-value {
	color: var(--ft-ctxring-row-value, color-mix(in oklab, currentColor 70%, transparent));
}

.ft-ctxring-empty {
	color: var(--ft-ctxring-row-value, color-mix(in oklab, currentColor 70%, transparent));
}

/*
 * Everything that moves lives behind the query, so reduced motion is not a
 * degraded variant to keep in sync: the arc is drawn at its final length, the
 * band change is instant, and the panel simply appears, already placed.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-ctxring-value {
		transition:
			stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1),
			stroke 300ms linear;
	}

	.ft-ctxring-panel {
		animation: ft-ctxring-in 140ms cubic-bezier(0.4, 0, 0.2, 1);
	}
}

@keyframes ft-ctxring-in {
	from {
		opacity: 0;
		transform: translateY(-3px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}
</style>
