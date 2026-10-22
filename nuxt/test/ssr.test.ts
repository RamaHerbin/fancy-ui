import { fileURLToPath } from "node:url";
import { $fetch, createPage, setup, url } from "@nuxt/test-utils/e2e";
import type { Page } from "playwright-core";
import { afterAll, describe, expect, it } from "vitest";

/*
 * The real Nuxt path: production build → SSR HTML → client hydration in
 * Chromium → client-side navigation, all through the module's auto-imported
 * shims. fancy-ui-vue's own suite already covers per-component SSR
 * determinism and jsdom hydration; this file proves the integration.
 */

const rootDir = fileURLToPath(new URL("./fixtures/ssr", import.meta.url));

/**
 * Software GL so the contained FluidCursor gets a WebGL context headless
 * (same flags as examples/consumers/playwright.shared.ts). CHROMIUM_EXECUTABLE
 * points at another Chromium when playwright-core's pinned build is absent.
 */
const browserOptions = {
	type: "chromium" as const,
	launch: {
		args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
		...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
	},
};

interface Snapshot {
	/** rAF callbacks scheduled and not yet run/cancelled: one per running loop. */
	raf: number;
	/** WebGL contexts whose canvas is in the DOM and not lost. */
	glLive: number;
	/** WebGL contexts whose canvas left the DOM without the context being lost. */
	glLeaked: number;
	/** Every WebGL/WebGPU context ever handed out. */
	glCreated: number;
	webgpu: number;
	canvases: number;
	/** Live listeners on window / document / body, keyed "target:type". */
	listeners: Record<string, number>;
	/** Observers (Resize/Intersection/Mutation) with at least one observed target. */
	observers: Record<string, number>;
}

/**
 * Runs before any page script. Wraps the browser APIs a long-lived effect
 * holds on to, and keeps the live count of each in window.__probe. Strong
 * refs to canvases are fine: the page lives for one test.
 */
function instrument() {
	type Rec = { target: EventTarget; type: string; listener: unknown; capture: boolean };
	const w = window as unknown as Record<string, unknown>;
	const rafPending = new Set<number>();
	const contexts: { canvas: HTMLCanvasElement; kind: string; ctx: unknown }[] = [];
	const listeners: Rec[] = [];
	const observed = new Map<object, { kind: string; targets: Set<unknown> }>();

	const raf = window.requestAnimationFrame.bind(window);
	const caf = window.cancelAnimationFrame.bind(window);
	window.requestAnimationFrame = (cb) => {
		const id = raf((t) => {
			rafPending.delete(id);
			cb(t);
		});
		rafPending.add(id);
		return id;
	};
	window.cancelAnimationFrame = (id) => {
		rafPending.delete(id);
		caf(id);
	};

	const getContext = HTMLCanvasElement.prototype.getContext;
	HTMLCanvasElement.prototype.getContext = function (
		this: HTMLCanvasElement,
		kind: string,
		...rest: unknown[]
	) {
		const ctx = (getContext as (...a: unknown[]) => unknown).call(this, kind, ...rest);
		if (ctx && /webgl|webgpu/.test(kind) && !contexts.some((c) => c.ctx === ctx))
			contexts.push({ canvas: this, kind, ctx });
		return ctx;
	} as typeof HTMLCanvasElement.prototype.getContext;

	const tracked = (t: EventTarget) => t === window || t === document || t === document.body;
	const label = (t: EventTarget) =>
		t === window ? "window" : t === document ? "document" : "body";
	const captureOf = (o: unknown) =>
		typeof o === "boolean" ? o : !!(o as AddEventListenerOptions | undefined)?.capture;
	const add = EventTarget.prototype.addEventListener;
	const remove = EventTarget.prototype.removeEventListener;
	EventTarget.prototype.addEventListener = function (type, listener, options) {
		add.call(this, type, listener, options);
		const opts = typeof options === "object" ? options : undefined;
		// `once` listeners remove themselves invisibly: not tracked.
		if (!listener || !tracked(this) || opts?.once) return;
		const capture = captureOf(options);
		if (
			listeners.some(
				(r) =>
					r.target === this && r.type === type && r.listener === listener && r.capture === capture
			)
		)
			return;
		const rec: Rec = { target: this, type, listener, capture };
		listeners.push(rec);
		opts?.signal?.addEventListener("abort", () => {
			const i = listeners.indexOf(rec);
			if (i >= 0) listeners.splice(i, 1);
		});
	};
	EventTarget.prototype.removeEventListener = function (type, listener, options) {
		remove.call(this, type, listener, options);
		const capture = captureOf(options);
		const i = listeners.findIndex(
			(r) =>
				r.target === this && r.type === type && r.listener === listener && r.capture === capture
		);
		if (i >= 0) listeners.splice(i, 1);
	};

	for (const kind of ["ResizeObserver", "IntersectionObserver", "MutationObserver"] as const) {
		const proto = (window[kind] as unknown as { prototype: Record<string, unknown> }).prototype;
		const observe = proto.observe as (this: object, t: unknown, ...r: unknown[]) => void;
		const unobserve = proto.unobserve as ((this: object, t: unknown) => void) | undefined;
		const disconnect = proto.disconnect as (this: object) => void;
		proto.observe = function (this: object, t: unknown, ...r: unknown[]) {
			observe.call(this, t, ...r);
			const entry = observed.get(this) ?? { kind, targets: new Set() };
			entry.targets.add(t);
			observed.set(this, entry);
		};
		if (unobserve)
			proto.unobserve = function (this: object, t: unknown) {
				unobserve.call(this, t);
				observed.get(this)?.targets.delete(t);
			};
		proto.disconnect = function (this: object) {
			disconnect.call(this);
			observed.delete(this);
		};
	}

	w.__probe = (): Snapshot => {
		const gl = contexts.filter((c) => c.kind !== "webgpu");
		const lost = (c: (typeof gl)[number]) => (c.ctx as WebGLRenderingContext).isContextLost();
		const byKey: Record<string, number> = {};
		for (const r of listeners) {
			const k = `${label(r.target)}:${r.type}`;
			byKey[k] = (byKey[k] ?? 0) + 1;
		}
		const obs: Record<string, number> = {};
		for (const { kind, targets } of observed.values())
			if (targets.size) obs[kind] = (obs[kind] ?? 0) + 1;
		return {
			raf: rafPending.size,
			glLive: gl.filter((c) => c.canvas.isConnected && !lost(c)).length,
			glLeaked: gl.filter((c) => !c.canvas.isConnected && !lost(c)).length,
			glCreated: contexts.length,
			webgpu: contexts.length - gl.length,
			canvases: document.querySelectorAll("canvas").length,
			listeners: byKey,
			observers: obs,
		};
	};
}

type Collected = { errors: string[]; warnings: string[] };

/** A fresh instrumented page on `path`, collecting every console problem. */
async function open(path: string): Promise<{ page: Page; log: Collected }> {
	const page = (await createPage()) as unknown as Page;
	const log: Collected = { errors: [], warnings: [] };
	page.on("console", (m) => {
		if (m.type() === "error") log.errors.push(m.text());
		else if (m.type() === "warning") log.warnings.push(m.text());
	});
	page.on("pageerror", (e) => log.errors.push(`pageerror: ${e.message}`));
	await page.addInitScript(instrument);
	await page.goto(url(path));
	await waitHydrated(page);
	return { page, log };
}

async function waitHydrated(page: Page) {
	await page.waitForFunction(
		() =>
			document.documentElement.dataset.hydrated === "true" &&
			(window as unknown as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.()
				.isHydrating === false
	);
}

/** Settled snapshot: rAF pending is sampled a few times and the max kept. */
async function snapshot(page: Page): Promise<Snapshot> {
	await page.waitForTimeout(800);
	const probe = () => (window as unknown as { __probe: () => Snapshot }).__probe();
	const first = await page.evaluate(probe);
	let raf = first.raf;
	for (let i = 0; i < 5; i++) {
		await page.waitForTimeout(60);
		raf = Math.max(raf, (await page.evaluate(probe)).raf);
	}
	return { ...first, raf };
}

const hydrationProblems = (log: Collected) =>
	[...log.errors, ...log.warnings].filter((m) => /hydrat|mismatch/i.test(m));

/** Strips what legitimately differs between two renders of the same page. */
function normalise(html: string) {
	return html
		.replace(/<script[^>]*id="__NUXT_DATA__"[^>]*>[\s\S]*?<\/script>/g, "<payload>")
		.replace(/<script>window\.__NUXT__[\s\S]*?<\/script>/g, "<config>")
		.replace(/buildId:"[^"]*"/g, 'buildId:""')
		.replace(/\/_nuxt\/[\w.-]+/g, "/_nuxt/<asset>");
}

/**
 * The running animations under a BorderBeam host, sampled twice ~300 ms
 * apart inside the page (rAF-driven, so the samples sit on real frames).
 */
const beamProgress = (page: Page, testId: string) =>
	page.getByTestId(testId).evaluate(async (host) => {
		const running = () =>
			host
				.querySelector(".border-beam")!
				.getAnimations({ subtree: true })
				.filter((a) => a.playState === "running");
		const t0 = running().map((a) => Number(a.currentTime ?? 0));
		const start = performance.now();
		await new Promise<void>((done) => {
			const tick = () => (performance.now() - start > 300 ? done() : requestAnimationFrame(tick));
			requestAnimationFrame(tick);
		});
		const now = running();
		return {
			count: now.length,
			duration: Number(now[0]?.effect?.getComputedTiming().duration ?? 0),
			advanced: now.length > 0 && Number(now[0]!.currentTime ?? 0) !== t0[0],
		};
	});

/** Vue (3.4+) keeps an element's event invokers under a `_vei` symbol. */
const hasVueListeners = (el: Element) =>
	Object.getOwnPropertySymbols(el).some((s) => s.description === "_vei");

describe("SSR → hydration → navigation through the module", async () => {
	await setup({ rootDir, build: true, server: true, browser: true, browserOptions });

	const pages: Page[] = [];
	afterAll(async () => {
		await Promise.all(pages.map((p) => p.close()));
	});

	it("renders deterministic, non-empty SSR HTML for the fixture's components", async () => {
		const a = await $fetch<string>("/");
		const b = await $fetch<string>("/");
		expect(normalise(a)).toBe(normalise(b));

		// Real server markup, not ClientOnly placeholders.
		expect(a).toMatch(
			/<button[^>]*class="shimmer-button[^"]*"[^>]*data-testid="counter-btn"|data-testid="counter-btn"[^>]*class="shimmer-button/
		);
		expect(a.match(/class="border-beam /g)?.length).toBe(2);
		expect(a).toMatch(
			/data-testid="fluid"[^>]*>\s*<div[^>]*class="pointer-events-none absolute inset-0[^"]*"[^>]*>\s*<canvas/
		);
		expect(a.match(/class="meteor /g)?.length).toBe(12);
		// Below-the-fold lazy component is still server-rendered.
		expect(a).toMatch(/data-testid="lazy-btn"/);

		const other = await $fetch<string>("/other");
		expect(normalise(other)).toBe(normalise(await $fetch<string>("/other")));
		expect(other).toMatch(/class="number-ticker /);
		expect(other.match(/data-marquee-track/g)?.length).toBe(2);
	});

	it("hydrates, starts browser effects after mount, and keeps instances independent", async () => {
		const { page, log } = await open("/");
		pages.push(page);

		// FluidCursor's canvas belongs to WebGL once mounted: 2d is refused.
		await expect
			.poll(() =>
				page
					.getByTestId("fluid")
					.locator("canvas")
					.evaluate((c) => (c as HTMLCanvasElement).getContext("2d") === null)
			)
			.toBe(true);

		// Both beams run their own animation, at their own duration.
		const [a, b] = await Promise.all([beamProgress(page, "beam-a"), beamProgress(page, "beam-b")]);
		expect(a.count).toBeGreaterThan(0);
		expect(b.count).toBeGreaterThan(0);
		expect(a.advanced).toBe(true);
		expect(b.advanced).toBe(true);
		// Each instance keeps its own props (4 s vs 7 s cycle).
		expect(a.duration).toBe(4000);
		expect(b.duration).toBe(7000);

		// Hydrated event handlers: the fancy button drives page state.
		await page.getByTestId("counter-btn").click();
		await page.getByTestId("counter-btn").click();
		await expect.poll(() => page.getByTestId("count").textContent()).toBe("2");

		expect(hydrationProblems(log)).toEqual([]);
		expect(log.errors).toEqual([]);
	});

	it("releases rAF loops, GL contexts and listeners across client navigations", async () => {
		const { page, log } = await open("/");
		pages.push(page);
		const before = await snapshot(page);
		expect(before.glLive).toBe(1);

		const trail: Snapshot[] = [];
		let away: Snapshot | undefined;
		for (let i = 0; i < 3; i++) {
			await page.getByTestId("to-other").click();
			await page.getByTestId("other").waitFor();
			await expect.poll(() => page.getByTestId("ticker").textContent()).toMatch(/4,?242/);
			away ??= await snapshot(page);
			await page.getByTestId("to-index").click();
			await page.getByTestId("index").waitFor();
			trail.push(await snapshot(page));
		}
		const after = trail.at(-1)!;
		console.info("[ssr] probe before", JSON.stringify(before));
		console.info("[ssr] probe on /other", JSON.stringify(away));
		console.info("[ssr] probe after 3 round trips", JSON.stringify(after));

		// The probe sees teardown, not just stable numbers: on /other the
		// FluidCursor's context is lost and its body listeners are gone.
		expect(away!.glLive).toBe(0);
		expect(away!.glLeaked).toBe(0);
		expect(away!.listeners["body:mousemove"]).toBeUndefined();

		// Client navigation, not reloads: the page component mounted 4 times in
		// one document (useState survives only without a reload).
		expect(await page.getByTestId("index").getAttribute("data-mounts")).toBe("4");
		// Components re-render and re-start after remount.
		await expect
			.poll(() =>
				page
					.getByTestId("fluid")
					.locator("canvas")
					.evaluate((c) => (c as HTMLCanvasElement).getContext("2d") === null)
			)
			.toBe(true);
		expect((await beamProgress(page, "beam-a")).advanced).toBe(true);
		expect(await page.locator(".meteor").count()).toBe(12);
		await page.getByTestId("counter-btn").click();
		await expect.poll(() => page.getByTestId("count").textContent()).toBe("1");

		// Nothing accumulates: same page, same resources.
		expect(after.glLive).toBe(before.glLive);
		expect(after.glLeaked).toBe(0);
		expect(after.glCreated).toBe(before.glCreated + 3);
		expect(after.canvases).toBe(before.canvases);
		expect(after.raf).toBeLessThanOrEqual(before.raf);
		expect(after.listeners).toEqual(before.listeners);
		// Observers may only shrink: on the first load the hydrate-on-visible
		// wrapper adds an IntersectionObserver that a client-side remount never
		// needs (a Lazy component rendered after navigation is not hydrated).
		for (const [kind, n] of Object.entries(after.observers))
			expect(n, kind).toBeLessThanOrEqual(before.observers[kind] ?? 0);

		expect(hydrationProblems(log)).toEqual([]);
		expect(log.errors).toEqual([]);
	});

	it("hydrates a below-the-fold Lazy component only when it becomes visible", async () => {
		const { page, log } = await open("/");
		pages.push(page);

		const lazy = page.getByTestId("lazy-btn");
		// SSR markup present before hydration; Vue has not bound its listeners yet.
		expect(await lazy.count()).toBe(1);
		expect(await lazy.getAttribute("class")).toMatch(/shimmer-button/);
		const bound = () => lazy.evaluate(hasVueListeners);
		expect(await bound()).toBe(false);

		await lazy.scrollIntoViewIfNeeded();
		await expect.poll(bound).toBe(true);
		await lazy.click();
		await expect.poll(() => page.getByTestId("lazy-count").textContent()).toBe("1");

		expect(hydrationProblems(log)).toEqual([]);
		expect(log.errors).toEqual([]);
	});
});
