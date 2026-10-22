import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sound = vi.hoisted(() => ({ enabled: true, play: vi.fn() }));
vi.mock("$lib/fancy-ui/sound/index.js", () => ({ sound }));

import { playJingle } from "./jingle.js";

describe("playJingle", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		sound.play.mockClear();
		sound.enabled = true;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("plays success then a rising four-note arpeggio", async () => {
		await playJingle();
		vi.advanceTimersByTime(500);
		expect(sound.play.mock.calls).toEqual([
			["success"],
			["tick", { pitch: 0 }],
			["tick", { pitch: 4 }],
			["tick", { pitch: 7 }],
			["tick", { pitch: 12 }],
		]);
	});

	it("cancel drops the notes not played yet", async () => {
		const cancel = await playJingle();
		vi.advanceTimersByTime(100);
		cancel();
		vi.advanceTimersByTime(500);
		expect(sound.play.mock.calls.map((c) => c[0])).toEqual(["success", "tick"]);
	});

	it("stays silent when sound is off", async () => {
		sound.enabled = false;
		await playJingle();
		vi.advanceTimersByTime(500);
		expect(sound.play).not.toHaveBeenCalled();
	});
});
