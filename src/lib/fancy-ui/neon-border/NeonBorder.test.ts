import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import { createRawSnippet } from "svelte";
import NeonBorder, { beamArc, neonBeams, neonCorners } from "./NeonBorder.svelte";

describe("NeonBorder", () => {
	afterEach(cleanup);

	it("renders a container div", () => {
		const { container } = render(NeonBorder);
		const wrapper = container.querySelector(".neon-border-container");
		expect(wrapper).toBeInTheDocument();
	});

	it("renders the tube, glow and core layers, all decorative", () => {
		const { container } = render(NeonBorder);
		for (const cls of ["neon-tube", "neon-light", "neon-glow", "neon-core"]) {
			const el = container.querySelector(`.${cls}`);
			expect(el).toBeInTheDocument();
		}
		expect(container.querySelector(".neon-tube")).toHaveAttribute("aria-hidden", "true");
		expect(container.querySelector(".neon-light")).toHaveAttribute("aria-hidden", "true");
	});

	it("renders the content before the light layers", () => {
		const children = createRawSnippet(() => ({ render: () => "<p>Inside</p>" }));
		const { container } = render(NeonBorder, { props: { children } });
		const wrapper = container.querySelector(".neon-border-container")!;
		expect(wrapper.firstElementChild?.textContent).toBe("Inside");
	});

	it('applies the travel animation when animationType is not "none"', () => {
		const { container } = render(NeonBorder, { props: { animationType: "half" } });
		expect(container.querySelector(".neon-border-container")?.className).toContain("neon-animated");
	});

	it('does not apply the travel animation when animationType is "none"', () => {
		const { container } = render(NeonBorder, { props: { animationType: "none" } });
		expect(container.querySelector(".neon-border-container")?.className).not.toContain(
			"neon-animated"
		);
	});

	it("chases two conic beams when animated, lights two corners when static", () => {
		const animated = render(NeonBorder, { props: { color1: "#111111", color2: "#222222" } });
		const a =
			animated.container.querySelector(".neon-border-container")!.getAttribute("style") ?? "";
		expect(a).toContain("--neon-beams: conic-gradient(from var(--neon-angle)");
		expect(a).toContain("--neon-core: conic-gradient(from var(--neon-angle)");
		cleanup();
		const still = render(NeonBorder, { props: { animationType: "none" } });
		const b = still.container.querySelector(".neon-border-container")!.getAttribute("style") ?? "";
		expect(b).toContain("--neon-beams: linear-gradient(135deg");
	});

	it("sets CSS custom properties from props", () => {
		const { container } = render(NeonBorder, {
			props: { color1: "#ff0000", color2: "#00ff00", duration: 10 },
		});
		const wrapper = container.querySelector(".neon-border-container") as HTMLElement;
		const style = wrapper.getAttribute("style") ?? "";
		expect(style).toContain("--neon-color1: #ff0000");
		expect(style).toContain("--neon-color2: #00ff00");
		expect(style).toContain("--neon-duration: 10s");
	});

	it("sets neon-width to 50% for half animation type", () => {
		const { container } = render(NeonBorder, {
			props: { animationType: "half" },
		});
		const wrapper = container.querySelector(".neon-border-container") as HTMLElement;
		const style = wrapper.getAttribute("style") ?? "";
		expect(style).toContain("--neon-width: 50%");
	});

	it("sets neon-width to 100% for full animation type", () => {
		const { container } = render(NeonBorder, {
			props: { animationType: "full" },
		});
		const wrapper = container.querySelector(".neon-border-container") as HTMLElement;
		const style = wrapper.getAttribute("style") ?? "";
		expect(style).toContain("--neon-width: 100%");
	});

	it("sets neon-width to 12% for none animation type", () => {
		const { container } = render(NeonBorder, {
			props: { animationType: "none" },
		});
		const wrapper = container.querySelector(".neon-border-container") as HTMLElement;
		const style = wrapper.getAttribute("style") ?? "";
		expect(style).toContain("--neon-width: 12%");
	});

	it("applies custom class names", () => {
		const { container } = render(NeonBorder, {
			props: { class: "custom-neon" },
		});
		const wrapper = container.querySelector(".neon-border-container");
		expect(wrapper?.className).toContain("custom-neon");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(NeonBorder, { props: { class: "extra" } });
		const wrapper = container.querySelector(".neon-border-container");
		expect(wrapper?.className).toContain("relative");
		expect(wrapper?.className).toContain("rounded-lg");
		// the glow spills past the edge, so nothing may clip it
		expect(wrapper?.className).not.toContain("overflow-hidden");
	});
});

describe("neon gradients", () => {
	it("covers more of the tube for full than for half", () => {
		expect(beamArc("full")).toBeGreaterThan(beamArc("half"));
	});

	it("builds two beams half a turn apart, each ending in a sharp head", () => {
		const g = neonBeams("#aa0000", "#0000aa", 20);
		expect(g).toContain("transparent 0%");
		expect(g).toContain("#aa0000 19.4%");
		expect(g).toContain("transparent 20.0%");
		expect(g).toContain("transparent 50%");
		expect(g).toContain("#0000aa 69.4%");
		expect(g).toContain("transparent 70.0%");
	});

	it("whitens the core of each colour", () => {
		expect(neonBeams("#aa0000", "#0000aa", 20, true)).toContain(
			"color-mix(in srgb, #aa0000 45%, #fff)"
		);
		expect(neonCorners("#aa0000", "#0000aa", true)).toContain(
			"color-mix(in srgb, #0000aa 45%, #fff)"
		);
	});
});
