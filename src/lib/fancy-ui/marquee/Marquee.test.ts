import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { tick } from "svelte";
import Marquee from "./Marquee.svelte";

describe("Marquee", () => {
	afterEach(cleanup);

	it("renders a container div", () => {
		const { container } = render(Marquee);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it("has overflow-hidden class", () => {
		const { container } = render(Marquee);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("overflow-hidden");
	});

	it("renders default 4 repeat groups", () => {
		const { container } = render(Marquee);
		const groups = container.querySelectorAll(".animate-marquee");
		expect(groups.length).toBe(4);
	});

	it("renders custom repeat count", () => {
		const { container } = render(Marquee, { props: { repeat: 2 } });
		const groups = container.querySelectorAll(".animate-marquee");
		expect(groups.length).toBe(2);
	});

	it("uses vertical animation class when vertical", () => {
		const { container } = render(Marquee, { props: { vertical: true } });
		const groups = container.querySelectorAll(".animate-marquee-vertical");
		expect(groups.length).toBe(4);
	});

	it("uses flex-col when vertical", () => {
		const { container } = render(Marquee, { props: { vertical: true } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("flex-col");
	});

	it("sets animation-direction to reverse when reverse prop is true", () => {
		const { container } = render(Marquee, { props: { reverse: true } });
		const group = container.querySelector(".animate-marquee") as HTMLElement;
		expect(group?.style.animationDirection).toBe("reverse");
	});

	it("applies custom class names", () => {
		const { container } = render(Marquee, { props: { class: "my-marquee" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-marquee");
	});

	it("applies the edge-fade mask class by default", () => {
		const { container } = render(Marquee);
		const div = container.firstElementChild as HTMLElement;
		expect(div.classList.contains("marquee-fade")).toBe(true);
	});

	it("drops the edge-fade mask when fade={false}", () => {
		const { container } = render(Marquee, { props: { fade: false } });
		const div = container.firstElementChild as HTMLElement;
		expect(div.classList.contains("marquee-fade")).toBe(false);
	});

	it("exposes speed as the CSS duration divisor", () => {
		const { container } = render(Marquee, { props: { speed: 2 } });
		const div = container.firstElementChild as HTMLElement;
		expect(div.style.getPropertyValue("--marquee-speed")).toBe("2");
	});

	it("falls back to speed 1 for a non-positive speed", () => {
		const { container } = render(Marquee, { props: { speed: 0 } });
		const div = container.firstElementChild as HTMLElement;
		expect(div.style.getPropertyValue("--marquee-speed")).toBe("1");
	});

	it("hides every copy after the first from assistive tech", () => {
		const { container } = render(Marquee, { props: { repeat: 3 } });
		const tracks = container.querySelectorAll("[data-marquee-track]");
		expect(tracks[0].hasAttribute("aria-hidden")).toBe(false);
		expect(tracks[1].getAttribute("aria-hidden")).toBe("true");
		expect(tracks[2].getAttribute("aria-hidden")).toBe("true");
	});
});

describe("Marquee eased conveyor (Web Animations)", () => {
	type FakeAnimation = {
		playbackRate: number;
		currentTime: number;
		cancel: ReturnType<typeof vi.fn>;
	};

	let created: { keyframes: Keyframe[]; options: KeyframeAnimationOptions; anim: FakeAnimation }[];
	let frames: Map<number, FrameRequestCallback>;
	let nextFrame: number;
	let now: number;
	const originalAnimate = Element.prototype.animate;

	function flushFrames(ms: number, step = 16) {
		const end = now + ms;
		while (now < end && frames.size) {
			now += step;
			const pending = [...frames.values()];
			frames.clear();
			for (const cb of pending) cb(now);
		}
	}

	beforeEach(() => {
		created = [];
		frames = new Map();
		nextFrame = 1;
		now = 0;
		Element.prototype.animate = vi.fn(function (
			this: Element,
			keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
			options?: number | KeyframeAnimationOptions
		) {
			const anim: FakeAnimation = { playbackRate: 1, currentTime: 0, cancel: vi.fn() };
			created.push({
				keyframes: keyframes as Keyframe[],
				options: options as KeyframeAnimationOptions,
				anim,
			});
			return anim as unknown as Animation;
		}) as typeof Element.prototype.animate;
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			const id = nextFrame++;
			frames.set(id, cb);
			return id;
		});
		vi.stubGlobal("cancelAnimationFrame", (id: number) => {
			frames.delete(id);
		});
	});

	afterEach(() => {
		cleanup();
		Element.prototype.animate = originalAnimate;
		vi.unstubAllGlobals();
	});

	it("upgrades every track to animate() on mount and silences the CSS keyframe", async () => {
		const { container } = render(Marquee, { props: { repeat: 3, reverse: true } });
		await tick();
		expect(created).toHaveLength(3);
		expect(created[0].options.iterations).toBe(Infinity);
		expect(created[0].options.direction).toBe("reverse");
		expect(String(created[0].keyframes[1].transform)).toContain("translateX");
		const root = container.firstElementChild as HTMLElement;
		expect(root.classList.contains("marquee-upgraded")).toBe(true);
	});

	it("animates along Y when vertical", async () => {
		render(Marquee, { props: { vertical: true } });
		await tick();
		expect(String(created[0].keyframes[1].transform)).toContain("translateY");
	});

	it("applies speed as the playback rate", async () => {
		render(Marquee, { props: { speed: 1.5 } });
		await tick();
		expect(created[0].anim.playbackRate).toBeCloseTo(1.5);
	});

	it("eases the rate toward 0 on hover and back to full speed on leave", async () => {
		const { container } = render(Marquee, { props: { pauseOnHover: true } });
		await tick();
		const root = container.firstElementChild as HTMLElement;
		const anim = created[0].anim;

		await fireEvent.pointerEnter(root);
		flushFrames(64);
		// Mid-brake: slower, but not frozen — a deceleration, not a stop.
		expect(anim.playbackRate).toBeLessThan(1);
		expect(anim.playbackRate).toBeGreaterThan(0);

		flushFrames(1500);
		expect(anim.playbackRate).toBe(0);
		// Settled: the loop has gone to sleep.
		expect(frames.size).toBe(0);

		await fireEvent.pointerLeave(root);
		flushFrames(64);
		expect(anim.playbackRate).toBeGreaterThan(0);
		expect(anim.playbackRate).toBeLessThan(1);

		flushFrames(1500);
		expect(anim.playbackRate).toBe(1);
		expect(frames.size).toBe(0);
	});

	it("ignores hover when pauseOnHover is off", async () => {
		const { container } = render(Marquee);
		await tick();
		const root = container.firstElementChild as HTMLElement;
		await fireEvent.pointerEnter(root);
		flushFrames(600);
		expect(created[0].anim.playbackRate).toBe(1);
	});

	it("cancels its animations on unmount", async () => {
		const { unmount } = render(Marquee, { props: { repeat: 2 } });
		await tick();
		unmount();
		expect(created[0].anim.cancel).toHaveBeenCalled();
		expect(created[1].anim.cancel).toHaveBeenCalled();
	});

	it("stays a still row under reduced motion (no animate() calls)", async () => {
		const originalMatchMedia = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			matches: query.includes("reduce"),
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		})) as typeof window.matchMedia;
		try {
			const { container } = render(Marquee);
			await tick();
			expect(created).toHaveLength(0);
			const root = container.firstElementChild as HTMLElement;
			expect(root.classList.contains("marquee-upgraded")).toBe(false);
			expect(root.classList.contains("marquee-fade")).toBe(true);
		} finally {
			window.matchMedia = originalMatchMedia;
		}
	});

	it("keeps its on-screen position when the direction flips", async () => {
		const { rerender } = render(Marquee, { props: { repeat: 1 } });
		await tick();
		// A quarter of the way along the (default 40 s) loop.
		created[0].anim.currentTime = 10_000;
		await rerender({ repeat: 1, reverse: true });
		await tick();
		expect(created).toHaveLength(2);
		// On a reversed clock the same position sits three quarters of the way in.
		expect(created[1].anim.currentTime).toBeCloseTo(30_000);
	});
});
