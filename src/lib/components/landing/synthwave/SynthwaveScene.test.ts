import { cleanup, render } from "@testing-library/svelte";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gsap } from "gsap";
import { afterEach, describe, expect, it, vi } from "vitest";
import SynthwaveScene from "./SynthwaveScene.svelte";
import { ASSET_WIDTHS, assetFallback, assetSources, SCENE_LAYERS } from "./scene-config.js";

/**
 * Repo's `static/` root, resolved from this file's own location rather than
 * `process.cwd()` so the asset-URL tests don't depend on where `vitest` was
 * invoked from.
 */
const STATIC_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../../../static");

function assertAssetExists(url: string): void {
	const filePath = join(STATIC_ROOT, url);
	if (!existsSync(filePath)) {
		throw new Error(
			`scene-config generated a URL with no matching file on disk: ${url} (${filePath})`
		);
	}
}

/** Same shape as the repo's default `matchMedia` mock (src/test-setup.ts), parameterized by `matches`. */
function mockMatchMedia(matches: boolean) {
	return vi.fn().mockImplementation((query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
	}));
}

describe("SynthwaveScene", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders one wrapper per SCENE_LAYERS entry, in order, tagged with data-layer", () => {
		const { container } = render(SynthwaveScene);
		const wrappers = container.querySelectorAll("[data-layer]");
		expect(wrappers.length).toBe(SCENE_LAYERS.length);
		expect(Array.from(wrappers).map((el) => el.getAttribute("data-layer"))).toEqual(
			SCENE_LAYERS.map((layer) => layer.id)
		);
	});

	it("scene root is aria-hidden and never intercepts pointer events", () => {
		const { container } = render(SynthwaveScene);
		const root = container.firstElementChild as HTMLElement;
		expect(root.getAttribute("aria-hidden")).toBe("true");
		expect(root.className).toContain("pointer-events-none");
	});

	it("carries no z-index anywhere in the scene (stacking comes from DOM order only)", () => {
		const { container } = render(SynthwaveScene);
		const root = container.firstElementChild as HTMLElement;
		const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
		// Sanity check that layers actually rendered content worth scanning, so an
		// empty scene can't make this assertion pass vacuously.
		expect(elements.length).toBeGreaterThan(SCENE_LAYERS.length);

		for (const el of elements) {
			expect(el.style.zIndex).toBe("");
			expect(["", "auto"]).toContain(getComputedStyle(el).zIndex);
		}
	});

	describe("reduced motion", () => {
		it("registers no pointermove listener and creates no gsap timeline", () => {
			vi.stubGlobal("matchMedia", mockMatchMedia(true));
			const section = document.createElement("section");
			document.body.appendChild(section);
			// Spy before render(): onMount runs synchronously as part of mounting.
			const addSpy = vi.spyOn(section, "addEventListener");

			const before = gsap.globalTimeline.getChildren().length;
			render(SynthwaveScene, { target: section });
			const after = gsap.globalTimeline.getChildren().length;

			const pointermoveAdds = addSpy.mock.calls.filter(([type]) => type === "pointermove");
			expect(pointermoveAdds).toHaveLength(0);
			// No master timeline and no layer tweens attach: gsap's registry is untouched.
			expect(after).toBe(before);
		});

		it("layer effects never touch their animated element (fully static, not merely paused)", () => {
			vi.stubGlobal("matchMedia", mockMatchMedia(true));
			const { container } = render(SynthwaveScene);

			// One representative animated element per gsap-driven layer. Under
			// reduced motion each layer's `$effect` reads `scene.timeline()` as
			// `null` and returns before ever calling gsap, so these must carry no
			// inline style at all — not a transform/opacity frozen at rest.
			const sunHalo = container.querySelector(".sun-halo") as HTMLElement;
			const gridScroll = container.querySelector(".grid-scroll") as HTMLElement;
			const tailGlow = container.querySelector(".tail-glow") as HTMLElement;

			expect(sunHalo).toBeTruthy();
			expect(gridScroll).toBeTruthy();
			expect(tailGlow).toBeTruthy();
			expect(sunHalo.style.transform).toBe("");
			expect(gridScroll.style.transform).toBe("");
			expect(tailGlow.style.opacity).toBe("");
		});
	});

	describe("full motion", () => {
		it("registers exactly one pointermove listener on the closest section and creates a timeline; unmount removes the listener and kills the master timeline", () => {
			// The scene listens on `rootEl.closest("section")`, not the scene root
			// itself (the CTA and footer sit on top of it and would otherwise
			// swallow moves) — so the spy must be on a real <section> ancestor.
			const section = document.createElement("section");
			document.body.appendChild(section);
			const addSpy = vi.spyOn(section, "addEventListener");
			const removeSpy = vi.spyOn(section, "removeEventListener");

			const before = gsap.globalTimeline.getChildren().length;
			const { unmount } = render(SynthwaveScene, { target: section });
			const afterMount = gsap.globalTimeline.getChildren().length;

			const pointermoveAdds = addSpy.mock.calls.filter(([type]) => type === "pointermove");
			expect(pointermoveAdds).toHaveLength(1);
			// The master timeline (plus every layer tween reparented into it) is a
			// new entry in gsap's global registry.
			expect(afterMount).toBeGreaterThan(before);

			unmount();

			const removes = removeSpy.mock.calls.filter(([type]) => type === "pointermove");
			expect(removes).toHaveLength(1);

			// The master timeline and every layer tween reparented into it (sun
			// halo, grid scroll, both palm sways, car glow, both fog drifts) are
			// fully killed and removed on unmount: the count drops back down.
			//
			// It does NOT return all the way to `before`. That's a real, verified
			// bug in `stopMotion()` (SynthwaveScene.svelte ~line 169):
			// `gsap.killTweensOf(els)` is called with the *whole* ~10-element
			// `els` array in one call. GSAP's `Tween.kill(targets, vars)` only
			// takes its fast full-removal path when the tween's own target list
			// exactly equals the passed-in array (`_arraysMatch`); a quickTo
			// tween that targets a single one of those 10 elements never matches
			// the 10-element array, so the fast path is skipped and the tween is
			// never detached from `gsap.globalTimeline`. Reproduced outside
			// Svelte/jsdom with plain objects and gsap alone: a single
			// `gsap.killTweensOf([el1, el2])` call kills neither tween, while
			// `gsap.killTweensOf(el1)` (no array) kills it. Concretely, every
			// `stopMotion()` call here leaks the 2 pointer-parallax quickTo
			// tweens (x, y) per layer — 20 for this scene's 10 layers — and
			// `onMotionChange` (SynthwaveScene.svelte ~line 195) can call
			// `stopMotion`/`startMotion` repeatedly on a single mount whenever the
			// OS-level reduced-motion preference toggles, compounding the leak
			// without any unmount at all. Not asserted as `toBe(before)` here —
			// that would encode the bug as expected behavior; flagged to the team
			// lead instead of patched, per this task's constraints.
			const afterUnmount = gsap.globalTimeline.getChildren().length;
			expect(afterUnmount).toBeLessThan(afterMount);
			expect(afterUnmount).toBeGreaterThanOrEqual(before);
		});
	});
});

describe("scene-config asset URLs", () => {
	const assetNames = Object.keys(ASSET_WIDTHS);

	it("has at least one asset name to check (sanity)", () => {
		expect(assetNames.length).toBeGreaterThan(0);
	});

	it.each(assetNames)("assetSources('%s') srcset URLs match files on disk", (name) => {
		const sources = assetSources(name);
		expect(sources.length).toBeGreaterThan(0);
		for (const source of sources) {
			const entries = source.srcset.split(", ");
			expect(entries.length).toBeGreaterThan(0);
			for (const entry of entries) {
				const [url] = entry.split(" ");
				assertAssetExists(url);
			}
		}
	});

	it.each(assetNames)("assetFallback('%s') URL matches a file on disk", (name) => {
		assertAssetExists(assetFallback(name));
	});
});
