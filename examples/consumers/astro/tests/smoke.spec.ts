import { expect, test, type Page } from "@playwright/test";
import {
	expectBorderBeamRunning,
	expectGpuCanvas,
	expectKeyboardDialog,
	expectPrimaryBackground,
} from "../../smoke-helpers";

// fancy-ui-svelte installed from the packed tarball into an Astro app built
// with `astro build` and served by `astro preview`, outside the repo.

/**
 * Console errors, uncaught exceptions and Svelte hydration mismatches (a
 * warning, not an error, so collectErrors would miss it). The only console
 * output tolerated is the library's known THREE.Clock deprecation warning,
 * which is a warning and therefore never collected here anyway.
 */
function collectProblems(page: Page): string[] {
	const problems: string[] = [];
	page.on("console", (m) => {
		const text = m.text();
		if (m.type() === "error") problems.push(text);
		else if (/hydration_mismatch|Too many active WebGL contexts/.test(text)) problems.push(text);
	});
	page.on("pageerror", (e) => problems.push(String(e)));
	return problems;
}

/** Records a measurement in the report and prints it in the run log. */
function note(type: string, description: string) {
	test.info().annotations.push({ type, description });
	console.log(`${type}: ${description}`);
}

/** Every script the page downloads, with its size and body. */
function collectScripts(page: Page) {
	const scripts: { url: string; bytes: number; body: string }[] = [];
	page.on("response", async (res) => {
		const url = res.url();
		if (res.request().resourceType() !== "script" && !url.endsWith(".js")) return;
		const body = await res.text().catch(() => "");
		scripts.push({ url, bytes: Buffer.byteLength(body), body });
	});
	return scripts;
}

const island = (page: Page, testId: string) =>
	page.locator("astro-island").filter({ has: page.getByTestId(testId) });

async function expectHydrated(page: Page, testId: string) {
	await expect(island(page, testId)).not.toHaveAttribute("ssr");
}

test("playground: static parts render, islands hydrate and run, styles resolve", async ({
	page,
}) => {
	const problems = collectProblems(page);
	const scripts = collectScripts(page);
	await page.goto("/");

	// Islands with client:load hydrate; the client:visible one below the fold waits.
	await expectHydrated(page, "rainbow");
	await expectHydrated(page, "dialog-events");
	await expect(island(page, "fluid")).toHaveAttribute("ssr");

	// The default slot crossed into the island as `children`; the handler lives in the island.
	await expect(page.getByTestId("rainbow").getByRole("button")).toHaveText("Rainbow");
	await page.getByTestId("rainbow").getByRole("button").click();
	await expect(page.getByTestId("rainbow-clicks")).toHaveText("clicks: 1");

	// The Installation page's island snippet, verbatim (client:visible: scroll to it).
	await page.getByTestId("counter").scrollIntoViewIfNeeded();
	await expect(page.getByTestId("counter").locator("astro-island")).not.toHaveAttribute("ssr");
	const counter = page.getByTestId("counter").getByRole("button");
	await expect(counter).toHaveText("Clicked 0 times");
	await counter.click();
	await expect(counter).toHaveText("Clicked 1 times");

	// Snippet + callback written in the wrapper.
	await expectKeyboardDialog(page, "Open dialog");
	await expect(page.getByTestId("dialog-events")).toHaveText("dialog events: true,false");

	// Tailwind tokens and the components' own CSS reach the static markup.
	await expectPrimaryBackground(page, '[data-testid="button"]');
	await expectBorderBeamRunning(page);

	// Scrolling hydrates the client:visible island, which binds a GPU context.
	await page.getByTestId("fluid").scrollIntoViewIfNeeded();
	await expectHydrated(page, "fluid");
	await expectGpuCanvas(page, "fluid");

	// Each island loads its own wrapper chunk, never the package's root module:
	// hydrating `import { X } from "fancy-ui-svelte"` from .astro would ship the
	// whole library (three.js and gsap included) to the browser.
	const urls = await page
		.locator("astro-island")
		.evaluateAll((els) => els.map((el) => el.getAttribute("component-url") ?? ""));
	expect(urls).toHaveLength(4);
	for (const url of urls)
		expect(url).toMatch(/\/_astro\/(RainbowCounter|DialogIsland|Counter|FluidIsland)\./);

	// JavaScript budget for the page's four islands, and no three.js / gsap in it.
	await page.waitForLoadState("networkidle");
	const total = scripts.reduce((sum, s) => sum + s.bytes, 0);
	note(
		"js",
		`${total} B in ${scripts.length} scripts: ${scripts
			.map((s) => `${s.url.split("/").pop()} ${s.bytes}`)
			.join(", ")}`
	);
	expect(total).toBeLessThan(250_000);
	for (const s of scripts) {
		expect(s.body, `${s.url} bundles three.js`).not.toContain("WebGLRenderer");
		expect(s.body, `${s.url} bundles gsap`).not.toContain("GreenSock");
	}

	expect(problems).toEqual([]);
});

test("a page without client directives loads no JavaScript, its CSS effects still run", async ({
	page,
}) => {
	const problems = collectProblems(page);
	const scripts: string[] = [];
	page.on("request", (req) => {
		if (req.resourceType() === "script") scripts.push(req.url());
	});
	await page.goto("/static");
	await page.waitForLoadState("networkidle");

	expect(scripts).toEqual([]);
	await expect(page.locator("script")).toHaveCount(0);
	await expect(page.locator("astro-island")).toHaveCount(0);

	await expectPrimaryBackground(page, '[data-testid="button"]');
	await expectBorderBeamRunning(page);
	await expect(page.getByTestId("hero").locator(".border-beam")).toHaveCount(1);
	const meteor = page.getByTestId("meteors").locator(".meteor").first();
	await expect(meteor).toBeAttached();
	expect(await meteor.evaluate((el) => getComputedStyle(el).animationName)).not.toBe("none");
	const marquee = page.locator(".animate-marquee").first();
	expect(await marquee.evaluate((el) => getComputedStyle(el).animationName)).not.toBe("none");

	expect(problems).toEqual([]);
});

test("several instances keep their own state and canvas, and survive a resize", async ({
	page,
}) => {
	const problems = collectProblems(page);
	await page.setViewportSize({ width: 1280, height: 1600 });
	await page.goto("/multi");

	await expectHydrated(page, "rainbow-1");
	await expectHydrated(page, "rainbow-2");
	const first = page.getByTestId("rainbow-1");
	const second = page.getByTestId("rainbow-2");
	await first.getByRole("button").click();
	await first.getByRole("button").click();
	await second.getByRole("button").click();
	await expect(page.getByTestId("rainbow-1-clicks")).toHaveText("clicks: 2");
	await expect(page.getByTestId("rainbow-2-clicks")).toHaveText("clicks: 1");

	await expectHydrated(page, "fluid-1");
	await expectHydrated(page, "fluid-2");
	await expectGpuCanvas(page, "fluid-1");
	await expectGpuCanvas(page, "fluid-2");

	// Two seeds, two different fields.
	const field = (id: string) => page.getByTestId(id).innerHTML();
	expect(await field("meteors-1")).not.toBe(await field("meteors-2"));

	const canvasWidth = () =>
		page
			.getByTestId("fluid-1")
			.locator("canvas")
			.evaluate((c) => (c as HTMLCanvasElement).width);
	const wide = await canvasWidth();
	await page.setViewportSize({ width: 390, height: 1600 });
	await expect.poll(canvasWidth).toBeLessThan(wide);
	await page.setViewportSize({ width: 1280, height: 1600 });
	await expect.poll(canvasWidth).toBe(wide);

	expect(problems).toEqual([]);
});

test("reduced motion: CSS effects park, the fluid effect starts no GPU engine", async ({
	page,
}) => {
	const problems = collectProblems(page);
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/");

	const headAnimation = await page
		.locator(".border-beam .bb-head")
		.first()
		.evaluate((el) => getComputedStyle(el).animationName);
	expect(headAnimation).toBe("none");
	const meteor = page.getByTestId("meteors").locator(".meteor").first();
	expect(await meteor.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");

	// Still interactive.
	await expectHydrated(page, "rainbow");
	await page.getByTestId("rainbow").getByRole("button").click();
	await expect(page.getByTestId("rainbow-clicks")).toHaveText("clicks: 1");

	// Hydrated, but no WebGL/WebGPU context owns the canvas.
	await page.getByTestId("fluid").scrollIntoViewIfNeeded();
	await expectHydrated(page, "fluid");
	const canvas = page.getByTestId("fluid").locator("canvas");
	await expect(canvas).toHaveCount(1);
	expect(await canvas.evaluate((c) => (c as HTMLCanvasElement).getContext("2d") !== null)).toBe(
		true
	);

	expect(problems).toEqual([]);
});

type Probe = {
	raf: number;
	kinds: Record<string, number>;
	gpuCreated: () => number;
	gpuLive: () => number;
};
type Life = { mounts: Record<string, number>; destroys: Record<string, number> };

test("ClientRouter: islands unmount on navigation, nothing accumulates, persist keeps state", async ({
	page,
}) => {
	const problems = collectProblems(page);
	const probe = () =>
		page.evaluate(() => {
			const p = (window as unknown as { __probe: Probe }).__probe;
			return { raf: p.raf, kinds: p.kinds, created: p.gpuCreated(), live: p.gpuLive() };
		});
	const life = () => page.evaluate(() => (window as unknown as { __fancyLife: Life }).__fancyLife);
	// requestAnimationFrame calls during one second, the page left alone.
	const rafPerSecond = async () => {
		const before = (await probe()).raf;
		await page.waitForTimeout(1000);
		return (await probe()).raf - before;
	};
	const onPage = async (name: "A" | "B") => {
		await expect(page.getByTestId("page")).toHaveText(`Page ${name}`);
		const fluid = name === "A" ? "fluid-a" : "fluid-b";
		await expectHydrated(page, fluid);
		await expectGpuCanvas(page, fluid);
	};

	await page.goto("/router/a");
	await onPage("A");
	await expectHydrated(page, "persisted");
	await page.getByTestId("persisted").getByRole("button").click();
	await expect(page.getByTestId("persisted-clicks")).toHaveText("clicks: 1");
	await page.getByTestId("fluid-a").hover();

	const rounds = 3;
	const rates: number[] = [await rafPerSecond()];
	for (let i = 0; i < rounds; i++) {
		await page.getByTestId("to-b").click();
		await onPage("B");
		await page.getByTestId("to-a").click();
		await onPage("A");
		rates.push(await rafPerSecond());
	}
	note("raf/s", rates.join(", "));

	// Navigations went through the router, not full reloads: the probe saw every page.
	const gpu = await probe();
	note("gpu", `created ${gpu.created}, live ${gpu.live}, ${JSON.stringify(gpu.kinds)}`);

	const { mounts, destroys } = await life();
	// Page A mounted 1 + rounds times, B rounds times; each one left was destroyed.
	expect(mounts["fluid:fluid-a"]).toBe(rounds + 1);
	expect(destroys["fluid:fluid-a"] ?? 0).toBe(rounds);
	expect(mounts["fluid:fluid-b"]).toBe(rounds);
	expect(destroys["fluid:fluid-b"]).toBe(rounds);
	expect(mounts["rainbow:rainbow-a"]).toBe(rounds + 1);
	expect(destroys["rainbow:rainbow-a"] ?? 0).toBe(rounds);

	// transition:persist: one mount for the whole session, its state intact.
	expect(mounts["rainbow:persisted"]).toBe(1);
	expect(destroys["rainbow:persisted"] ?? 0).toBe(0);
	await expect(page.getByTestId("persisted-clicks")).toHaveText("clicks: 1");

	// One live effect after 2 × rounds navigations: render loops do not stack...
	const [first, ...later] = rates;
	for (const rate of later) expect(rate).toBeLessThanOrEqual(first * 1.5 + 30);
	// ...and every WebGL context but the current page's was released.
	expect(gpu.created).toBe(2 * rounds + 1);
	if (!gpu.kinds.webgpu) expect(gpu.live).toBe(1);
	await expect(page.locator("canvas")).toHaveCount(1);

	expect(problems).toEqual([]);
});
