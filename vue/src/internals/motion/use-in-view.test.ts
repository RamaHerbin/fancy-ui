import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import { render } from "@testing-library/vue";
import { describe, expect, it, vi } from "vitest";
import { useInView, type UseInViewOptions } from "./use-in-view.js";
import { FakeIntersectionObserver } from "../../test-setup.js";

function latestObserver(): FakeIntersectionObserver {
	return FakeIntersectionObserver.instances.at(-1)!;
}

function Probe(options?: () => UseInViewOptions) {
	return defineComponent({
		name: "Probe",
		setup() {
			const box = useTemplateRef<HTMLDivElement>("box");
			const visible = useInView(box, options);
			return () => h("div", { ref: "box", "data-testid": "value" }, String(visible.value));
		},
	});
}

describe("useInView", () => {
	it("is false before the observer ever fires", async () => {
		const { getByTestId } = render(Probe());
		await nextTick();
		expect(getByTestId("value").textContent).toBe("false");
	});

	it("attaches an observer with the default threshold, rootMargin and root once the element mounts", async () => {
		render(Probe());
		await nextTick();
		const observer = latestObserver();
		expect(observer.options?.threshold).toBe(0.1);
		expect(observer.options?.rootMargin).toBe("0px");
		expect(observer.options?.root).toBe(null);
	});

	it("passes threshold/rootMargin/root through to the constructor", async () => {
		const root = document.createElement("div");
		render(Probe(() => ({ threshold: [0, 0.5], rootMargin: "10px", root })));
		await nextTick();
		const observer = latestObserver();
		expect(observer.options?.threshold).toEqual([0, 0.5]);
		expect(observer.options?.rootMargin).toBe("10px");
		expect(observer.options?.root).toBe(root);
	});

	it("flips true once the observer reports intersection", async () => {
		const { getByTestId } = render(Probe());
		await nextTick();
		const observer = latestObserver();

		observer.trigger(true);
		await nextTick();
		expect(getByTestId("value").textContent).toBe("true");
	});

	it("once=true (default) disconnects after the first intersection", async () => {
		render(Probe());
		await nextTick();
		const observer = latestObserver();

		observer.trigger(true);
		await nextTick();
		expect(observer.elements.size).toBe(0);
	});

	it("once=false keeps observing and re-fires on every entry", async () => {
		const { getByTestId } = render(Probe(() => ({ once: false })));
		await nextTick();
		const observer = latestObserver();

		observer.trigger(true);
		await nextTick();
		expect(getByTestId("value").textContent).toBe("true");

		observer.trigger(false);
		await nextTick();
		expect(getByTestId("value").textContent).toBe("false");

		observer.trigger(true);
		await nextTick();
		expect(getByTestId("value").textContent).toBe("true");
	});

	it("calls the consumer's onChange alongside updating the returned ref", async () => {
		const onChange = vi.fn();
		render(Probe(() => ({ once: false, onChange })));
		await nextTick();
		const observer = latestObserver();

		observer.trigger(true);
		await nextTick();
		expect(onChange).toHaveBeenCalledWith(true, expect.anything());
	});

	it("enabled: false skips observing entirely", async () => {
		render(Probe(() => ({ enabled: false })));
		await nextTick();
		expect(FakeIntersectionObserver.instances).toHaveLength(0);
	});

	it("enabled: false then true re-observes a node that has not fired yet", async () => {
		const enabled = ref(false);
		render(
			defineComponent({
				name: "Probe",
				setup() {
					const box = useTemplateRef<HTMLDivElement>("box");
					const visible = useInView(box, () => ({ enabled: enabled.value }));
					return () => h("div", { ref: "box" }, String(visible.value));
				},
			})
		);
		await nextTick();
		expect(FakeIntersectionObserver.instances).toHaveLength(0);

		enabled.value = true;
		await nextTick();
		expect(FakeIntersectionObserver.instances).toHaveLength(1);
		expect(latestObserver().elements.size).toBe(1);
	});

	it("does not resurrect a spent once=true observer across an enabled cycle", async () => {
		const enabled = ref(true);
		const onChange = vi.fn();
		const { getByTestId } = render(
			defineComponent({
				name: "Probe",
				setup() {
					const box = useTemplateRef<HTMLDivElement>("box");
					const visible = useInView(box, () => ({ enabled: enabled.value, onChange }));
					return () => h("div", { ref: "box", "data-testid": "value" }, String(visible.value));
				},
			})
		);
		await nextTick();
		latestObserver().trigger(true);
		await nextTick();
		expect(getByTestId("value").textContent).toBe("true");
		expect(onChange).toHaveBeenCalledTimes(1);

		// Disabling drops the core instance, and with it the core's OWN
		// firedOnce flag — the composable has to remember the fire itself, or
		// re-enabling would build a fresh observer and deliver a second
		// onChange(true) for a `once: true` consumer.
		enabled.value = false;
		await nextTick();
		enabled.value = true;
		await nextTick();

		expect(FakeIntersectionObserver.instances).toHaveLength(1);
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(getByTestId("value").textContent).toBe("true");
	});

	it("disconnects on unmount", async () => {
		const { unmount } = render(Probe(() => ({ once: false })));
		await nextTick();
		const observer = latestObserver();
		const disconnectSpy = vi.spyOn(observer, "disconnect");

		unmount();
		expect(disconnectSpy).toHaveBeenCalled();
	});

	it("rebuilds the observer when rootMargin changes", async () => {
		const rootMargin = ref("0px");
		render(
			defineComponent({
				name: "Probe",
				setup() {
					const box = useTemplateRef<HTMLDivElement>("box");
					const visible = useInView(box, () => ({ rootMargin: rootMargin.value }));
					return () => h("div", { ref: "box" }, String(visible.value));
				},
			})
		);
		await nextTick();
		const first = latestObserver();

		rootMargin.value = "20px";
		await nextTick();

		expect(FakeIntersectionObserver.instances.length).toBe(2);
		expect(first.elements.size).toBe(0);
		expect(latestObserver().options?.rootMargin).toBe("20px");
	});

	it("does not rebuild the observer when only the onChange identity changes", async () => {
		const handlerA = vi.fn();
		const handlerB = vi.fn();
		const handler = ref(handlerA);
		render(
			defineComponent({
				name: "Probe",
				setup() {
					const box = useTemplateRef<HTMLDivElement>("box");
					const visible = useInView(box, () => ({ once: false, onChange: handler.value }));
					return () => h("div", { ref: "box" }, String(visible.value));
				},
			})
		);
		await nextTick();
		const countBefore = FakeIntersectionObserver.instances.length;

		handler.value = handlerB;
		await nextTick();
		expect(FakeIntersectionObserver.instances.length).toBe(countBefore);

		latestObserver().trigger(true);
		await nextTick();
		expect(handlerA).not.toHaveBeenCalled();
		expect(handlerB).toHaveBeenCalledWith(true, expect.anything());
	});
});
