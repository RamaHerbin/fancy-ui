<script lang="ts">
import type { HTMLAttributes } from "vue";

/** Where a proposal stands: still on the table, taken up, or waved off. */
export type RecommendationState = "open" | "accepted" | "dismissed";

/**
 * Props for RecommendationCard
 */
export interface RecommendationCardProps {
	/** What the agent is proposing, e.g. "Add an index on orders.customer_id". */
	title: string;
	/** Secondary muted line under the title — the reasoning, the expected effect. */
	description?: string;
	/**
	 * How sure the agent is, from 0 to 1. Omitted, the whole confidence block
	 * disappears rather than reading as zero. Out-of-range numbers are clamped.
	 */
	confidence?: number;
	/** Label for the confirm button. */
	acceptLabel?: string;
	/** Label for the decline button. */
	dismissLabel?: string;
	/** Called when the recommendation is accepted, after `state` has been written. */
	onAccept?: () => void;
	/** Called when the recommendation is dismissed, after `state` has been written. */
	onDismiss?: () => void;
	/** Where the recommendation stands. Bindable, so the answer is readable from outside. */
	state?: RecommendationState;
	/** Small kicker above the title, e.g. "Suggestion". */
	badge?: string;
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { NumberTicker } from "../number-ticker/index.js";

defineOptions({ name: "RecommendationCard", inheritAttrs: false });

const {
	title,
	description,
	confidence,
	acceptLabel = "Apply",
	dismissLabel = "Dismiss",
	onAccept,
	onDismiss,
	badge,
	class: className,
	sound = false,
} = defineProps<RecommendationCardProps>();

// The model keeps the Svelte source's local name: `current` reads as "where the
// proposal stands right now" everywhere below, and the prop is still `state`
// from outside.
const current = defineModel<RecommendationState>("state", { default: "open" });

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

defineSlots<{ default?(): unknown }>();

const playCue = useSoundCue(() => sound);

/** Shown and spoken once the proposal is behind us. */
const RESOLVED_LABELS = {
	accepted: "Applied",
	dismissed: "Dismissed",
} as const;

/** How long the percentage takes to count up, before the reduced-motion clamp. */
const TICKER_MS = 900;

/** Ring geometry. The radius picks the circumference the dash array runs on. */
const RING_R = 13;
const RING_C = 2 * Math.PI * RING_R;

const isOpen = computed(() => current.value === "open");
const isAccepted = computed(() => current.value === "accepted");
const resolvedLabel = computed(() =>
	isAccepted.value ? RESOLVED_LABELS.accepted : RESOLVED_LABELS.dismissed
);

// A missing confidence is not a confidence of zero: the block only exists for
// a real number, so `NaN` and `Infinity` are treated as "not reported".
const hasConfidence = computed(
	() => typeof confidence === "number" && Number.isFinite(confidence)
);
const fraction = computed(() =>
	hasConfidence.value ? Math.min(1, Math.max(0, confidence as number)) : 0
);
const percent = computed(() => Math.round(fraction.value * 100));

/** Three bands, borrowing the run-status vocabulary the AI family already shares. */
const band = computed(() =>
	fraction.value >= 0.75 ? "done" : fraction.value >= 0.5 ? "running" : "pending"
);

const filled = ref(false);
const reduced = ref(false);

/** Where focus lands once the buttons it might have held are gone. */
const resolvedRef = useTemplateRef<HTMLParagraphElement>("resolvedRef");

// The ring starts empty and fills once the target is written, so its sweep runs
// from a known origin — a transition never animates from a value the browser
// has not painted yet.
const sweep = computed(() => (filled.value ? fraction.value : 0));
const ringOffset = computed(() => RING_C * (1 - sweep.value));

// The counter is JS-driven, so reduced motion is honoured by collapsing its
// duration rather than by a media query: it lands on the number immediately.
const tickerMs = computed(() => Math.max(0.01, reduced.value ? 0 : TICKER_MS));

onMounted(() => {
	reduced.value = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	// Reduced motion wants the settled arc, not a fast one: write it in the same
	// breath so there is never a frame of empty ring to notice.
	if (reduced.value) {
		filled.value = true;
		return;
	}

	// `onMounted` still runs inside the frame that mounted the card, so setting the
	// target here would land in the same paint as the empty ring and the browser
	// would have nothing to transition between. Two frames out is the guarantee:
	// the first callback can still belong to the mounting frame, the second
	// cannot, so the empty ring is on screen before the target is written.
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

/**
 * Closed for the rest of the tick by an answer that has been given.
 *
 * `defineModel` writes its own copy only while the consumer is not driving the
 * model: hand the card both `state` and `@update:state` and the setter merely
 * emits, so the guard below would still read `"open"` back for the rest of the
 * tick and let a second decision dispatched in that window through. Svelte
 * `$bindable` writes through immediately and refuses it, and this stands in for
 * that write. It is released on the tick the write would have been visible on,
 * so a consumer that declines the answer — never sending the value back — is
 * left with a live proposal rather than a dead one.
 */
let settled = false;

/**
 * The answer is written to `state` before the callback fires, so a consumer
 * reading the bound value from inside its own handler already sees it.
 * Re-entry is refused rather than re-announced: a proposal resolves once.
 */
function decide(next: "accepted" | "dismissed") {
	if (settled || current.value !== "open") return;
	settled = true;
	current.value = next;
	// The deliberate asymmetry with the approval gate: accepting is a commit
	// (`select`), dismissing is a close (`close`), never `error` either way.
	playCue(next === "accepted" ? "select" : "close");
	if (next === "accepted") onAccept?.();
	else onDismiss?.();
	// The button just pressed is about to leave the DOM along with the rest of
	// the action group, so focus is moved to the verdict once it has painted —
	// otherwise the browser drops it back to the document body.
	nextTick().then(() => {
		settled = false;
		resolvedRef.value?.focus();
	});
}
</script>

<template>
	<div
		ref="el"
		:class="
			cn(
				'ft-rec border-border w-full rounded-lg border p-4 text-sm',
				isOpen && 'bg-card/50',
				className
			)
		"
		role="group"
		:aria-label="title"
		:data-state="current"
	>
		<div class="flex items-start gap-3">
			<div class="min-w-0 flex-1">
				<p
					v-if="badge"
					class="ft-rec-badge text-muted-foreground mb-1 text-[0.6875rem] font-medium uppercase"
				>
					{{ badge }}
				</p>
				<p class="ft-rec-title text-foreground font-medium">{{ title }}</p>
				<p
					v-if="description"
					class="ft-rec-description text-muted-foreground mt-0.5 text-xs leading-relaxed"
				>
					{{ description }}
				</p>
			</div>

			<!--
				One label for the pair: the counter is mid-animation for most of its
				life and the ring says nothing out loud, so assistive tech is given the
				settled figure once and both halves are hidden behind it.
			-->
			<div
				v-if="hasConfidence"
				class="ft-rec-confidence flex flex-none items-center gap-2"
				role="img"
				:aria-label="`Confidence ${percent}%`"
				:data-band="band"
			>
				<span
					class="ft-rec-percent text-foreground text-xs font-medium tabular-nums"
					aria-hidden="true"
				>
					<NumberTicker
						:value="percent"
						:duration="tickerMs"
						class="text-inherit dark:text-inherit"
					/>%
				</span>

				<svg class="ft-rec-ring" viewBox="0 0 32 32" aria-hidden="true">
					<circle
						class="ft-rec-ring-track"
						cx="16"
						cy="16"
						:r="RING_R"
						fill="none"
						stroke-width="3"
					/>
					<circle
						class="ft-rec-ring-value"
						:class="{
							'ft-status-done': band === 'done',
							'ft-status-running': band === 'running',
							'ft-status-pending': band === 'pending',
						}"
						cx="16"
						cy="16"
						:r="RING_R"
						fill="none"
						stroke-width="3"
						stroke-linecap="round"
						:stroke-dasharray="RING_C"
						:stroke-dashoffset="ringOffset"
						transform="rotate(-90 16 16)"
					/>
				</svg>
			</div>
		</div>

		<div v-if="$slots.default" class="ft-rec-detail mt-3 min-w-0">
			<slot />
		</div>

		<!--
			One footer element, mounted from the first render, so the live region exists
			before the outcome lands in it — a region that appears at the same moment as
			its own text is routinely missed by screen readers.
		-->
		<div class="ft-rec-foot mt-3" aria-live="polite">
			<div v-if="isOpen" class="ft-rec-actions flex flex-wrap items-center justify-end gap-2">
				<button
					type="button"
					class="ft-rec-dismiss text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
					@click="decide('dismissed')"
				>
					{{ dismissLabel }}
				</button>
				<button
					type="button"
					class="ft-rec-accept bg-foreground text-background hover:bg-foreground/90 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
					@click="decide('accepted')"
				>
					{{ acceptLabel }}
				</button>
			</div>
			<p
				v-else
				ref="resolvedRef"
				tabindex="-1"
				class="ft-rec-resolved focus-visible:ring-ring flex items-center gap-1.5 rounded-md text-xs font-medium focus-visible:ring-1 focus-visible:outline-none"
				:class="{ 'ft-accepted': isAccepted }"
			>
				<span class="flex-none" aria-hidden="true">
					<svg
						class="size-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path v-if="isAccepted" d="m20 6-11 11-5-5" />
						<template v-else>
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						</template>
					</svg>
				</span>
				{{ resolvedLabel }}
			</p>
		</div>
	</div>
</template>

<style scoped>
	/*
	 * Every colour is read at the point of use through two hooks: this card's own
	 * `--ft-rec-*`, then the `--ft-status-*` vocabulary the whole AI family shares,
	 * then the literal. Setting either anywhere up the tree retints the card
	 * without having to win a specificity fight against these scoped rules, and
	 * the shared one recolours every sibling component at once.
	 */
	.ft-rec-badge {
		letter-spacing: 0.08em;
	}

	.ft-rec-ring {
		width: var(--ft-rec-ring-size, 1.75rem);
		height: var(--ft-rec-ring-size, 1.75rem);
	}

	.ft-rec-ring-track {
		stroke: var(--ft-rec-track, color-mix(in oklab, currentColor 15%, transparent));
	}

	/*
	 * The band is carried by the arc's length as much as by its hue — a quarter
	 * ring and a full ring are told apart without seeing colour at all, and the
	 * figure beside it says the number in words either way.
	 */
	.ft-rec-ring-value.ft-status-done {
		stroke: var(
			--ft-rec-high,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}

	.ft-rec-ring-value.ft-status-running {
		stroke: var(
			--ft-rec-medium,
			var(--ft-status-running, light-dark(oklch(0.5 0.18 265), oklch(0.72 0.15 265)))
		);
	}

	.ft-rec-ring-value.ft-status-pending {
		stroke: var(
			--ft-rec-low,
			var(--ft-status-pending, light-dark(oklch(0.5 0.02 260), oklch(0.72 0.02 260)))
		);
	}

	/* A dismissal is not a failure, so it stays deliberately quiet. */
	.ft-rec-resolved {
		color: var(--ft-rec-dismissed, color-mix(in oklab, currentColor 65%, transparent));
	}

	.ft-rec-resolved.ft-accepted {
		color: var(
			--ft-rec-accepted,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}

	/*
	 * Both moving parts live behind the query, so reduced motion is not a degraded
	 * variant to keep in sync: the ring is drawn at its final length and the
	 * footer simply swaps, with the same colours and the same words. The counter
	 * is JS-driven and collapses its own duration alongside.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-rec-ring-value {
			transition: stroke-dashoffset 700ms cubic-bezier(0.4, 0, 0.2, 1);
		}

		.ft-rec-resolved {
			animation: ft-rec-resolve-in 240ms cubic-bezier(0.4, 0, 0.2, 1);
		}
	}

	@keyframes ft-rec-resolve-in {
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
