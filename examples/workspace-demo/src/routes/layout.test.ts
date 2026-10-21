// The simulation switches in the query string must reach the shared `api`
// before any screen runs. Svelte runs a parent's mount hooks after its
// children's, so a screen that loads in its own mount hook would otherwise
// make its first call against the defaults: `?latency=slow` would not slow the
// first load, and `?latency=none&fail=always` would not fail it.
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG, LATENCY_PRESETS, api } from "$lib/data/api.js";
import LayoutHarness from "$lib/test/LayoutHarness.svelte";
import type { ProbeEntry } from "$lib/test/ApiProbe.svelte";

vi.mock("$app/environment", () => ({
	browser: true,
	building: false,
	dev: false,
	version: "test",
}));
vi.mock("$app/navigation", () => ({ afterNavigate: () => {} }));
vi.mock("$app/state", () => ({ page: { url: new URL("http://localhost/profile") } }));

function stubMatchMedia() {
	window.matchMedia = (query: string) =>
		({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		}) as MediaQueryList;
}

function restoreDefaults() {
	api.configure({ ...DEFAULT_CONFIG, latency: { ...DEFAULT_CONFIG.latency } });
	api.reset();
}

/** Opens the layout at `search` with a probe screen inside; returns what the probe saw. */
async function openWith(search: string) {
	window.history.replaceState({}, "", `/profile${search}`);
	const entries: ProbeEntry[] = [];
	render(LayoutHarness, { props: { record: (entry: ProbeEntry) => entries.push(entry) } });
	await tick();
	return entries;
}

/** Resolves with the probe's first call once it has settled. */
async function firstCall(entries: ProbeEntry[]) {
	return vi.waitFor(() => {
		const settled = entries.find((entry) => entry.phase === "first-call");
		if (!settled) throw new Error("the first call has not settled yet");
		return settled;
	});
}

beforeEach(() => {
	stubMatchMedia();
	restoreDefaults();
});

afterEach(() => {
	cleanup();
	restoreDefaults();
	window.history.replaceState({}, "", "/");
});

describe("the layout applies the query-string switches before any screen", () => {
	it("a screen's script and mount hook already see the switches", async () => {
		const entries = await openWith("?latency=slow&seed=7&scenario=empty");
		const seen = entries.filter(
			(entry): entry is Extract<ProbeEntry, { config: unknown }> => "config" in entry
		);
		expect(seen.map((entry) => entry.phase)).toEqual(["script", "mount"]);
		for (const entry of seen) {
			expect(entry.config.latency, entry.phase).toEqual(LATENCY_PRESETS.slow);
			expect(entry.config.seed, entry.phase).toBe(7);
			expect(entry.config.scenario, entry.phase).toBe("empty");
		}
	});

	it("?latency=none&fail=always fails the first call a screen makes on mount", async () => {
		const entries = await openWith("?latency=none&fail=always");
		const call = await firstCall(entries);
		expect(call).toMatchObject({ phase: "first-call", ok: false, code: "unavailable" });
		// No delay: well under the shortest default wait (350 ms).
		expect(call.ms).toBeLessThan(DEFAULT_CONFIG.latency.min / 2);
	});

	it("?latency=0&fail=once fails the first load, then the retry succeeds", async () => {
		const entries = await openWith("?latency=0&fail=once");
		const call = await firstCall(entries);
		expect(call).toMatchObject({ phase: "first-call", ok: false, code: "unavailable" });
		// No delay: well under the shortest default wait (350 ms).
		expect(call.ms).toBeLessThan(DEFAULT_CONFIG.latency.min / 2);
		await expect(api.getProfile()).resolves.toMatchObject({ name: expect.any(String) });
	});

	it("without a query string the screen sees the defaults", async () => {
		const entries = await openWith("");
		const mount = entries.find((entry) => entry.phase === "mount");
		expect(mount && "config" in mount ? mount.config : null).toMatchObject({
			failure: DEFAULT_CONFIG.failure,
			scenario: DEFAULT_CONFIG.scenario,
			seed: DEFAULT_CONFIG.seed,
		});
	});
});
