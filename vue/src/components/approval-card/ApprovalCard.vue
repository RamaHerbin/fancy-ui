<script lang="ts">
import type { HTMLAttributes } from "vue";

/** The three states of a human-in-the-loop gate. */
export type ApprovalState = "pending" | "approved" | "denied";

/**
 * Props for ApprovalCard
 */
export interface ApprovalCardProps {
	/** What the agent is asking permission for, e.g. "Run database migration". */
	title: string;
	/** Secondary muted line under the title — the consequence, the blast radius. */
	description?: string;
	/** Which side of the gate we are on. Bindable, so the decision is readable from outside. */
	state?: ApprovalState;
	/** Marks the action as irreversible: red approve button and a warning tint on the card. */
	destructive?: boolean;
	/** Label for the approve button. */
	approveLabel?: string;
	/** Label for the deny button. */
	denyLabel?: string;
	/** Called when approve is pressed, after `state` has been written. */
	onApprove?: () => void;
	/** Called when deny is pressed, after `state` has been written. */
	onDeny?: () => void;
	/** The consumer is executing the decision: both buttons go disabled and the card is `aria-busy`. */
	busy?: boolean;
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
import { computed, nextTick, useTemplateRef } from "vue";

import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";

defineOptions({ name: "ApprovalCard", inheritAttrs: false });

const props = withDefaults(defineProps<ApprovalCardProps>(), {
	destructive: false,
	approveLabel: "Approve",
	denyLabel: "Deny",
	busy: false,
	sound: false,
});

const state = defineModel<ApprovalState>("state", { default: "pending" });

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

defineSlots<{ default?(): unknown }>();

const playCue = useSoundCue(() => props.sound);

/** Spoken and shown once the gate is behind us. */
const RESOLVED_LABELS = {
	approved: "Approved",
	denied: "Denied",
} as const;

const isPending = computed(() => state.value === "pending");
const isApproved = computed(() => state.value === "approved");
const resolvedLabel = computed(() =>
	isApproved.value ? RESOLVED_LABELS.approved : RESOLVED_LABELS.denied
);

/** Where focus lands once the buttons it might have held are gone. */
const resolvedRef = useTemplateRef<HTMLParagraphElement>("resolvedRef");

/**
 * Closed for the rest of the tick by a decision that has been taken.
 *
 * `defineModel` writes its own copy only while the consumer is not driving the
 * model: hand the card both `state` and `@update:state` and the setter merely
 * emits, so the guard below would still read `"pending"` back for the rest of
 * the tick and let a second decision dispatched in that window through. Svelte
 * `$bindable` writes through immediately and refuses it, and this stands in for
 * that write. It is released on the tick the write would have been visible on,
 * so a consumer that declines the decision — never sending the value back — is
 * left with a live gate rather than a dead one.
 */
let settled = false;

/**
 * The decision is written to `state` before the callback fires, so a consumer
 * reading the bound value from inside its own handler already sees the answer.
 * Re-entry is refused rather than re-announced: a gate resolves once.
 */
function decide(next: "approved" | "denied") {
	if (props.busy || settled || state.value !== "pending") return;
	settled = true;
	state.value = next;
	// Deny is a legitimate choice, not a failure — both sides of the gate play
	// the same cue, never `error` for a refusal.
	playCue("select");
	if (next === "approved") props.onApprove?.();
	else props.onDeny?.();
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
		:class="[
			cn('ft-approval border-border bg-card/50 w-full rounded-lg border p-4 text-sm', props.class),
			{ 'ft-destructive': destructive },
		]"
		role="group"
		:aria-label="title"
		:aria-busy="busy ? 'true' : undefined"
		:data-state="state"
	>
		<div class="flex items-start gap-2.5">
			<!--
				Decorative: the title carries the ask in words. On a destructive gate the
				shield picks up an alert mark, so "this one is irreversible" is not left
				to the tint alone.
			-->
			<span class="ft-approval-icon mt-0.5 flex-none" aria-hidden="true">
				<svg
					class="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
					<template v-if="destructive">
						<path d="M12 8v3.5" />
						<path d="M12 15h.01" />
					</template>
				</svg>
			</span>

			<div class="min-w-0 flex-1">
				<p class="ft-approval-title text-foreground font-medium">{{ title }}</p>
				<p
					v-if="description"
					class="ft-approval-description text-muted-foreground mt-0.5 text-xs leading-relaxed"
				>
					{{ description }}
				</p>
			</div>
		</div>

		<div v-if="$slots.default" class="ft-approval-detail mt-3 min-w-0">
			<slot />
		</div>

		<!--
			One footer element, mounted from the first render, so the live region exists
			before the decision lands in it — a region that appears at the same moment as
			its own text is routinely missed by screen readers.
		-->
		<div class="ft-approval-foot mt-3" aria-live="polite">
			<div v-if="isPending" class="ft-approval-actions flex flex-wrap items-center justify-end gap-2">
				<button
					type="button"
					class="ft-approval-deny text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-60"
					:disabled="busy"
					@click="decide('denied')"
				>
					{{ denyLabel }}
				</button>
				<button
					type="button"
					:class="[
						'ft-approval-approve bg-foreground text-background hover:bg-foreground/90 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-60',
						{ 'ft-destructive': destructive },
					]"
					:disabled="busy"
					@click="decide('approved')"
				>
					{{ approveLabel }}
				</button>
			</div>
			<p
				v-else
				ref="resolvedRef"
				tabindex="-1"
				:class="[
					'ft-approval-resolved focus-visible:ring-ring flex items-center gap-1.5 rounded-md text-xs font-medium focus-visible:ring-1 focus-visible:outline-none',
					{ 'ft-approved': isApproved },
				]"
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
						<path v-if="isApproved" d="m20 6-11 11-5-5" />
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
	 * `--ft-approval-*`, then the `--ft-status-*` vocabulary the whole AI family
	 * shares, then the literal. Setting either anywhere up the tree retints the
	 * card without having to win a specificity fight against these scoped rules,
	 * and the shared one recolours every sibling component at once.
	 */
	.ft-approval.ft-destructive {
		background: var(
			--ft-approval-danger-bg,
			color-mix(
				in oklab,
				var(
						--ft-approval-danger,
						var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
					)
					6%,
				transparent
			)
		);
		border-color: var(
			--ft-approval-danger-border,
			color-mix(
				in oklab,
				var(
						--ft-approval-danger,
						var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
					)
					22%,
				transparent
			)
		);
	}

	.ft-approval.ft-destructive .ft-approval-icon {
		color: var(
			--ft-approval-danger,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
	}

	/*
	 * Unlayered scoped rules beat Tailwind's layered utilities, so the destructive
	 * button overrides `bg-foreground` / `text-background` without `!important`.
	 * Its text flips with the scheme because no single ink clears 4.5:1 against a
	 * red that is dark on a light page and light on a dark one.
	 */
	.ft-approval-approve.ft-destructive {
		background: var(
			--ft-approval-danger,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
		color: var(--ft-approval-danger-fg, light-dark(oklch(0.985 0 0), oklch(0.16 0 0)));
	}

	.ft-approval-approve.ft-destructive:hover:not(:disabled) {
		background: color-mix(
			in oklab,
			var(
					--ft-approval-danger,
					var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
				)
				88%,
			transparent
		);
	}

	/* Denied stays deliberately quiet — a refusal is not a failure. */
	.ft-approval-resolved {
		color: var(--ft-approval-denied, color-mix(in oklab, currentColor 65%, transparent));
	}

	.ft-approval-resolved.ft-approved {
		color: var(
			--ft-approval-approved,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}

	/*
	 * The verdict's fade is the whole animation, and it lives behind the query, so
	 * reduced motion is not a degraded variant to keep in sync: the footer simply
	 * swaps, with the same colours and the same words.
	 *
	 * The footer's height is deliberately left alone. A transition needs the
	 * specified value to change, and `height: auto` never changes — only the
	 * content under it does — so an `interpolate-size` rule here would have been
	 * dead weight rather than a smooth collapse.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-approval-resolved {
			animation: ft-approval-resolve-in 240ms cubic-bezier(0.4, 0, 0.2, 1);
		}
	}

	@keyframes ft-approval-resolve-in {
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
