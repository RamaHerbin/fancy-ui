import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEggRuntime, QUIET_NOTE_MS } from "./runtime.svelte.js";
import { isFound, resetEggs } from "./discovery.svelte.js";
import ProbePayload from "./__fixtures__/ProbePayload.svelte";
import type { EggDef, EggPayloadModule } from "./types.js";

const CODE = ["arrowup", "arrowup", "b", "a"];

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) {
	target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
}

function setup(defs: EggDef[], paused = false) {
	let t = 0;
	const clock = {
		advance(ms: number) {
			t += ms;
		},
	};
	const runtime = createEggRuntime(defs, { isPaused: () => paused, now: () => t });
	const stop = runtime.start();
	return { runtime, stop, clock };
}

const overlay = (
	load = vi.fn(async (): Promise<EggPayloadModule> => ({ default: ProbePayload }))
) =>
	({
		id: "cheatcode",
		order: 10,
		title: "Party mode",
		hint: "h",
		trigger: { kind: "sequence", keys: CODE },
		load,
	}) satisfies EggDef;

describe("egg runtime", () => {
	let stop: (() => void) | undefined;
	beforeEach(() => {
		localStorage.clear();
		resetEggs();
		document.body.innerHTML = "";
	});
	afterEach(() => {
		stop?.();
		stop = undefined;
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("fires a sequence, marks it found and mounts the payload", async () => {
		const def = overlay();
		const env = setup([def]);
		stop = env.stop;
		CODE.forEach((k) => press(k));
		await vi.waitFor(() => expect(env.runtime.active?.id).toBe("cheatcode"));
		expect(def.load).toHaveBeenCalledOnce();
		expect(isFound("cheatcode")).toBe(true);
		expect(env.runtime.active?.ctx.reducedMotion).toBe(false);
	});

	it("start() is idempotent and stop() detaches the listener", async () => {
		const def = overlay();
		const env = setup([def]);
		expect(env.runtime.start()).toBe(env.stop);
		env.stop();
		CODE.forEach((k) => press(k));
		await Promise.resolve();
		expect(def.load).not.toHaveBeenCalled();
	});

	it("ignores keys typed in editables or with a modifier, and never prevents default", async () => {
		const def = overlay();
		const env = setup([def]);
		stop = env.stop;
		const input = document.createElement("input");
		document.body.append(input);
		CODE.forEach((k) => press(k, {}, input));
		CODE.forEach((k) => press(k, { metaKey: true }));
		await Promise.resolve();
		expect(def.load).not.toHaveBeenCalled();
		const e = new KeyboardEvent("keydown", { key: "arrowup", bubbles: true, cancelable: true });
		document.body.dispatchEvent(e);
		expect(e.defaultPrevented).toBe(false);
	});

	it("Escape dismisses the overlay", async () => {
		const env = setup([overlay()]);
		stop = env.stop;
		await env.runtime.trigger("cheatcode");
		expect(env.runtime.active).not.toBeNull();
		press("Escape");
		expect(env.runtime.active).toBeNull();
	});

	it("Escape dismisses even while focus is in a field, without preventing default", async () => {
		const env = setup([overlay()]);
		stop = env.stop;
		await env.runtime.trigger("cheatcode");
		const input = document.createElement("input");
		document.body.append(input);
		const e = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
		input.dispatchEvent(e);
		expect(env.runtime.active).toBeNull();
		expect(e.defaultPrevented).toBe(false);
		input.remove();
	});

	it("Escape while the overlay chunk is still loading cancels it", async () => {
		let resolve!: (mod: EggPayloadModule) => void;
		const load = vi.fn(
			() =>
				new Promise<EggPayloadModule>((r) => {
					resolve = r;
				})
		);
		const env = setup([overlay(load)]);
		stop = env.stop;
		const pending = env.runtime.trigger("cheatcode");
		expect(load).toHaveBeenCalledOnce();
		press("Escape");
		resolve({ default: ProbePayload });
		await pending;
		expect(env.runtime.active).toBeNull();
	});

	it("diverts to the quiet note when paused, without loading", async () => {
		vi.useFakeTimers();
		const def = overlay();
		const env = setup([def], true);
		stop = env.stop;
		await env.runtime.trigger("cheatcode");
		expect(def.load).not.toHaveBeenCalled();
		expect(env.runtime.note).toEqual({ id: "cheatcode", title: "Party mode" });
		expect(isFound("cheatcode")).toBe(true);
		vi.advanceTimersByTime(QUIET_NOTE_MS);
		expect(env.runtime.note).toBeNull();
	});

	it("uses a custom fallback, and motionSensitive: false still runs when paused", async () => {
		const fallback = vi.fn();
		const run = vi.fn();
		const env = setup(
			[
				{ ...overlay(), fallback },
				{
					id: "melody",
					order: 80,
					title: "Melody",
					hint: "h",
					trigger: { kind: "manual" },
					motionSensitive: false,
					load: async () => ({ run }),
				},
			],
			true
		);
		stop = env.stop;
		await env.runtime.trigger("cheatcode");
		expect(fallback).toHaveBeenCalledWith(expect.objectContaining({ reducedMotion: true }));
		await env.runtime.trigger("melody");
		expect(run).toHaveBeenCalledOnce();
		expect(env.runtime.note).toBeNull();
	});

	it("foundOn payload defers discovery to ctx.found()", async () => {
		const env = setup([{ ...overlay(), foundOn: "payload" }]);
		stop = env.stop;
		await env.runtime.trigger("cheatcode");
		expect(isFound("cheatcode")).toBe(false);
		env.runtime.active!.ctx.found();
		expect(isFound("cheatcode")).toBe(true);
	});

	it("toggles, auto-dismisses and keeps one overlay at a time", async () => {
		vi.useFakeTimers();
		const env = setup([
			{ ...overlay(), toggle: true, autoDismissMs: 1000 },
			{ ...overlay(), id: "matrix", order: 30 },
		]);
		stop = env.stop;
		await env.runtime.trigger("cheatcode");
		await env.runtime.trigger("cheatcode");
		expect(env.runtime.active).toBeNull();
		await env.runtime.trigger("cheatcode");
		const first = env.runtime.active!.ctx;
		await env.runtime.trigger("matrix");
		expect(env.runtime.active?.id).toBe("matrix");
		// A stale context cannot close the newer overlay, nor can its timer.
		first.dismiss();
		vi.advanceTimersByTime(1000);
		expect(env.runtime.active?.id).toBe("matrix");
		env.runtime.active!.ctx.dismiss();
		expect(env.runtime.active).toBeNull();
	});

	it("unknown ids and defs without load are harmless", async () => {
		const env = setup([
			{ id: "console", order: 20, title: "C", hint: "h", trigger: { kind: "manual" } },
		]);
		stop = env.stop;
		// @ts-expect-error unknown on purpose
		await env.runtime.trigger("nope");
		await env.runtime.trigger("console");
		expect(isFound("console")).toBe(true);
		expect(env.runtime.active).toBeNull();
		expect(env.runtime.list()).toEqual([
			{ id: "console", title: "C", hint: "h", found: true, hidden: false },
		]);
	});

	it("a failed load is swallowed", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const env = setup([overlay(vi.fn(async () => Promise.reject(new Error("offline"))))]);
		stop = env.stop;
		await expect(env.runtime.trigger("cheatcode")).resolves.toBeUndefined();
		expect(env.runtime.active).toBeNull();
	});

	it("fires word triggers from printable keys", async () => {
		const run = vi.fn();
		const env = setup([
			{
				id: "retro",
				order: 50,
				title: "R",
				hint: "h",
				trigger: { kind: "word", word: "retro" },
				load: async () => ({ run }),
			},
		]);
		stop = env.stop;
		[..."xRetro"].forEach((k) => press(k));
		await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
	});

	it("counts dom clicks within the window", async () => {
		const run = vi.fn();
		const env = setup([
			{
				id: "logo",
				order: 40,
				title: "L",
				hint: "h",
				trigger: { kind: "dom", event: "click", selector: "[data-logo]", count: 3, windowMs: 1000 },
				load: async () => ({ run }),
			},
		]);
		stop = env.stop;
		document.body.innerHTML = `<a data-logo><span id="inner">x</span></a>`;
		const inner = document.getElementById("inner")!;
		inner.click();
		inner.click();
		env.clock.advance(1500);
		inner.click();
		inner.click();
		await Promise.resolve();
		expect(run).not.toHaveBeenCalled();
		inner.click();
		await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
	});

	it("counts pointerenter once per entry, not per child crossing", async () => {
		const run = vi.fn();
		const env = setup([
			{
				id: "lost",
				order: 60,
				title: "L",
				hint: "h",
				trigger: {
					kind: "dom",
					event: "pointerenter",
					selector: "[data-zone]",
					count: 2,
					windowMs: 5000,
				},
				load: async () => ({ run }),
			},
		]);
		stop = env.stop;
		document.body.innerHTML = `<div data-zone id="z"><span id="a">a</span><span id="b">b</span></div><p id="out"></p>`;
		const over = (id: string, from: string) =>
			document.getElementById(id)!.dispatchEvent(
				new MouseEvent("pointerover", {
					bubbles: true,
					relatedTarget: document.getElementById(from),
				})
			);
		over("a", "out"); // enter
		over("b", "a"); // inside move: ignored
		await Promise.resolve();
		expect(run).not.toHaveBeenCalled();
		over("z", "out"); // second entry
		await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
	});
});

describe("egg runtime under a live motion preference", () => {
	let changeListeners: ((e: MediaQueryListEvent) => void)[] = [];
	let stop: (() => void) | undefined;

	async function load() {
		changeListeners = [];
		vi.spyOn(window, "matchMedia").mockImplementation(
			(query: string) =>
				({
					matches: false,
					media: query,
					onchange: null,
					addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) =>
						changeListeners.push(fn),
					removeEventListener: () => {},
					dispatchEvent: () => false,
					addListener: () => {},
					removeListener: () => {},
				}) as unknown as MediaQueryList
		);
		vi.resetModules();
		// Fresh module graph: the runtime, the store and svelte itself (flushSync must
		// drive the same scheduler the runtime registered its effect on).
		const { flushSync } = await import("svelte");
		const stores = await import("$lib/stores");
		const { createEggRuntime } = await import("./runtime.svelte.js");
		// The real motion store: no isPaused override.
		const runtime = createEggRuntime([{ ...overlay(), autoDismissMs: 8000 }]);
		stop = runtime.start();
		return { runtime, stores, flushSync };
	}

	beforeEach(() => {
		localStorage.clear();
		delete document.documentElement.dataset.motion;
	});
	afterEach(() => {
		stop?.();
		stop = undefined;
		vi.restoreAllMocks();
	});

	it("ends party mode when the OS switches to reduced motion mid-effect", async () => {
		const { runtime, flushSync } = await load();
		await runtime.trigger("cheatcode");
		expect(runtime.active?.id).toBe("cheatcode");
		expect(changeListeners.length).toBeGreaterThan(0);
		for (const fn of changeListeners) fn({ matches: true } as MediaQueryListEvent);
		flushSync();
		expect(runtime.active).toBeNull();
	});

	it("ends party mode when the visitor pauses decorative motion mid-effect", async () => {
		const { runtime, stores, flushSync } = await load();
		await runtime.trigger("cheatcode");
		expect(runtime.active?.id).toBe("cheatcode");
		stores.setMotion("paused");
		flushSync();
		expect(runtime.active).toBeNull();
	});

	it("stops watching once the effect is dismissed", async () => {
		const { runtime, stores, flushSync } = await load();
		await runtime.trigger("cheatcode");
		const ctx = runtime.active!.ctx;
		const spy = vi.spyOn(ctx, "dismiss");
		runtime.dismiss();
		stores.setMotion("paused");
		flushSync();
		expect(spy).not.toHaveBeenCalled();
	});
});
