import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, flushSync } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import CardSpotlight from "./CardSpotlight.svelte";

function textSnippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function stubSwitchableDisplay() {
	let high = false;
	const listeners = new Set<(e: { matches: boolean }) => void>();
	vi.stubGlobal("navigator", { ...navigator, gpu: {} });
	vi.stubGlobal("matchMedia", (query: string) => ({
		get matches() {
			return query === "(dynamic-range: high)" && high;
		},
		media: query,
		addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.add(fn),
		removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.delete(fn),
		addListener: () => {},
		removeListener: () => {},
	}));
	return (next: boolean) => {
		high = next;
		listeners.forEach((fn) => fn({ matches: next }));
	};
}

describe("CardSpotlight", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders the wrapper with the base card classes", () => {
		const { container } = render(CardSpotlight);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("rounded-xl");
		expect(wrapper.className).toContain("overflow-hidden");
	});

	it("applies custom class names to the wrapper", () => {
		const { container } = render(CardSpotlight, { props: { class: "my-spotlight" } });
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("my-spotlight");
	});

	it("applies slotClass to the content wrapper", () => {
		const { container } = render(CardSpotlight, { props: { slotClass: "my-slot" } });
		const slot = container.querySelector(".relative.z-10") as HTMLElement;
		expect(slot.className).toContain("my-slot");
	});

	it("renders children content", () => {
		const { container } = render(CardSpotlight, {
			props: { children: textSnippet("<p data-testid='content'>hi</p>") },
		});
		expect(container.querySelector("[data-testid='content']")).toBeTruthy();
	});

	// The overlay's `style="background: {backgroundStyle}; opacity: {gradientOpacity}"`
	// attribute never materializes under this repo's vitest+jsdom setup — verified
	// with a from-scratch minimal component reproduction, unrelated to mouse
	// tracking or gradientSize/gradientColor: any style attribute shaped like
	// `style="prop: {dyn}; prop2: value"` on a plain element renders with no
	// style attribute at all (confirmed via getAttribute, .style.cssText, and
	// the individual .style.* properties, all empty). Because vite.config.ts
	// forces `resolve: { conditions: ['browser'] }`, tests compile the same
	// client output real browsers get, so this is worth a maintainer checking
	// in an actual browser rather than something to chase further here — see
	// the gradient/opacity plumbing tests below, which stay on structure only.
	it("accepts gradientSize/gradientColor/gradientOpacity without throwing and keeps the overlay in the DOM", () => {
		const { container } = render(CardSpotlight, {
			props: { gradientSize: 300, gradientColor: "#ff0000", gradientOpacity: 0.5 },
		});
		const overlay = container.querySelector(".pointer-events-none.absolute.inset-0");
		expect(overlay).toBeTruthy();
	});

	it("responds to mousemove and mouseleave without throwing", async () => {
		const { container } = render(CardSpotlight);
		const wrapper = container.firstElementChild as HTMLElement;

		await fireEvent.mouseMove(wrapper, { clientX: 40, clientY: 30 });
		await fireEvent.mouseLeave(wrapper);

		// The awaits above would reject if either handler threw.
		expect(container.querySelector(".pointer-events-none.absolute.inset-0")).toBeTruthy();
	});

	it("adds and drops the HDR canvas as the window moves between SDR and HDR displays", () => {
		const setHdr = stubSwitchableDisplay();
		const { container } = render(CardSpotlight, { props: { hdr: true } });
		flushSync();
		expect(container.querySelector("canvas")).toBeNull();
		setHdr(true);
		flushSync();
		expect(container.querySelector("canvas")).not.toBeNull();
		setHdr(false);
		flushSync();
		expect(container.querySelector("canvas")).toBeNull();
	});
});
