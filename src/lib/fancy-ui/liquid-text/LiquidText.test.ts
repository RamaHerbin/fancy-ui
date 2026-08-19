import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import LiquidText from "./LiquidText.svelte";

/**
 * Ambient test environment (see src/test-setup.ts) already stubs:
 *   - HTMLCanvasElement.prototype.getContext -> null   (WebGL "unavailable")
 *   - window.matchMedia                       -> { matches: false, ... }
 *   - ResizeObserver / IntersectionObserver    -> no-op classes
 *
 * Per the frozen LiquidText contract, "no WebGL" and "no reduced-motion
 * preference" both drive the component into its DOM-fallback path. Tests
 * below that specifically target the fallback/no-WebGL/reduced-motion
 * behavior re-assert these overrides explicitly (mirroring the ambient
 * default) so intent is self-documenting and independent of test-setup.ts.
 */

describe("LiquidText", () => {
	afterEach(cleanup);

	describe("accessible text node", () => {
		it("renders the text prop as a real text node in the DOM", () => {
			render(LiquidText, { props: { text: "Hello Liquid" } });
			const textNode = screen.getByText("Hello Liquid");
			expect(textNode).toBeInTheDocument();
			// The contract only requires the *canvas* to be aria-hidden; the
			// real text node itself must stay in the accessibility tree,
			// whether it is the sr-only span (canvas active) or the visible
			// fallback text.
			expect(textNode.getAttribute("aria-hidden")).not.toBe("true");
		});

		it('falls back to the default text "Liquid" when no text prop is passed', () => {
			render(LiquidText);
			expect(screen.getByText("Liquid")).toBeInTheDocument();
		});

		it("marks the canvas aria-hidden when a canvas is rendered", () => {
			const { container } = render(LiquidText, { props: { text: "Canvas Check" } });
			const canvas = container.querySelector("canvas");
			// The contract does not pin down whether <canvas> is always present
			// in the markup or only mounted on the interactive/WebGL path, so
			// this only asserts when one is actually found.
			if (canvas) {
				expect(canvas.getAttribute("aria-hidden")).toBe("true");
			}
		});
	});

	describe("WebGL unavailable fallback", () => {
		it("renders visible styled fallback text, starts no rAF render loop, and logs no console errors", () => {
			const originalGetContext = HTMLCanvasElement.prototype.getContext;
			HTMLCanvasElement.prototype.getContext = (() =>
				null) as typeof HTMLCanvasElement.prototype.getContext;

			const rafSpy = vi.spyOn(window, "requestAnimationFrame");
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			render(LiquidText, {
				props: {
					text: "No WebGL",
					font: "Georgia, serif",
					fontSize: 48,
					fontWeight: 600,
					lightColor: "#123456",
				},
			});

			const textNode = screen.getByText("No WebGL");
			expect(textNode).toBeInTheDocument();
			// Per contract: "visible styled text in fallback modes", as opposed
			// to the sr-only span used when the canvas is actively driven. It
			// must actually carry the prop-driven font/size/color styling, not
			// just be present and unstyled.
			expect(textNode.className).not.toContain("sr-only");
			expect(textNode.style.fontFamily).toBe("Georgia, serif");
			expect(textNode.style.fontSize).toBe("48px");
			expect(textNode.style.fontWeight).toBe("600");
			expect(textNode.style.color).toBe("rgb(18, 52, 86)");
			expect(rafSpy).not.toHaveBeenCalled();
			expect(errorSpy).not.toHaveBeenCalled();

			rafSpy.mockRestore();
			errorSpy.mockRestore();
			HTMLCanvasElement.prototype.getContext = originalGetContext;
		});
	});

	describe("prefers-reduced-motion fallback", () => {
		it("renders static fallback text and starts no rAF render loop when reduced motion is preferred", () => {
			const originalMatchMedia = window.matchMedia;
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: (query: string) => ({
					matches: query.includes("prefers-reduced-motion"),
					media: query,
					onchange: null,
					addEventListener: () => {},
					removeEventListener: () => {},
					dispatchEvent: () => false,
					addListener: () => {},
					removeListener: () => {},
				}),
			});

			const rafSpy = vi.spyOn(window, "requestAnimationFrame");
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			render(LiquidText, {
				props: {
					text: "Reduced Motion",
					font: "Georgia, serif",
					fontSize: 32,
					fontWeight: 500,
					lightColor: "#654321",
				},
			});

			const textNode = screen.getByText("Reduced Motion");
			expect(textNode).toBeInTheDocument();
			expect(textNode.className).not.toContain("sr-only");
			// Same requirement as the no-WebGL fallback: styled per the props,
			// not just present.
			expect(textNode.style.fontFamily).toBe("Georgia, serif");
			expect(textNode.style.fontSize).toBe("32px");
			expect(textNode.style.fontWeight).toBe("500");
			expect(textNode.style.color).toBe("rgb(101, 67, 33)");
			expect(rafSpy).not.toHaveBeenCalled();
			expect(errorSpy).not.toHaveBeenCalled();

			rafSpy.mockRestore();
			errorSpy.mockRestore();
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: originalMatchMedia,
			});
		});
	});

	describe("cleanup on repeated mount/unmount", () => {
		it("leaves window/document/body listener counts balanced and no dangling rAF after 5 mount/unmount cycles", () => {
			const targets = [window, document, document.body] as const;
			const addSpies = targets.map((t) => vi.spyOn(t, "addEventListener"));
			const removeSpies = targets.map((t) => vi.spyOn(t, "removeEventListener"));

			let nextRafId = 1;
			const pendingRafIds = new Set<number>();
			const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => {
				const id = nextRafId++;
				pendingRafIds.add(id);
				return id;
			});
			const cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id: number) => {
				pendingRafIds.delete(id);
			});

			for (let i = 0; i < 5; i++) {
				const { unmount } = render(LiquidText, { props: { text: `pass-${i}` } });
				unmount();
			}

			// Per-event-name balance on each target: every addEventListener("x", …)
			// must be matched by a removeEventListener("x", …) across the 5
			// mount/unmount cycles. Checking per event name (not just raw totals)
			// catches leaks that would otherwise cancel out coincidentally.
			targets.forEach((_, i) => {
				const counts = new Map<string, number>();
				for (const call of addSpies[i].mock.calls) {
					const name = call[0] as string;
					counts.set(name, (counts.get(name) ?? 0) + 1);
				}
				for (const call of removeSpies[i].mock.calls) {
					const name = call[0] as string;
					counts.set(name, (counts.get(name) ?? 0) - 1);
				}
				for (const [eventName, balance] of counts) {
					expect(balance, `"${eventName}" listener leak on target #${i}`).toBe(0);
				}
			});

			expect(pendingRafIds.size).toBe(0);

			addSpies.forEach((s) => s.mockRestore());
			removeSpies.forEach((s) => s.mockRestore());
			rafSpy.mockRestore();
			cafSpy.mockRestore();
		});
	});

	describe("class prop", () => {
		it("applies the class prop to the root element", () => {
			const { container } = render(LiquidText, { props: { class: "my-liquid-class" } });
			const root = container.firstElementChild as HTMLElement;
			expect(root.className).toContain("my-liquid-class");
		});

		it("still renders a root element with the default empty class", () => {
			const { container } = render(LiquidText);
			expect(container.firstElementChild).toBeInTheDocument();
		});
	});

	describe("prop defaults and full prop surface (smoke)", () => {
		it("mounts without error using only defaults", () => {
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const { container } = render(LiquidText);

			expect(container.firstElementChild).toBeInTheDocument();
			expect(screen.getByText("Liquid")).toBeInTheDocument();
			expect(errorSpy).not.toHaveBeenCalled();

			errorSpy.mockRestore();
		});

		it("mounts without error with every documented prop explicitly set", () => {
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const { container } = render(LiquidText, {
				props: {
					text: "Smoke Test",
					font: "Arial, sans-serif",
					fontSize: 96,
					fontWeight: 800,
					lightColor: "#111111",
					darkColor: "#eeeeee",
					class: "smoke-root",
					strength: 0.75,
					radius: 220,
					forceGain: 24,
					dissipation: 0.95,
					viscosity: 6,
					chromaticRatio: 0.35,
					staticBelow: 768,
					interactive: false,
					pauseWhenHidden: false,
				},
			});

			expect(container.firstElementChild).toBeInTheDocument();
			expect(screen.getByText("Smoke Test")).toBeInTheDocument();
			expect(errorSpy).not.toHaveBeenCalled();

			errorSpy.mockRestore();
		});
	});
});
