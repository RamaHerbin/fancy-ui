import { describe, expect, it, vi } from "vitest";
import { runShutdown } from "./shutdown.js";

function setup() {
	const calls: string[] = [];
	const dm = {
		cover: vi.fn(async () => void calls.push("cover")),
		reveal: vi.fn(async () => void calls.push("reveal")),
	};
	const ctx = {
		found: vi.fn(() => void calls.push("found")),
		dismiss: vi.fn(() => void calls.push("dismiss")),
	};
	const setSkin = vi.fn((skin: string) => void calls.push(`skin:${skin}`));
	const settle = vi.fn(async () => void calls.push("settle"));
	return { calls, dm, ctx, setSkin, settle };
}

describe("runShutdown", () => {
	it("covers, swaps the skin under the curtain, reveals, then records and dismisses", async () => {
		const { calls, dm, ctx, setSkin, settle } = setup();
		await runShutdown(dm, ctx, setSkin, () => true, settle);
		expect(calls).toEqual(["cover", "skin:standard", "settle", "reveal", "found", "dismiss"]);
	});

	it("keeps the skin when the overlay was dismissed during the cover", async () => {
		const { calls, dm, ctx, setSkin, settle } = setup();
		await runShutdown(dm, ctx, setSkin, () => false, settle);
		expect(calls).toEqual(["cover"]);
		expect(setSkin).not.toHaveBeenCalled();
		expect(dm.reveal).not.toHaveBeenCalled();
	});
});
