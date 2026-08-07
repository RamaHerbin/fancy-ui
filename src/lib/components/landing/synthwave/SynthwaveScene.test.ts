import { cleanup, render } from "@testing-library/svelte";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gsap } from "gsap";
import { afterEach, describe, expect, it, vi } from "vitest";
import SynthwaveScene from "./SynthwaveScene.svelte";
import { ASSET_WIDTHS, assetFallback, assetSources } from "./backdrop-config.js";

/** The scene's single backdrop asset name — also the root's `data-backdrop` tag. */
const BACKDROP_NAME = "neon-horizon-drive";

/** The one media query the mobile `<source>`s must carry, byte for byte. */
const MOBILE_MEDIA = "(max-width: 639px)";

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
			`backdrop-config generated a URL with no matching file on disk: ${url} (${filePath})`
		);
	}
}

/** Every URL mentioned in a `srcset` string ("url 1280w, url 768w"). */
function srcsetUrls(srcset: string): string[] {
	return srcset
		.split(",")
		.map((entry) => entry.trim().split(/\s+/)[0])
		.filter((url) => url.length > 0);
}

function renderScene() {
	const { container, unmount } = render(SynthwaveScene);
	const root = container.querySelector<HTMLElement>(`[data-backdrop="${BACKDROP_NAME}"]`);
	if (!root) {
		throw new Error(`scene root [data-backdrop="${BACKDROP_NAME}"] not found`);
	}
	return { container, root, unmount };
}

/** Every element the scene renders — the panorama AND its glow sibling. */
function sceneElements(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>("*"));
}

describe("SynthwaveScene", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("root is tagged data-backdrop, hidden from AT, and never intercepts pointer events", () => {
		const { root } = renderScene();
		expect(root.getAttribute("data-backdrop")).toBe(BACKDROP_NAME);
		expect(root.getAttribute("aria-hidden")).toBe("true");
		expect(root.className).toContain("pointer-events-none");
	});

	describe("picture structure", () => {
		it("renders exactly one <picture> with exactly one <img>", () => {
			const { root } = renderScene();
			expect(root.querySelectorAll("picture").length).toBe(1);
			expect(root.querySelectorAll("img").length).toBe(1);
		});

		it("desktop sources cover avif AND webp, and never reference mobile renditions", () => {
			const { root } = renderScene();
			const sources = Array.from(root.querySelectorAll("picture source"));
			const desktop = sources.filter((source) => !source.hasAttribute("media"));

			const types = desktop.map((source) => source.getAttribute("type"));
			expect(types).toContain("image/avif");
			expect(types).toContain("image/webp");

			for (const source of desktop) {
				const urls = srcsetUrls(source.getAttribute("srcset") ?? "");
				expect(urls.length).toBeGreaterThan(0);
				for (const url of urls) {
					expect(url).not.toContain("-mobile-");
				}
			}
		});

		it(`mobile sources carry media "${MOBILE_MEDIA}" exactly and reference only -mobile- renditions`, () => {
			const { root } = renderScene();
			const sources = Array.from(root.querySelectorAll("picture source"));
			const mobile = sources.filter((source) => source.hasAttribute("media"));
			expect(mobile.length).toBeGreaterThan(0);

			for (const source of mobile) {
				expect(source.getAttribute("media")).toBe(MOBILE_MEDIA);
				const urls = srcsetUrls(source.getAttribute("srcset") ?? "");
				expect(urls.length).toBeGreaterThan(0);
				for (const url of urls) {
					expect(url).toContain("-mobile-");
				}
			}
		});

		it("img is decorative, lazy, async-decoded, and dimensioned against layout shift", () => {
			const { root } = renderScene();
			const img = root.querySelector("img") as HTMLImageElement;
			expect(img).toBeTruthy();
			expect(img.getAttribute("alt")).toBe("");
			expect(img.getAttribute("loading")).toBe("lazy");
			expect(img.getAttribute("decoding")).toBe("async");
			expect(img.getAttribute("width")).toMatch(/^\d+$/);
			expect(img.getAttribute("height")).toMatch(/^\d+$/);
		});
	});

	it("renders a decorative glow sibling that is inert and hidden from AT", () => {
		// The glow is what melts the panorama's top edge behind the section
		// above it: a gradient, so it has no edge of its own to give away. It
		// sits outside the panorama's own box precisely because that box clips.
		const { container, root } = renderScene();
		const glow = container.querySelector<HTMLElement>("[data-backdrop-glow]");
		expect(glow).toBeTruthy();
		expect(glow!.getAttribute("aria-hidden")).toBe("true");
		expect(glow!.className).toContain("pointer-events-none");
		expect(glow!.contains(root)).toBe(false);
		expect(root.contains(glow!)).toBe(false);
	});

	it("carries no z-index anywhere in the scene (stacking comes from DOM order only)", () => {
		const { container } = renderScene();
		const elements = sceneElements(container);
		// Sanity floor so an empty scene can't make this assertion pass vacuously:
		// glow + root + picture + (avif/webp x desktop/mobile) sources + img > 5.
		expect(elements.length).toBeGreaterThan(5);

		for (const el of elements) {
			expect(el.style.zIndex).toBe("");
			expect(["", "auto"]).toContain(getComputedStyle(el).zIndex);
		}
	});

	describe("fully static", () => {
		it("never touches gsap: the global timeline is identical before mount and after unmount", () => {
			// gsap is imported by THIS test only — the scene subtree must not pull
			// it in, so mounting and unmounting leaves gsap's registry untouched.
			const before = gsap.globalTimeline.getChildren().length;
			const { unmount } = renderScene();
			const afterMount = gsap.globalTimeline.getChildren().length;
			unmount();
			const afterUnmount = gsap.globalTimeline.getChildren().length;

			expect(afterMount).toBe(before);
			expect(afterUnmount).toBe(before);
		});

		it("registers no pointermove listener anywhere", () => {
			// Spy before render(): onMount runs synchronously as part of mounting.
			// Prototype-level spy catches window, document, and every element.
			const addSpy = vi.spyOn(EventTarget.prototype, "addEventListener");
			renderScene();

			const pointermoveAdds = addSpy.mock.calls.filter(([type]) => type === "pointermove");
			expect(pointermoveAdds).toHaveLength(0);
		});

		it("no element in the subtree carries a style attribute", () => {
			const { container } = renderScene();
			const elements = sceneElements(container);
			expect(elements.length).toBeGreaterThan(5);

			for (const el of elements) {
				expect(el.hasAttribute("style")).toBe(false);
			}
		});
	});
});

describe("backdrop-config asset URLs", () => {
	const assetNames = Object.keys(ASSET_WIDTHS);

	it("has at least one asset name to check (sanity)", () => {
		expect(assetNames.length).toBeGreaterThan(0);
	});

	it.each(assetNames)("assetSources('%s') srcset URLs match files on disk", (name) => {
		const sources = assetSources(name);
		expect(sources.length).toBeGreaterThan(0);
		for (const source of sources) {
			const urls = srcsetUrls(source.srcset);
			expect(urls.length).toBeGreaterThan(0);
			for (const url of urls) {
				assertAssetExists(url);
			}
		}
	});

	it.each(assetNames)("assetFallback('%s') URL matches a file on disk", (name) => {
		assertAssetExists(assetFallback(name));
	});
});
