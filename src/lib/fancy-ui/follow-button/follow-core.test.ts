import { describe, expect, it } from "vitest";
import {
	DEFAULT_FOLLOW_LABELS,
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

describe("follow-core state machine", () => {
	it("starts idle on the given value", () => {
		const s = createFollowState(true);
		expect(s).toMatchObject({ following: true, phase: "idle" });
		expect(shownFollowing(s)).toBe(true);
	});

	it("press flips the SHOWN value at once but keeps the committed one", () => {
		const s = createFollowState(false);
		const p = press(s)!;
		expect(p.next).toBe(true);
		expect(p.state.phase).toBe("pending");
		expect(p.state.following).toBe(false);
		expect(shownFollowing(p.state)).toBe(true);
		expect(morphState(p.state)).toBe("loading");
	});

	it("ignores a press while an attempt is in flight", () => {
		const p = press(createFollowState(false))!;
		expect(press(p.state)).toBeNull();
	});

	it("commits on resolve", () => {
		const p = press(createFollowState(false))!;
		const r = settle(p.state, p.ticket, true);
		expect(r.outcome).toBe("commit");
		expect(r.state).toMatchObject({ following: true, phase: "idle" });
	});

	it("rolls back to error on reject and allows a retry press", () => {
		const p = press(createFollowState(false))!;
		const r = settle(p.state, p.ticket, false);
		expect(r.outcome).toBe("rollback");
		expect(r.state).toMatchObject({ following: false, phase: "error" });
		expect(shownFollowing(r.state)).toBe(false);
		expect(morphState(r.state)).toBe("error");
		const retry = press(r.state)!;
		expect(retry.next).toBe(true);
		expect(retry.ticket).toBeGreaterThan(p.ticket);
	});

	it("a stale ticket settles nothing", () => {
		const p = press(createFollowState(false))!;
		const parent = adopt(p.state, true);
		const r = settle(parent, p.ticket, false);
		expect(r.outcome).toBe("stale");
		expect(r.state).toBe(parent);
	});

	it("the parent wins over a pending attempt", () => {
		const p = press(createFollowState(false))!;
		const s = adopt(p.state, false);
		expect(s).toMatchObject({ following: false, phase: "idle" });
		expect(shownFollowing(s)).toBe(false);
		expect(s.ticket).toBeGreaterThan(p.ticket);
	});

	it("adopting the value already shown while idle is a no-op", () => {
		const s = createFollowState(true);
		expect(adopt(s, true)).toBe(s);
	});

	it("clearError only clears the error it was armed for", () => {
		const p = press(createFollowState(false))!;
		const failed = settle(p.state, p.ticket, false).state;
		const retry = press(failed)!;
		expect(clearError(retry.state, failed.ticket)).toBe(retry.state);
		expect(clearError(failed, failed.ticket).phase).toBe("idle");
		expect(clearError(failed, failed.ticket - 1)).toBe(failed);
	});

	it("cancel invalidates everything in flight and drops pending", () => {
		const p = press(createFollowState(false))!;
		const s = cancel(p.state);
		expect(s.phase).toBe("idle");
		expect(settle(s, p.ticket, true).outcome).toBe("stale");
	});
});

describe("follow-core text", () => {
	it("defaults and partial label overrides", () => {
		expect(DEFAULT_FOLLOW_LABELS).toEqual({
			follow: "Follow",
			following: "Following",
			unfollow: "Unfollow",
		});
		expect(resolveLabels({ following: "Subscribed" })).toEqual({
			follow: "Follow",
			following: "Subscribed",
			unfollow: "Unfollow",
		});
		expect(resolveLabels(undefined)).toEqual(DEFAULT_FOLLOW_LABELS);
	});

	it("shows the label of the SHOWN value, the error label on error", () => {
		const labels = resolveLabels();
		const idle = createFollowState(false);
		expect(visibleLabel(idle, labels, "Try again")).toBe("Follow");
		const p = press(idle)!;
		expect(visibleLabel(p.state, labels, "Try again")).toBe("Following");
		const failed = settle(p.state, p.ticket, false).state;
		expect(visibleLabel(failed, labels, "Try again")).toBe("Try again");
	});

	it("announces `name: outcome`", () => {
		expect(announcement("Follow Rama", "Could not follow")).toBe("Follow Rama: Could not follow");
	});

	it("recognises thenables only", () => {
		expect(isThenable(Promise.resolve())).toBe(true);
		expect(isThenable({ then() {} })).toBe(true);
		expect(isThenable(undefined)).toBe(false);
		expect(isThenable(null)).toBe(false);
		expect(isThenable(3)).toBe(false);
	});
});
