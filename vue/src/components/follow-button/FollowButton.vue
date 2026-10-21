<script lang="ts">
import type { CSSProperties, HTMLAttributes } from "vue";
import type { ButtonVariant, ButtonSize } from "../button/types.js";
import type { FollowLabels } from "./follow-core.js";

export type { FollowLabels };

export interface FollowButtonProps {
	/**
	 * Called with the committed value, once per successful attempt. Not called
	 * for a rolled-back or superseded one. The value itself is
	 * `v-model:following`.
	 */
	onFollowingChange?: (following: boolean) => void;
	/**
	 * Called with the value the click asks for. Return nothing to commit at
	 * once, or a promise: resolve commits, reject (or throw) rolls back, shows
	 * the error and announces it. Clicking again after a failure retries.
	 */
	onToggle?: (next: boolean) => void | Promise<unknown>;
	/** Stable accessible name, e.g. "Follow Rama". Defaults to the idle label. */
	label?: string;
	/** Visible text per state; unset keys keep the defaults. */
	labels?: Partial<FollowLabels>;
	/** Visible text and announcement after a failed attempt */
	errorLabel?: string;
	/** How long the error state holds before reverting, in milliseconds */
	resetMs?: number;
	/** Button variant. By default the idle state is `primary` and the following state `outline`. */
	variant?: ButtonVariant;
	/** Passed straight through to the underlying Button */
	size?: ButtonSize;
	/** Disables the button and blocks the toggle */
	disabled?: boolean;
	/** Drops the visible text, keeping the accessible name */
	iconOnly?: boolean;
	/**
	 * Plays the matching interface cue (toggle-on, toggle-off, error) and the
	 * error vibration. Off by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/**
	 * Fires on activation, after the toggle has started. Never called while
	 * `disabled` or pending. `@click` reaches it.
	 */
	onClick?: ((event: MouseEvent) => void) | ((event: MouseEvent) => void)[];
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}

/** How long the outgoing label stays on screen, in milliseconds. */
const LEAVE_MS = 80;

/*
 * The inline `style` rides StatusMorph's `$attrs` and lands as an attribute,
 * which beats its own scoped width rule. `font-size` is set beside it so
 * StatusMorph's inner `calc(1em + 1px)` resolves to the same `1rem` and the
 * glyph fills the 16px box. `--ft-statusmorph-error` reads the same
 * `--ft-status-error` chain the failure skin below resolves, so a theme that
 * declares neither token still paints one red on the cross and the border.
 *
 * An OBJECT rather than a `style="…"` string: a string `style` goes through
 * `cssText`, where custom properties are dropped.
 */
const MORPH_STYLE: CSSProperties = {
	width: "1rem",
	height: "1rem",
	fontSize: "calc(1rem - 1px)",
	"--ft-statusmorph-error":
		"var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216)))",
};
</script>

<script setup lang="ts">
import {
	computed,
	onBeforeUnmount,
	ref,
	shallowRef,
	useAttrs,
	useTemplateRef,
	watch,
	watchEffect,
} from "vue";
import { callListener } from "../../internals/call-listener.js";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";
import { prefersReducedMotion } from "../../internals/motion/anchored.js";
import { Button } from "../button/index.js";
import { StatusMorph } from "../status-morph/index.js";
import {
	adopt,
	announcement,
	cancel,
	clearError,
	createFollowState,
	isThenable,
	morphState,
	press,
	resolveLabels,
	settle,
	shownFollowing,
	visibleLabel,
} from "./follow-core.js";

defineOptions({ name: "FollowButton", inheritAttrs: false });

const {
	onFollowingChange,
	onToggle,
	label,
	labels,
	errorLabel = "Try again",
	resetMs = 2000,
	variant,
	size = "md",
	disabled = false,
	iconOnly = false,
	sound = false,
	onClick,
	class: className,
} = defineProps<FollowButtonProps>();

/**
 * Whether the viewer follows, `v-model:following`. The committed value is
 * written back when `onToggle` resolves, never before. A write from the parent
 * while an attempt is pending wins and drops that attempt.
 */
const following = defineModel<boolean>("following", { default: false });

// Native attributes and listeners ride through to Button, which lands them on
// its `<button>`. `onClick` is a declared prop (above) so it can run after the
// toggle starts rather than merging into Button's own listener.
const attrs = useAttrs();

// The element Button itself published, read through Button's own exposed `ref`
// so it tracks the control across a swap between the `<a>` and `<button>`
// branches.
const btn = useTemplateRef<InstanceType<typeof Button>>("btn");
defineExpose({ ref: computed(() => btn.value?.ref ?? null) });

// The machine's snapshot. Replaced wholesale, never mutated, so `shallowRef`.
const core = shallowRef(createFollowState(following.value));

// The parent speaks: its value wins over a pending attempt or a standing error.
// Keyed on the model alone — our own commit writes `core` and `following` to
// the same value, so the echo finds nothing to do.
watch(following, (value) => {
	if (value !== core.value.following) core.value = adopt(core.value, value);
});

// Anything still in flight at unmount is stale from here on.
onBeforeUnmount(() => {
	core.value = cancel(core.value);
});

const resolvedLabels = computed(() => resolveLabels(labels));
const shown = computed(() => shownFollowing(core.value));
const currentLabel = computed(() => visibleLabel(core.value, resolvedLabels.value, errorLabel));
const showsPreview = computed(() => core.value.phase === "idle" && core.value.following);
const failed = computed(() => core.value.phase === "error");
// With no explicit variant the button flips primary <-> outline, and the
// outline has a 1px border: reserve it (transparent) in the primary state so
// the box is identical across idle, following, pending and error.
const classes = computed(() => {
	const reserveBorder = variant === undefined;
	return cn(
		"ft-follow",
		(failed.value || reserveBorder) && "border",
		reserveBorder && !shown.value && !failed.value && "border-transparent",
		failed.value && "ft-follow--failed",
		className
	);
});

// The accessible name never follows the visible text: a name that changes next
// to `aria-pressed` would announce the state twice. A plain function, read from
// the template: `attrs` is a proxy with no `ownKeys` trap, so a `computed`
// over it would go stale.
function accessibleName(): string {
	return label ?? (attrs["aria-label"] as string | undefined) ?? resolvedLabels.value.follow;
}

// The error window. Armed per failure and keyed on the ticket, so a retry or a
// parent write that lands first is never cleared by a stale timer. 0 means
// "revert on the next tick", the reading the copy button gives it.
watchEffect((onCleanup) => {
	if (core.value.phase !== "error") return;
	const armed = core.value.ticket;
	const timer = setTimeout(
		() => {
			core.value = clearError(core.value, armed);
		},
		resetMs > 0 ? resetMs : 1
	);
	onCleanup(() => clearTimeout(timer));
});

function finish(ticket: number, ok: boolean) {
	const result = settle(core.value, ticket, ok);
	// Superseded by the parent, a retry or an unmount: it has nothing to say.
	if (result.outcome === "stale") return;
	core.value = result.state;
	if (ok) {
		following.value = result.state.following;
		if (sound) soundFx.play(result.state.following ? "toggle-on" : "toggle-off");
		onFollowingChange?.(result.state.following);
	} else if (sound) {
		soundFx.play("error");
	}
}

function handleClick(event: MouseEvent) {
	// A click while an attempt is in flight is swallowed: neither the toggle nor
	// the consumer's own handler runs, and nothing is queued.
	const started = press(core.value);
	if (!started) return;
	// The outcome cue may play after an await, when the transient activation is
	// gone: create/resume the audio context while the gesture is live.
	if (sound && soundFx.enabled) void soundFx.unlock();
	core.value = started.state;
	const ticket = started.ticket;
	let result: unknown;
	let threw = false;
	try {
		result = onToggle?.(started.next);
	} catch {
		threw = true;
	}
	if (threw) finish(ticket, false);
	else if (isThenable(result)) {
		result.then(
			() => finish(ticket, true),
			() => finish(ticket, false)
		);
	} else finish(ticket, true);
	callListener(onClick, event);
}

// Out 80 ms, in 160 ms: a label change keeps the OUTGOING text alive for the
// out beat as a second, `aria-hidden` layer in the same grid cell, while the
// keyed live span fades in after that beat. `prefersReducedMotion()` is read
// once per swap: under reduced motion there is no outgoing layer and the text
// snaps. The watch is `pre`-flushed so the outgoing text is in the very render
// that shows the new one.
const swapped = ref(false);
const leaving = ref<string | null>(null);
let leaveTimer: ReturnType<typeof setTimeout> | undefined;

watch(currentLabel, (next, previous) => {
	if (next === previous) return;
	swapped.value = true;
	// A second swap inside the out beat: `previous` was still in its delayed
	// fade-in and never painted, so keep the layer that is on screen (and its
	// timer) rather than replacing it with text the user never saw.
	if (leaving.value !== null) return;
	clearTimeout(leaveTimer);
	if (prefersReducedMotion()) {
		leaving.value = null;
		return;
	}
	leaving.value = previous;
	leaveTimer = setTimeout(() => {
		leaving.value = null;
	}, LEAVE_MS);
});

onBeforeUnmount(() => clearTimeout(leaveTimer));
</script>

<template>
	<Button
		ref="btn"
		v-bind="attrs"
		type="button"
		:variant="variant ?? (shown ? 'outline' : 'primary')"
		:size="size"
		:disabled="disabled"
		:label="accessibleName()"
		:class="classes"
		:aria-pressed="shown"
		:aria-busy="core.phase === 'pending' ? 'true' : undefined"
		:data-state="core.phase"
		@click="handleClick"
	>
		<!--
			The glyph is driven, not bound: its state comes from the machine, so the
			morph has no timer of its own (reset-after 0) and cannot disagree with
			the button about whether an attempt is pending. Its status region,
			which it portals to the document body and so never joins the button's
			name, is the one live region: silent while loading, assertive on
			error, "name: outcome".
		-->
		<template #iconStart>
			<StatusMorph
				:state="morphState(core)"
				tone="semantic"
				:reset-after="0"
				:haptic="sound"
				:labels="{ loading: '', success: '', error: announcement(accessibleName(), errorLabel) }"
				:style="MORPH_STYLE"
			>
				<template #idle>
					<svg
						class="size-full"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path v-if="shown" d="M20 6 9 17l-5-5" />
						<path v-else d="M12 5v14M5 12h14" />
					</svg>
				</template>
			</StatusMorph>
		</template>
		<!-- The visible text sits in a one-cell grid stacking four `aria-hidden`
		     ghosts (follow, following, unfollow, error) under the live span: the
		     cell is as wide as the widest, in pure CSS, so the button never
		     changes width when the text swaps and nothing is measured
		     (SSR-safe). The unfollow preview is the same: a second layer in the
		     live span that a hover or keyboard focus on a fine pointer reveals in
		     CSS, so no state, no listener and no layout shift carry it. -->
		<span v-if="!iconOnly" class="ft-follow__label">
			<span class="ft-follow__ghost" aria-hidden="true">{{ resolvedLabels.follow }}</span>
			<span class="ft-follow__ghost" aria-hidden="true">{{ resolvedLabels.following }}</span>
			<span class="ft-follow__ghost" aria-hidden="true">{{ resolvedLabels.unfollow }}</span>
			<span class="ft-follow__ghost" aria-hidden="true">{{ errorLabel }}</span>
			<span v-if="leaving !== null" class="ft-follow__leave" aria-hidden="true">{{ leaving }}</span>
			<span
				:key="currentLabel"
				class="ft-follow__live"
				:data-swapped="swapped ? '' : undefined"
				:data-preview="showsPreview ? '' : undefined"
			>
				<span class="ft-follow__rest">{{ currentLabel }}</span>
				<span v-if="showsPreview" class="ft-follow__preview" aria-hidden="true">{{
					resolvedLabels.unfollow
				}}</span>
			</span>
		</span>
	</Button>
</template>

<style scoped>
.ft-follow__label {
	display: inline-grid;
	text-align: start;
}

.ft-follow__label > * {
	grid-area: 1 / 1;
	white-space: nowrap;
}

.ft-follow__ghost {
	visibility: hidden;
	pointer-events: none;
	user-select: none;
}

.ft-follow__leave {
	pointer-events: none;
}

.ft-follow__live {
	display: inline-grid;
	text-align: start;
}

.ft-follow__live > * {
	grid-area: 1 / 1;
}

.ft-follow__preview {
	visibility: hidden;
}

/* The unfollow preview: a fine pointer over the button, or keyboard focus on
   it. Written as a plain descendant: under the scoped compiler `:global()`
   would swallow the whole selector and the preview would never show. A touch screen has no hover, so the preview never shows there and the
   control never carries an affordance only a mouse can reach. Instant, not
   animated: it is a state read-out, not motion. */
@media (hover: hover) and (pointer: fine) {
	.ft-follow:is(:hover, :focus-visible) .ft-follow__live[data-preview] > .ft-follow__rest {
		visibility: hidden;
	}

	.ft-follow:is(:hover, :focus-visible) .ft-follow__live[data-preview] > .ft-follow__preview {
		visibility: visible;
	}
}

/* transform / opacity only ever run under `no-preference`; under reduce the
   text snaps and the component never renders the outgoing layer. */
@media (prefers-reduced-motion: no-preference) {
	.ft-follow__leave {
		animation: ft-follow-out 80ms var(--ft-ease-in, cubic-bezier(0.7, 0, 0.84, 0)) forwards;
	}

	.ft-follow__live[data-swapped] {
		animation: ft-follow-in 160ms var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1)) 80ms backwards;
	}
}

@keyframes ft-follow-out {
	to {
		opacity: 0;
		transform: translateY(-2px);
	}
}

@keyframes ft-follow-in {
	from {
		opacity: 0;
		transform: translateY(2px);
	}
}

/*
 * The failure skin reads the family's `--ft-status-error` vocabulary with the
 * same fallback pair the toast surface uses, so a failed follow next to a
 * failed toast is one red even in a theme that declares neither. `:global()`
 * because the class lands on the `<button>` Button renders in its own template.
 * Unlayered author CSS beats Tailwind's utilities layer, so neither variant's
 * hover colours bleed back over it.
 */
:global(.ft-follow--failed) {
	border-color: color-mix(
		in oklab,
		var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216))) 35%,
		transparent
	);
	background-color: color-mix(
		in oklab,
		var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216))) 10%,
		transparent
	);
	color: var(--ft-status-error, light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216)));
}
</style>
