/**
 * Pure state machine behind FollowButton, shared byte for byte by the Svelte,
 * React and Vue ports. No framework, no timers, no DOM: every function takes a
 * snapshot and returns the next one, so the three components only translate
 * "a click", "a promise settled" and "the parent wrote a value" into calls and
 * paint the result.
 *
 * Three things live here because getting any of them subtly different in one
 * port would be a bug no single port's tests could see:
 *
 * - The attempt ticket. Every press, every parent write and every cancel bumps
 *   `ticket`; a promise that settles under an older ticket changes nothing.
 *   That one rule covers a parent that answers faster than the server, a retry
 *   after a failure, and an unmount with a request still in flight.
 * - The optimistic read. While an attempt is pending the button SHOWS the
 *   value it asked for, while `following` still holds the last value anybody
 *   committed, which is what a rollback returns to.
 * - The label vocabulary (what is shown, what is announced), so a port cannot
 *   drift on which text goes with which state.
 */

/** Where the control is in one attempt. `error` holds until a timer, a retry or the parent clears it. */
export type FollowPhase = "idle" | "pending" | "error";

export interface FollowState {
	/** The last committed value: what a rollback returns to. */
	readonly following: boolean;
	readonly phase: FollowPhase;
	/** The value the in-flight attempt asked for. Meaningful only while `phase` is `pending`. */
	readonly target: boolean;
	/** Identifies the current attempt; bumped by every press, parent write and cancel. */
	readonly ticket: number;
}

export interface FollowLabels {
	/** Visible and default accessible text while not following. */
	follow: string;
	/** Visible text while following. */
	following: string;
	/** Text previewed while following, on hover or keyboard focus of a fine pointer. */
	unfollow: string;
}

export const DEFAULT_FOLLOW_LABELS: Readonly<FollowLabels> = {
	follow: "Follow",
	following: "Following",
	unfollow: "Unfollow",
};

/** The glyph state StatusMorph is driven with. */
export type FollowMorphState = "idle" | "loading" | "error";

export type FollowOutcome = "commit" | "rollback" | "stale";

export function createFollowState(following: boolean): FollowState {
	return { following, phase: "idle", target: following, ticket: 0 };
}

/** The value the control paints: the requested one while pending, the committed one otherwise. */
export function shownFollowing(state: FollowState): boolean {
	return state.phase === "pending" ? state.target : state.following;
}

/**
 * A user activation. Returns the pending state plus the value to hand to
 * `onToggle`, or `null` while an attempt is already in flight (the click is
 * swallowed, never queued). A press out of `error` is the retry.
 */
export function press(
	state: FollowState
): { state: FollowState; ticket: number; next: boolean } | null {
	if (state.phase === "pending") return null;
	const next = !state.following;
	const ticket = state.ticket + 1;
	return {
		state: { following: state.following, phase: "pending", target: next, ticket },
		ticket,
		next,
	};
}

/**
 * The attempt `ticket` finished. `ok` commits the requested value; failure
 * keeps the committed one and parks the control in `error`. A ticket that is no
 * longer current changes nothing and reports `stale`.
 */
export function settle(
	state: FollowState,
	ticket: number,
	ok: boolean
): { state: FollowState; outcome: FollowOutcome } {
	if (state.phase !== "pending" || ticket !== state.ticket) return { state, outcome: "stale" };
	if (ok) {
		return {
			state: { following: state.target, phase: "idle", target: state.target, ticket: state.ticket },
			outcome: "commit",
		};
	}
	return {
		state: {
			following: state.following,
			phase: "error",
			target: state.following,
			ticket: state.ticket,
		},
		outcome: "rollback",
	};
}

/**
 * The parent wrote a value. It always wins: a pending attempt or a standing
 * error is dropped and its ticket invalidated. Re-asserting what is already
 * shown while idle is a no-op, so an echo of our own commit costs nothing.
 */
export function adopt(state: FollowState, following: boolean): FollowState {
	if (state.phase === "idle" && state.following === following) return state;
	return { following, phase: "idle", target: following, ticket: state.ticket + 1 };
}

/** The error window ended. Only clears the error `ticket` armed it for, never a newer attempt. */
export function clearError(state: FollowState, ticket: number): FollowState {
	if (state.phase !== "error" || state.ticket !== ticket) return state;
	return { ...state, phase: "idle" };
}

/** Unmount: nothing in flight may write anything afterwards. */
export function cancel(state: FollowState): FollowState {
	return {
		following: state.following,
		phase: "idle",
		target: state.following,
		ticket: state.ticket + 1,
	};
}

export function morphState(state: FollowState): FollowMorphState {
	return state.phase === "pending" ? "loading" : state.phase === "error" ? "error" : "idle";
}

export function resolveLabels(labels?: Partial<FollowLabels> | null): FollowLabels {
	const resolved: FollowLabels = { ...DEFAULT_FOLLOW_LABELS };
	if (!labels) return resolved;
	// `Partial` allows `{ follow: undefined }`; spreading it would blank the default.
	for (const key of Object.keys(DEFAULT_FOLLOW_LABELS) as (keyof FollowLabels)[]) {
		const value = labels[key];
		if (value !== undefined) resolved[key] = value;
	}
	return resolved;
}

/** The visible text for a state. The unfollow preview is a hover/focus overlay, not a state. */
export function visibleLabel(state: FollowState, labels: FollowLabels, errorLabel: string): string {
	if (state.phase === "error") return errorLabel;
	return shownFollowing(state) ? labels.following : labels.follow;
}

/** `name: outcome`, the single assertive announcement of a failed attempt. */
export function announcement(name: string, outcome: string): string {
	return `${name}: ${outcome}`;
}

/** A value `await` would wait for. A plain return commits synchronously instead. */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
	return (
		value !== null &&
		(typeof value === "object" || typeof value === "function") &&
		typeof (value as { then?: unknown }).then === "function"
	);
}
