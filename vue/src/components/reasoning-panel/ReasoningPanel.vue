<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for ReasoningPanel
 */
export interface ReasoningPanelProps {
	/** The reasoning trace so far. Hand over a longer string to stream more in. */
	text: string;
	/** Whether the trace is still growing. Drives the timer, the shimmer, and autoscroll. */
	streaming?: boolean;
	/**
	 * Whether the trace is expanded. Two-way through `v-model:open`, and left
	 * alone until either the component or the reader changes it — see the
	 * open-behaviour contract in the README.
	 */
	open?: boolean;
	/** Header text. */
	label?: string;
	/** Epoch ms the current burst started at. Pins the live timer's origin. */
	since?: number;
	/** Final duration for the summary line. Falls back to what the timer measured. */
	durationMs?: number;
	/** Scroll height of the trace once expanded. */
	maxHeight?: string;
	/** Called whenever the panel opens or closes, by click or on its own. */
	onToggle?: (open: boolean) => void;
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
import { sound as soundFx } from "../../sound/sound.js";
import StreamText from "../../internals/StreamText.vue";
import { useAutoscroll } from "../../internals/use-autoscroll.js";
import { useFancyId } from "../../internals/use-id.js";
import { createElapsed, formatElapsed } from "../../internals/elapsed.js";

defineOptions({ name: "ReasoningPanel", inheritAttrs: false });

const {
	text,
	streaming = false,
	label = "Reasoning",
	since,
	durationMs,
	maxHeight = "12rem",
	onToggle,
	class: className,
	sound: soundProp = false,
} = defineProps<ReasoningPanelProps>();

/** How long a finished trace stays on screen before folding itself away. */
const AUTO_COLLAPSE_MS = 600;

// The counterpart of the source's bindable `open`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// (via `autoOpen`) when nobody is listening.
const open = defineModel<boolean | undefined>("open", { default: undefined });

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

const uid = useFancyId();
const headerId = `${uid}-header`;
const bodyId = `${uid}-body`;

// `open` stays undefined until something actually decides: `autoOpen` carries
// the answer in the meantime, so a consumer that never touches the model
// still gets the automatic behaviour and one that binds it still owns the
// value.
const autoOpen = ref(false);
const userToggled = ref(false);
const measuredMs = ref(0);
// Plain locals: neither should wake a watcher that writes them.
let wasStreaming = false;
let collapseTimer: ReturnType<typeof setTimeout> | undefined;
// The last value `onToggle` was told about. `commit` keeps it in step with
// its own calls, so the watcher below only speaks up for changes that never
// went through it — a consumer writing straight to the bound model.
const lastNotifiedOpen = ref(open.value ?? autoOpen.value);

const elapsed = createElapsed();

const isOpen = computed(() => open.value ?? autoOpen.value);
const duration = computed(() => durationMs ?? measuredMs.value);
const summary = computed(() =>
	streaming
		? formatElapsed(elapsed.ms)
		: duration.value > 0
			? `Thought for ${formatElapsed(duration.value)}`
			: ""
);

function clearCollapseTimer() {
	if (collapseTimer !== undefined) {
		clearTimeout(collapseTimer);
		collapseTimer = undefined;
	}
}

function commit(next: boolean) {
	if ((open.value ?? autoOpen.value) === next) return;
	open.value = next;
	autoOpen.value = next;
	lastNotifiedOpen.value = next;
	onToggle?.(next);
}

function toggle() {
	// From here on the reader owns the panel: no more opening or closing on
	// its own behind their back.
	userToggled.value = true;
	clearCollapseTimer();
	const next = !isOpen.value;
	// Only this click plays a cue — the streaming auto-open and the 600ms
	// auto-collapse both fold through `commit()` and must stay silent, so the
	// play sits here rather than in `commit()` or the watcher that mirrors it.
	if (soundProp) soundFx.play(next ? "open" : "close");
	commit(next);
}

// Open on the first chunk, fold away a beat after the last one — until the
// reader takes over. Runs once on mount (client-only, mirroring the source
// effect's initial pass) and again whenever `streaming` changes.
function syncStreaming(active: boolean) {
	clearCollapseTimer();
	if (active) {
		wasStreaming = true;
		if (!userToggled.value) commit(true);
		return;
	}
	if (!wasStreaming) return;
	wasStreaming = false;
	if (userToggled.value) return;
	collapseTimer = setTimeout(() => {
		collapseTimer = undefined;
		commit(false);
	}, AUTO_COLLAPSE_MS);
}

// The source's `$effect` runs once after mount as well as on every later
// `streaming` change, and that first run is load-bearing: a panel mounted
// mid-burst is opened by it. `onMounted` rather than `immediate: true`,
// because an immediate watcher also runs in SSR setup, and the server must
// neither write `open` nor call `onToggle`. The server therefore paints the
// collapsed state the source paints — its effects do not run either — and the
// client opens the panel on the tick after mount.
onMounted(() => syncStreaming(streaming));
watch(
	() => streaming,
	(active) => syncStreaming(active),
	{ flush: "post" }
);
onBeforeUnmount(clearCollapseTimer);

// A consumer that writes straight to the bound `open` model moves the panel
// without going through `commit`, so nothing above reports it. The README
// promises every change is announced, whichever side caused it.
watch(
	isOpen,
	(next) => {
		if (next === lastNotifiedOpen.value) return;
		lastNotifiedOpen.value = next;
		onToggle?.(next);
	},
	{ flush: "post" }
);

// The timer only exists while the trace grows; its last reading survives as
// the summary duration. Runs once on mount and again whenever `streaming` or
// `since` changes, mirroring the source effect's dependency set.
function syncElapsed(active: boolean, sinceVal: number | undefined) {
	if (!active) return;
	elapsed.start(sinceVal ?? Date.now());
}

function stopElapsed() {
	if (!elapsed.running) return;
	measuredMs.value = elapsed.ms;
	elapsed.stop();
}

onMounted(() => syncElapsed(streaming, since));
watch(
	[() => streaming, () => since],
	([active, sinceVal]) => {
		stopElapsed();
		syncElapsed(active, sinceVal);
	},
	{ flush: "post" }
);
onBeforeUnmount(stopElapsed);

const body = useTemplateRef<HTMLDivElement>("body");
useAutoscroll(body, () => ({ enabled: streaming && isOpen.value, pinOnConnect: true }));
</script>

<template>
	<div
		ref="el"
		:class="cn('border-border bg-card/50 w-full rounded-lg border text-sm', className)"
	>
		<button
			type="button"
			:id="headerId"
			class="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
			:aria-expanded="isOpen"
			:aria-controls="bodyId"
			@click="toggle"
		>
			<svg
				class="ft-chevron size-3.5 shrink-0"
				:class="{ 'ft-open': isOpen }"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="m9 6 6 6-6 6" />
			</svg>
			<span class="text-foreground font-medium" :class="{ 'ft-shimmer': streaming }">{{
				label
			}}</span>
			<span v-if="summary" class="ml-auto text-xs tabular-nums">{{ summary }}</span>
		</button>

		<div class="ft-body" :class="{ 'ft-open': isOpen }">
			<div class="overflow-hidden">
				<div
					ref="body"
					:id="bodyId"
					role="group"
					:aria-labelledby="headerId"
					v-bind="isOpen ? {} : { inert: true }"
					class="text-muted-foreground overflow-y-auto px-3 pb-3 leading-relaxed"
					:style="{ maxHeight }"
				>
					<StreamText :text="text" />
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
/*
 * 0fr → 1fr on a one-row grid is the only way to transition "auto" height
 * without measuring anything. The inner wrapper does the clipping.
 */
.ft-body {
	display: grid;
	grid-template-rows: 0fr;
}

.ft-body.ft-open {
	grid-template-rows: 1fr;
}

.ft-chevron.ft-open {
	transform: rotate(90deg);
}

/*
 * Everything that moves lives behind the query, so reduced motion gets the
 * same three states with nothing to shorten or fall back from.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-body {
		transition: grid-template-rows 260ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.ft-chevron {
		transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.ft-shimmer {
		background-image: linear-gradient(
			100deg,
			currentColor 40%,
			var(--ft-reasoning-shimmer, color-mix(in oklab, currentColor 35%, transparent)) 50%,
			currentColor 60%
		);
		background-size: 250% 100%;
		background-clip: text;
		/* Keep `color` intact: the gradient stops resolve currentColor at this
		   element, so `color: transparent` would blank every stop. Only the glyph
		   fill goes transparent; the clipped gradient supplies the visible text. */
		-webkit-text-fill-color: transparent;
		animation: ft-reasoning-shimmer 1.9s linear infinite;
	}

	@keyframes ft-reasoning-shimmer {
		from {
			background-position: 150% 0;
		}
		to {
			background-position: -50% 0;
		}
	}
}
</style>
