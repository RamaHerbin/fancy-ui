import { describe, it, expect, vi } from "vitest";
import { FakeAnimation, FakeIntersectionObserver, FakeResizeObserver } from "./test-setup.js";

describe("Element.prototype.animate stub", () => {
	it("records the target, keyframes and options of every animation", () => {
		const node = document.createElement("div");
		const animation = node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, fill: "forwards" });

		expect(animation).toBeInstanceOf(FakeAnimation);
		expect(FakeAnimation.instances).toHaveLength(1);

		const recorded = FakeAnimation.instances[0] as FakeAnimation;
		expect(recorded.target).toBe(node);
		expect(recorded.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
		expect(recorded.options).toEqual({ duration: 120, fill: "forwards" });
	});

	it("starts each test with an empty recording", () => {
		expect(FakeAnimation.instances).toHaveLength(0);
	});

	it("exposes currentTime, playState and a writable effect", () => {
		const animation = document.createElement("div").animate([], 0) as unknown as FakeAnimation;

		expect(animation.currentTime).toBe(0);
		expect(animation.playState).toBe("finished");
		expect(animation.effect).toBeNull();

		animation.effect = { getKeyframes: () => [] };
		expect(animation.effect).not.toBeNull();
		animation.effect = null;
		expect(animation.effect).toBeNull();
	});

	it("fires onfinish on a microtask, never in the same tick", async () => {
		const onfinish = vi.fn();
		const animation = document.createElement("div").animate([], 0);
		animation.onfinish = onfinish;

		expect(onfinish).not.toHaveBeenCalled();

		await Promise.resolve();
		expect(onfinish).toHaveBeenCalledTimes(1);
	});

	it("fires onfinish under fake timers, because it never uses one", async () => {
		vi.useFakeTimers();
		const onfinish = vi.fn();
		const animation = document.createElement("div").animate([], 0);
		animation.onfinish = onfinish;

		await Promise.resolve();
		expect(onfinish).toHaveBeenCalledTimes(1);
		vi.useRealTimers();
	});

	it("cancel() suppresses onfinish", async () => {
		const onfinish = vi.fn();
		const animation = document.createElement("div").animate([], 0);
		animation.onfinish = onfinish;
		animation.cancel();

		await Promise.resolve();
		expect(onfinish).not.toHaveBeenCalled();
	});
});

describe("IntersectionObserver stub", () => {
	it("is the recording fake, and trigger() reports every observed element", () => {
		const seen: IntersectionObserverEntry[][] = [];
		const observer = new IntersectionObserver((entries) => seen.push(entries));
		const node = document.createElement("div");
		observer.observe(node);

		expect(observer).toBeInstanceOf(FakeIntersectionObserver);
		expect(FakeIntersectionObserver.instances.at(-1)).toBe(observer);

		(observer as unknown as FakeIntersectionObserver).trigger(true);
		expect(seen).toHaveLength(1);
		expect(seen[0]?.[0]?.target).toBe(node);
		expect(seen[0]?.[0]?.isIntersecting).toBe(true);

		(observer as unknown as FakeIntersectionObserver).trigger(false);
		expect(seen[1]?.[0]?.isIntersecting).toBe(false);
	});

	it("stops reporting a disconnected element", () => {
		const callback = vi.fn();
		const observer = new IntersectionObserver(callback);
		observer.observe(document.createElement("div"));
		observer.disconnect();

		(observer as unknown as FakeIntersectionObserver).trigger(true);
		expect(callback).toHaveBeenCalledWith([], observer);
	});
});

describe("the remaining jsdom gaps", () => {
	it("installs an inert ResizeObserver", () => {
		const observer = new ResizeObserver(() => {});
		expect(observer).toBeInstanceOf(FakeResizeObserver);
		expect(() => observer.observe(document.createElement("div"))).not.toThrow();
	});

	it("installs a matchMedia that answers false and accepts change listeners", () => {
		const list = window.matchMedia("(prefers-reduced-motion: reduce)");
		expect(list.matches).toBe(false);
		expect(list.media).toBe("(prefers-reduced-motion: reduce)");
		expect(() => list.addEventListener("change", () => {})).not.toThrow();
	});

	it("leaves matchMedia replaceable per test", () => {
		const descriptor = Object.getOwnPropertyDescriptor(window, "matchMedia");
		expect(descriptor?.configurable).toBe(true);
		expect(descriptor?.writable).toBe(true);
	});

	it("leaves navigator.vibrate absent, so the unsupported path is the default", () => {
		expect(navigator.vibrate).toBeUndefined();
	});

	it("makes canvas contexts null rather than throwing", () => {
		expect(document.createElement("canvas").getContext("2d")).toBeNull();
	});
});
