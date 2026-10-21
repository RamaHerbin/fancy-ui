import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFancyConsole } from "./console-api.js";
import { markFound, isFound } from "./discovery.svelte.js";
import type { EggRuntime } from "./runtime.svelte.js";

function fakeRuntime(): EggRuntime {
	return {
		active: null,
		note: null,
		start: () => () => {},
		dismiss: vi.fn(),
		trigger: vi.fn(async () => {}),
		list: () => [
			{
				id: "cheatcode",
				title: "Party mode",
				hint: "Old fingers remember.",
				found: true,
				hidden: false,
			},
			{
				id: "console",
				title: "Console whisperer",
				hint: "Talk back.",
				found: false,
				hidden: false,
			},
			{ id: "humans", title: "Hidden", hint: "secret", found: false, hidden: true },
		],
	};
}

describe("installFancyConsole", () => {
	beforeEach(() => {
		delete window.fancy;
	});
	afterEach(() => {
		delete window.fancy;
		vi.restoreAllMocks();
	});

	it("prints one banner, defines window.fancy, and is idempotent", () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => {});
		const runtime = fakeRuntime();
		installFancyConsole(runtime, { version: "1.2.3" });
		installFancyConsole(runtime, { version: "9.9.9" });
		expect(info).toHaveBeenCalledOnce();
		expect(String(info.mock.calls[0][0])).toContain("Curious? Type fancy.help()");
		expect(String(info.mock.calls[0][0])).toContain("1.2.3");
		expect(window.fancy?.version).toBe("1.2.3");
	});

	it("routes commands to the runtime", () => {
		vi.spyOn(console, "info").mockImplementation(() => {});
		const table = vi.spyOn(console, "table").mockImplementation(() => {});
		const runtime = fakeRuntime();
		installFancyConsole(runtime, { version: "1.2.3" });
		const api = window.fancy!;

		api.help();
		expect(runtime.trigger).toHaveBeenLastCalledWith("console");
		api.party();
		expect(runtime.trigger).toHaveBeenLastCalledWith("cheatcode");
		api.matrix();
		expect(runtime.trigger).toHaveBeenLastCalledWith("matrix");

		api.eggs();
		expect(runtime.trigger).toHaveBeenLastCalledWith("console");
		const rows = table.mock.calls[0][0] as { egg: string; found: string; hint: string }[];
		expect(rows).toEqual([
			{ egg: "Party mode", found: "✓", hint: "" },
			{ egg: "Console whisperer", found: "·", hint: "Talk back." },
		]);
		expect(console.info).toHaveBeenLastCalledWith(
			expect.stringContaining("1/2 found"),
			expect.any(String)
		);
	});

	it("reset() clears discoveries", () => {
		vi.spyOn(console, "info").mockImplementation(() => {});
		installFancyConsole(fakeRuntime(), { version: "1.2.3" });
		markFound("matrix");
		window.fancy!.reset();
		expect(isFound("matrix")).toBe(false);
	});
});
