<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { ToolCallData } from "../../internals/ai-types.js";

/**
 * Props for ToolCall
 */
export interface ToolCallProps {
	/** The invocation to render: name, status, and whatever payloads exist so far. */
	call: ToolCallData;
	/**
	 * Whether the payloads are expanded. Two-way through `v-model:open` — left
	 * alone until either the reader or a failure decides, see the
	 * open-behaviour contract in the README.
	 */
	open?: boolean;
	/** Called whenever the card opens or closes, by click or on its own. */
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
import { computed, onMounted, ref, useSlots, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { sound as soundFx } from "../../sound/sound.js";
import { formatElapsed } from "../../internals/elapsed.js";

defineOptions({ name: "ToolCall", inheritAttrs: false });

const { call, onToggle, class: className, sound: soundProp = false } = defineProps<ToolCallProps>();

// The counterpart of the source's bindable `open`: writable from inside, kept
// in step with a caller driving it from outside, and free to move on its own
// (via `autoOpen`) when nobody is listening.
const open = defineModel<boolean | undefined>("open", { default: undefined });

const slots = useSlots();

defineSlots<{
	/** Replaces the default request rendering. Receives `call.input`. */
	input?(props: { value: unknown }): unknown;
	/** Replaces the default result rendering. Receives `call.output`. */
	output?(props: { value: unknown }): unknown;
	/** Leading icon, replacing the default wrench. */
	icon?(): unknown;
}>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

/** Spoken alongside the tool name, since the dot's colour says nothing out loud. */
const STATUS_LABELS = {
	pending: "Pending",
	running: "Running",
	done: "Completed",
	error: "Failed",
	cancelled: "Cancelled",
} as const;

/** Shown when a call reports failure without saying why. */
const FALLBACK_ERROR = "The tool call failed.";

const uid = useFancyId();
const headerId = `${uid}-header`;
const bodyId = `${uid}-body`;
const requestId = `${uid}-request`;
const resultId = `${uid}-result`;

// `open` stays undefined until something actually decides: `autoOpen` carries
// the answer in the meantime, so a consumer that never touches the model
// still gets the automatic behaviour and one that binds it still owns the
// value. Seeded from the initial status, because the watcher that opens a
// failed call never fires on the server: a call that already reports failure
// would otherwise be rendered folded and only spring open at hydration.
const autoOpen = ref(call.status === "error");
const userToggled = ref(false);

const isOpen = computed(() => open.value ?? autoOpen.value);
const isError = computed(() => call.status === "error");
const errorText = computed(() => (isError.value ? (call.error ?? FALLBACK_ERROR) : ""));
const duration = computed(() =>
	call.durationMs === undefined ? "" : formatDuration(call.durationMs)
);

// A slot counts as content on its own: a caller who renders the payload
// themselves may well have nothing on `call` for us to look at. Plain
// functions called from the template, never computeds: outside development
// the slots object is not reactive, so a computed over it would freeze these
// at their first value while a parent re-render adds or drops a slot.
function hasRequest(): boolean {
	return slots.input !== undefined || call.input !== undefined;
}
function hasOutput(): boolean {
	return slots.output !== undefined || call.output !== undefined;
}
function hasResult(): boolean {
	return hasOutput() || errorText.value !== "";
}

// `formatPayload` already renders a missing payload as "", which is all the
// old slot-aware guard ever contributed here: the fallback these feed only
// renders when no slot replaced it.
const requestText = computed(() => formatPayload(call.input));
const resultText = computed(() => formatPayload(call.output));

/**
 * The shared formatter floors to the second, which reads as "0s" for anything
 * quicker than that — and a tool call more often than not is. Sub-second work
 * is reported in milliseconds here; everything else defers to the shared
 * formatter, whose contract other callers depend on.
 */
function formatDuration(ms: number): string {
	if (Number.isFinite(ms) && ms >= 0 && ms < 1000) return `${Math.round(ms)}ms`;
	return formatElapsed(ms);
}

/**
 * Objects and arrays get pretty-printed JSON; primitives are rendered bare so
 * a string result reads as prose rather than as a quoted literal.
 *
 * The two things `JSON.stringify` refuses outright — a cycle and a bigint —
 * are what tool payloads are actually made of, and `String()` turns both into
 * `[object Object]`, which tells the reader nothing. So a refusal earns a
 * second attempt through a replacer that names them instead; `String` is left
 * for the payload that defeats even that, such as a `toJSON` that throws.
 */
function formatPayload(value: unknown): string {
	if (value === undefined) return "";
	if (value === null || typeof value !== "object") return String(value);
	try {
		return JSON.stringify(value, null, 2) ?? String(value);
	} catch {
		try {
			// Tracking every object ever seen would call the second of two
			// siblings pointing at one value a cycle, which it is not. Only the
			// chain currently being descended counts. `this` is whatever object
			// owns the key being visited, so popping back to it before the check
			// unwinds the stack on the way out of a branch.
			const ancestors: unknown[] = [];
			const json = JSON.stringify(
				value,
				function (this: unknown, _key, entry: unknown) {
					if (typeof entry === "bigint") return `${entry}n`;
					if (entry !== null && typeof entry === "object") {
						while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
							ancestors.pop();
						}
						if (ancestors.includes(entry)) return "[Circular]";
						ancestors.push(entry);
					}
					return entry;
				},
				2
			);
			return json ?? String(value);
		} catch {
			return String(value);
		}
	}
}

function commit(next: boolean) {
	if ((open.value ?? autoOpen.value) === next) return;
	open.value = next;
	autoOpen.value = next;
	onToggle?.(next);
}

function toggle() {
	// From here on the reader owns the card: a later failure will not pop it
	// open again behind their back.
	userToggled.value = true;
	const next = !isOpen.value;
	// Only this click plays a cue — the error auto-open watcher and the SSR
	// `autoOpen` seed both fold through `commit()` (or bypass it entirely) and
	// must stay silent, so the play sits here rather than in `commit()`.
	if (soundProp) soundFx.play(next ? "open" : "close");
	commit(next);
}

// A failure is the one thing worth reading without being asked, so it expands
// itself — unless the reader has already taken over. `userToggled` is read
// untracked (it is a plain ref read inside the callback, not a watch source)
// so that taking over does not itself re-run this.
function openOnFailure() {
	if (call.status !== "error" || userToggled.value) return;
	commit(true);
}

// The source's `$effect` runs once after mount as well as on every later
// status change, and that first run is load-bearing: a card handed
// `open: false` for a call that already failed is opened by it. `onMounted`
// rather than `immediate: true`, because an immediate watcher would run in
// SSR setup and write `open` / fire `onToggle` on the server — the very thing
// the `autoOpen` seed above exists to avoid.
onMounted(openOnFailure);

watch(() => call.status, openOnFailure, { flush: "post" });
</script>

<template>
	<div
		ref="el"
		:class="cn('ft-toolcall border-border bg-card/50 w-full rounded-lg border text-sm', className)"
		:data-status="call.status"
	>
		<button
			type="button"
			:id="headerId"
			class="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
			:aria-expanded="isOpen"
			:aria-controls="bodyId"
			@click="toggle"
		>
			<span class="ft-toolcall-icon flex-none" aria-hidden="true">
				<slot name="icon">
					<svg
						class="size-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
						/>
					</svg>
				</slot>
			</span>

			<!--
				Filled versus hollow, not just hue: the four states stay apart for anyone
				who cannot tell the colours apart, and the label below says it in words.
			-->
			<span
				class="ft-toolcall-dot flex-none"
				:class="{
					'ft-status-pending': call.status === 'pending',
					'ft-status-running': call.status === 'running',
					'ft-status-done': call.status === 'done',
					'ft-status-error': isError,
					'ft-status-cancelled': call.status === 'cancelled',
				}"
				aria-hidden="true"
			></span>

			<span
				class="ft-toolcall-name text-foreground min-w-0 truncate font-mono text-xs"
				:class="{ 'ft-struck': call.status === 'cancelled' }"
				>{{ call.name }}</span
			>
			<span class="sr-only">{{ STATUS_LABELS[call.status] }}</span>

			<span class="ml-auto flex flex-none items-center gap-2">
				<span v-if="duration" class="text-xs tabular-nums">{{ duration }}</span>
				<svg
					class="ft-toolcall-chevron size-3.5"
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
			</span>
		</button>

		<div class="ft-toolcall-body" :class="{ 'ft-open': isOpen }">
			<div class="overflow-hidden">
				<div
					:id="bodyId"
					role="group"
					:aria-labelledby="headerId"
					v-bind="isOpen ? {} : { inert: true }"
					class="flex flex-col gap-3 px-3 pb-3"
				>
					<section v-if="hasRequest()" :aria-labelledby="requestId">
						<div :id="requestId" class="text-muted-foreground mb-1 text-xs font-medium">
							Request
						</div>
						<slot name="input" :value="call.input">
							<pre class="ft-toolcall-payload">{{ requestText }}</pre>
						</slot>
					</section>

					<section v-if="hasResult()" :aria-labelledby="resultId">
						<div :id="resultId" class="text-muted-foreground mb-1 text-xs font-medium">Result</div>
						<p v-if="errorText" class="ft-toolcall-error-text">{{ errorText }}</p>
						<slot name="output" :value="call.output">
							<pre v-if="hasOutput()" class="ft-toolcall-payload" :class="{ 'mt-2': errorText }">{{
								resultText
							}}</pre>
						</slot>
					</section>

					<p v-if="!hasRequest() && !hasResult()" class="text-muted-foreground text-xs italic">
						Nothing recorded yet.
					</p>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
/*
 * Every status colour is read at the point of use through two hooks: the
 * component's own `--ft-toolcall-*`, then the `--ft-status-*` vocabulary every
 * component in this family shares, then the literal. Setting either anywhere up
 * the tree retints the state without having to win a specificity fight against
 * these scoped rules — the shared one recolours the whole family at once.
 */
.ft-toolcall-dot {
	position: relative;
	display: inline-block;
	width: 0.5rem;
	height: 0.5rem;
	border-radius: 9999px;
}

/* Hollow: nothing has happened yet, or nothing ever will. The two share a hue
   and stay apart on the ring's weight, plus the struck-through name below. */
.ft-toolcall-dot.ft-status-pending {
	box-shadow: inset 0 0 0 1.5px
		var(
			--ft-toolcall-pending,
			color-mix(
				in oklab,
				var(--ft-status-pending, light-dark(oklch(0.5 0.02 260), oklch(0.72 0.02 260))) 55%,
				transparent
			)
		);
}

.ft-toolcall-dot.ft-status-cancelled {
	box-shadow: inset 0 0 0 1.5px
		var(
			--ft-toolcall-cancelled,
			color-mix(
				in oklab,
				var(--ft-status-cancelled, light-dark(oklch(0.5 0.02 260), oklch(0.72 0.02 260))) 40%,
				transparent
			)
		);
}

.ft-toolcall-dot.ft-status-running {
	background: var(
		--ft-toolcall-running,
		var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
	);
}

.ft-toolcall-dot.ft-status-done {
	background: var(
		--ft-toolcall-done,
		var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
	);
}

.ft-toolcall-dot.ft-status-error {
	background: var(
		--ft-toolcall-error,
		var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
	);
}

.ft-toolcall-name.ft-struck {
	text-decoration: line-through;
	opacity: 0.7;
}

.ft-toolcall-error-text {
	color: var(
		--ft-toolcall-error,
		var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
	);
	font-size: 0.75rem;
	line-height: 1.5;
}

.ft-toolcall-payload {
	max-height: var(--ft-toolcall-max-height, 16rem);
	overflow-y: auto;
	border-radius: 0.375rem;
	background: var(--ft-toolcall-payload-bg, color-mix(in oklab, currentColor 6%, transparent));
	padding: 0.5rem 0.625rem;
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	font-size: 0.75rem;
	line-height: 1.5;
	/* Wrapping rather than scrolling sideways: a long URL in a payload should
	   not put the whole card on a horizontal rail. */
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

/*
 * 0fr → 1fr on a one-row grid is the only way to transition "auto" height
 * without measuring anything. The inner wrapper does the clipping.
 */
.ft-toolcall-body {
	display: grid;
	grid-template-rows: 0fr;
}

.ft-toolcall-body.ft-open {
	grid-template-rows: 1fr;
}

.ft-toolcall-chevron.ft-open {
	transform: rotate(90deg);
}

/*
 * Everything that moves lives behind the query, so reduced motion gets the
 * same states with nothing to shorten or fall back from — a running call is
 * still a filled accent dot, it just stops breathing.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-toolcall-body {
		transition: grid-template-rows 260ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.ft-toolcall-chevron {
		transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.ft-toolcall-dot.ft-status-running::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: inherit;
		animation: ft-toolcall-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
}

@keyframes ft-toolcall-ping {
	from {
		opacity: 0.55;
		transform: scale(1);
	}
	to {
		opacity: 0;
		transform: scale(2.4);
	}
}
</style>
