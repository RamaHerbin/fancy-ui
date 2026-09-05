import { render, screen, cleanup } from "@testing-library/react";
import { StrictMode, useEffect } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { LiquidText } from "./LiquidText.js";

/**
 * A minimal 2D context: enough for the auto-fit probe (`measureText`) and for
 * the text rasterizer that feeds the GL texture.
 */
function makeFake2dContext(): CanvasRenderingContext2D {
	return {
		font: "",
		fillStyle: "",
		textAlign: "",
		textBaseline: "",
		clearRect: () => {},
		fillText: () => {},
		measureText: () => ({ width: 100 }),
	} as unknown as CanvasRenderingContext2D;
}

/**
 * A fake WebGL2 context. Every ALL_CAPS property resolves to a stable unique
 * number (so the component's format/status comparisons behave like the real
 * enum space) and every other unknown property to a no-op function; only the
 * calls whose RETURN value steers the setup path are spelled out.
 *
 * `state.lost` models a context that has been killed with
 * WEBGL_lose_context — exactly like a real one, it then fails every resource
 * allocation and is never silently re-acquired.
 */
function makeFakeGl(state: { lost: boolean }): WebGL2RenderingContext {
	const constants = new Map<string, number>();
	let nextConstant = 0x1000;
	const constantFor = (name: string) => {
		let value = constants.get(name);
		if (value === undefined) {
			value = nextConstant++;
			constants.set(name, value);
		}
		return value;
	};
	const allocate = () => (state.lost ? null : {});
	const methods: Record<string, (...args: never[]) => unknown> = {
		getExtension: ((name: string) =>
			name === "WEBGL_lose_context"
				? {
						loseContext: () => {
							state.lost = true;
						},
						restoreContext: () => {
							state.lost = false;
						},
					}
				: { HALF_FLOAT_OES: constantFor("HALF_FLOAT_OES") }) as (...args: never[]) => unknown,
		isContextLost: () => state.lost,
		createTexture: allocate,
		createFramebuffer: allocate,
		createBuffer: allocate,
		createShader: allocate,
		createProgram: allocate,
		checkFramebufferStatus: () => constantFor("FRAMEBUFFER_COMPLETE"),
		getShaderParameter: () => true,
		getProgramParameter: ((_program: unknown, pname: number) =>
			pname === constantFor("ACTIVE_UNIFORMS") ? 0 : true) as (...args: never[]) => unknown,
		getShaderInfoLog: () => "",
		getProgramInfoLog: () => "",
		getActiveUniform: () => null,
		getUniformLocation: allocate,
	};
	return new Proxy(
		{},
		{
			get(_target, property) {
				if (typeof property !== "string") return undefined;
				if (property === "drawingBufferWidth" || property === "drawingBufferHeight") return 300;
				if (property in methods) return methods[property];
				if (/^[A-Z][A-Z0-9_]*$/.test(property)) return constantFor(property);
				return () => undefined;
			},
		}
	) as unknown as WebGL2RenderingContext;
}

/**
 * Replaces the ambient `getContext -> null` stub for the duration of one test.
 * `loseOnReacquire` models the real hazard: a context that comes back already
 * dead on the second acquisition.
 */
function installFakeCanvasContexts(options: { webgl?: boolean; loseOnReacquire?: boolean } = {}) {
	const { webgl = true, loseOnReacquire = false } = options;
	const original = HTMLCanvasElement.prototype.getContext;
	const state = { lost: false };
	const gl = makeFakeGl(state);
	const context2d = makeFake2dContext();
	let acquisitions = 0;
	HTMLCanvasElement.prototype.getContext = function getContext(contextId: string) {
		if (contextId === "2d") return context2d;
		if (!webgl || contextId !== "webgl2") return null;
		acquisitions += 1;
		if (loseOnReacquire && acquisitions > 1) state.lost = true;
		return gl;
	} as unknown as typeof HTMLCanvasElement.prototype.getContext;
	return {
		state,
		restore() {
			HTMLCanvasElement.prototype.getContext = original;
		},
	};
}

/** Tracks rAF ids that were requested and never cancelled. */
function installRafTracker() {
	let nextId = 1;
	const pending = new Set<number>();
	const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => {
		const id = nextId++;
		pending.add(id);
		return id;
	});
	const cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id: number) => {
		pending.delete(id);
	});
	return {
		pending,
		restore() {
			rafSpy.mockRestore();
			cafSpy.mockRestore();
		},
	};
}

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
			render(<LiquidText text="Hello Liquid" />);
			const textNode = screen.getByText("Hello Liquid");
			expect(textNode).toBeInTheDocument();
			// The contract only requires the *canvas* to be aria-hidden; the
			// real text node itself must stay in the accessibility tree,
			// whether it is the sr-only span (canvas active) or the visible
			// fallback text.
			expect(textNode.getAttribute("aria-hidden")).not.toBe("true");
		});

		it('falls back to the default text "Liquid" when no text prop is passed', () => {
			render(<LiquidText />);
			expect(screen.getByText("Liquid")).toBeInTheDocument();
		});

		it("marks the canvas aria-hidden when a canvas is rendered", () => {
			const { container } = render(<LiquidText text="Canvas Check" />);
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

			render(
				<LiquidText
					text="No WebGL"
					font="Georgia, serif"
					fontSize={48}
					fontWeight={600}
					lightColor="#123456"
				/>
			);

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

			render(
				<LiquidText
					text="Reduced Motion"
					font="Georgia, serif"
					fontSize={32}
					fontWeight={500}
					lightColor="#654321"
				/>
			);

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
			// Port addition: one throwaway mount/unmount BEFORE the spies go up.
			// react-dom attaches its delegated "selectionchange" listener to the
			// owner document the first time any root is created in this
			// document, and never removes it — a one-off that has nothing to do
			// with the component but would read as a leak on target #1. Doing it
			// here makes the balance check independent of this file's test
			// order.
			render(<LiquidText text="warmup" />).unmount();

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
				const { unmount } = render(<LiquidText text={`pass-${i}`} />);
				unmount();
			}

			// Per-event-name balance on each target: every addEventListener("x", …)
			// must be matched by a removeEventListener("x", …) across the 5
			// mount/unmount cycles. Checking per event name (not just raw totals)
			// catches leaks that would otherwise cancel out coincidentally.
			targets.forEach((_, i) => {
				const counts = new Map<string, number>();
				for (const call of addSpies[i]!.mock.calls) {
					const name = call[0] as string;
					counts.set(name, (counts.get(name) ?? 0) + 1);
				}
				for (const call of removeSpies[i]!.mock.calls) {
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

	describe("StrictMode double mount", () => {
		it("re-acquires the GL context on the second setup pass and leaves the sim running", () => {
			const canvasContexts = installFakeCanvasContexts();
			const raf = installRafTracker();

			try {
				const { container } = render(
					<StrictMode>
						<LiquidText text="Strict Canvas" staticBelow={0} />
					</StrictMode>
				);

				// setup -> cleanup -> setup on the SAME <canvas>: the cleanup must
				// not kill the context, or the second pass gets a dead one back and
				// the sim never starts (canvas mode, but nothing drawn).
				expect(canvasContexts.state.lost).toBe(false);
				const canvas = container.querySelector("canvas") as HTMLCanvasElement;
				expect(canvas.className).not.toContain("invisible");
				expect(screen.getByText("Strict Canvas").className).toContain("sr-only");
				// Exactly one live render loop: the first pass's was cancelled by its
				// cleanup, the second pass booted its own.
				expect(raf.pending.size).toBe(1);
			} finally {
				raf.restore();
				canvasContexts.restore();
			}
		});

		it("restores the visible static text when a re-acquired context is unusable", () => {
			const canvasContexts = installFakeCanvasContexts({ loseOnReacquire: true });
			const raf = installRafTracker();

			try {
				const { container } = render(
					<StrictMode>
						<LiquidText text="Strict Fallback" staticBelow={0} />
					</StrictMode>
				);

				// A failed (re-)acquisition must fall back to the visible static
				// text rather than stranding the promoted "canvas" mode, which
				// would leave an empty canvas and only the sr-only span.
				const textNode = screen.getByText("Strict Fallback");
				expect(textNode.className).not.toContain("sr-only");
				const canvas = container.querySelector("canvas") as HTMLCanvasElement;
				expect(canvas.className).toContain("invisible");
				expect(raf.pending.size).toBe(0);
			} finally {
				raf.restore();
				canvasContexts.restore();
			}
		});
	});

	describe("mount-time geometry", () => {
		it("auto-fits the font size before any passive effect runs", () => {
			const canvasContexts = installFakeCanvasContexts({ webgl: false });
			const passiveHadRun: boolean[] = [];
			let markerPassiveRan = false;

			Object.defineProperty(HTMLElement.prototype, "clientWidth", {
				configurable: true,
				get() {
					passiveHadRun.push(markerPassiveRan);
					return 400;
				},
			});

			function PassiveMarker() {
				useEffect(() => {
					markerPassiveRan = true;
				}, []);
				return null;
			}

			try {
				render(
					<>
						<PassiveMarker />
						<LiquidText text="Fit" />
					</>
				);

				// The fitted size drives the root height and the fallback text's
				// size, so it has to be computed in the layout phase: a passive
				// effect declared EARLIER in the tree must not have run yet when the
				// container is measured.
				expect(passiveHadRun.length).toBeGreaterThan(0);
				expect(passiveHadRun[0]).toBe(false);
				// 100px reference / 100px measured x 400px container = 400px.
				expect(screen.getByText("Fit").style.fontSize).toBe("400px");
			} finally {
				delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
				canvasContexts.restore();
			}
		});
	});

	describe("class prop", () => {
		it("applies the class prop to the root element", () => {
			const { container } = render(<LiquidText className="my-liquid-class" />);
			const root = container.firstElementChild as HTMLElement;
			expect(root.className).toContain("my-liquid-class");
		});

		it("still renders a root element with the default empty class", () => {
			const { container } = render(<LiquidText />);
			expect(container.firstElementChild).toBeInTheDocument();
		});
	});

	describe("prop defaults and full prop surface (smoke)", () => {
		it("mounts without error using only defaults", () => {
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const { container } = render(<LiquidText />);

			expect(container.firstElementChild).toBeInTheDocument();
			expect(screen.getByText("Liquid")).toBeInTheDocument();
			expect(errorSpy).not.toHaveBeenCalled();

			errorSpy.mockRestore();
		});

		it("mounts without error with every documented prop explicitly set", () => {
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const { container } = render(
				<LiquidText
					text="Smoke Test"
					font="Arial, sans-serif"
					fontSize={96}
					fontWeight={800}
					lightColor="#111111"
					darkColor="#eeeeee"
					className="smoke-root"
					strength={0.75}
					radius={220}
					forceGain={24}
					dissipation={0.95}
					viscosity={6}
					chromaticRatio={0.35}
					staticBelow={768}
					interactive={false}
					pauseWhenHidden={false}
				/>
			);

			expect(container.firstElementChild).toBeInTheDocument();
			expect(screen.getByText("Smoke Test")).toBeInTheDocument();
			expect(errorSpy).not.toHaveBeenCalled();

			errorSpy.mockRestore();
		});
	});
});
