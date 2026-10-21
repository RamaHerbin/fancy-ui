import { render, cleanup, fireEvent, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Harness from "./AccordionHarness.test.svelte";
import {
	canClose,
	navigationTarget,
	openValues,
	targetIndex,
	toggleItem,
	valueFor,
} from "./accordion-core.js";
import { DEFAULT_SETTLE_MS, SETTLE_SLACK_MS } from "../collapsible/collapsible-core.js";

const trigger = (value: string) => screen.getByTestId(`trigger-${value}`);
const content = (value: string) => screen.getByTestId(`content-${value}`);
const expanded = (value: string) => trigger(value).getAttribute("aria-expanded") === "true";
const isInert = (el: HTMLElement) => el.hasAttribute("inert");

async function endCollapse(el: HTMLElement) {
	await fireEvent(
		el,
		Object.assign(new Event("transitionend", { bubbles: true }), {
			propertyName: "grid-template-rows",
		})
	);
}

function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

describe("accordion-core", () => {
	it("reads value as the list of open items, whatever the type", () => {
		expect(openValues("single", "a")).toEqual(["a"]);
		expect(openValues("single", "")).toEqual([]);
		expect(openValues("single", undefined)).toEqual([]);
		expect(openValues("single", ["x", "y"])).toEqual(["x"]);
		expect(openValues("multiple", ["a", "b"])).toEqual(["a", "b"]);
		expect(openValues("multiple", "a")).toEqual(["a"]);
		expect(openValues("multiple", undefined)).toEqual([]);
	});

	it("emits a string for single (empty for none) and a list for multiple", () => {
		expect(valueFor("single", ["a"])).toBe("a");
		expect(valueFor("single", [])).toBe("");
		expect(valueFor("multiple", ["a", "b"])).toEqual(["a", "b"]);
	});

	it("only a collapsible single accordion, or a multiple one, may close an open item", () => {
		expect(canClose("single", false)).toBe(false);
		expect(canClose("single", true)).toBe(true);
		expect(canClose("multiple", false)).toBe(true);
	});

	it("toggles items per type and collapsibility", () => {
		expect(toggleItem("single", false, [], "a")).toEqual(["a"]);
		expect(toggleItem("single", false, ["a"], "b")).toEqual(["b"]);
		expect(toggleItem("single", false, ["a"], "a")).toBeNull();
		expect(toggleItem("single", true, ["a"], "a")).toEqual([]);
		expect(toggleItem("multiple", false, ["a"], "b")).toEqual(["a", "b"]);
		expect(toggleItem("multiple", false, ["a", "b"], "a")).toEqual(["b"]);
	});

	it("maps arrow pairs per orientation and wraps the index", () => {
		expect(navigationTarget("vertical", "ArrowDown")).toEqual({ step: 1 });
		expect(navigationTarget("vertical", "ArrowUp")).toEqual({ step: -1 });
		expect(navigationTarget("vertical", "ArrowRight")).toBeNull();
		expect(navigationTarget("horizontal", "ArrowRight")).toEqual({ step: 1 });
		expect(navigationTarget("horizontal", "ArrowLeft")).toEqual({ step: -1 });
		expect(navigationTarget("horizontal", "ArrowDown")).toBeNull();
		expect(navigationTarget("vertical", "Home")).toEqual({ edge: "first" });
		expect(navigationTarget("vertical", "End")).toEqual({ edge: "last" });
		expect(navigationTarget("vertical", "Enter")).toBeNull();
		expect(targetIndex(3, 2, { step: 1 })).toBe(0);
		expect(targetIndex(3, 0, { step: -1 })).toBe(2);
		expect(targetIndex(3, -1, { step: 1 })).toBe(1);
		expect(targetIndex(3, 1, { edge: "first" })).toBe(0);
		expect(targetIndex(3, 1, { edge: "last" })).toBe(2);
		expect(targetIndex(0, 0, { step: 1 })).toBe(-1);
	});
});

describe("Accordion", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	describe("structure and ARIA", () => {
		it("starts with everything closed, collapsed and inert, content still in the DOM", () => {
			render(Harness);
			for (const v of ["a", "b", "c"]) {
				expect(expanded(v)).toBe(false);
				expect(content(v).getAttribute("data-state")).toBe("closed");
				expect(isInert(content(v))).toBe(true);
				expect(screen.getByTestId(`inside-${v}`)).toBeInTheDocument();
			}
		});

		it("puts each trigger inside a level-3 heading by default", () => {
			render(Harness);
			const heading = trigger("a").parentElement as HTMLElement;
			expect(heading.getAttribute("role")).toBe("heading");
			expect(heading.getAttribute("aria-level")).toBe("3");
			expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
		});

		it("honours headingLevel", () => {
			render(Harness, { props: { headingLevel: 2 } });
			expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
		});

		it("makes the content a labelled region wired to its trigger", () => {
			render(Harness, { props: { value: "a" } });
			const region = content("a");
			expect(region.getAttribute("role")).toBe("region");
			expect(region.getAttribute("aria-labelledby")).toBe(trigger("a").id);
			expect(trigger("a").getAttribute("aria-controls")).toBe(region.id);
			expect(region.id).not.toBe("");
			expect(trigger("a").id).not.toBe("");
		});

		it("gives every trigger and region a distinct id", () => {
			const { container } = render(Harness);
			const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
			expect(ids).toHaveLength(6);
			expect(new Set(ids).size).toBe(6);
		});

		it("renders triggers as native non-submitting buttons that stay in the tab order", () => {
			render(Harness);
			for (const v of ["a", "b", "c"]) {
				expect(trigger(v).tagName).toBe("BUTTON");
				expect(trigger(v).getAttribute("type")).toBe("button");
				expect(trigger(v).hasAttribute("tabindex")).toBe(false);
			}
		});

		it("marks the root and the items with their orientation and state", () => {
			render(Harness, { props: { value: "b", orientation: "horizontal" } });
			expect(screen.getByTestId("root").getAttribute("data-orientation")).toBe("horizontal");
			expect(screen.getByTestId("item-b").getAttribute("data-state")).toBe("open");
			expect(screen.getByTestId("item-a").getAttribute("data-state")).toBe("closed");
		});
	});

	describe("type single", () => {
		it("opens the clicked item and reports its value once", async () => {
			const onValueChange = vi.fn();
			render(Harness, { props: { onValueChange } });
			await fireEvent.click(trigger("a"));
			expect(expanded("a")).toBe(true);
			expect(isInert(content("a"))).toBe(false);
			expect(onValueChange).toHaveBeenCalledTimes(1);
			expect(onValueChange).toHaveBeenCalledWith("a");
		});

		it("closes the previous item when another opens", async () => {
			const onValueChange = vi.fn();
			render(Harness, { props: { value: "a", onValueChange } });
			await fireEvent.click(trigger("b"));
			expect(expanded("a")).toBe(false);
			expect(expanded("b")).toBe(true);
			expect(onValueChange).toHaveBeenLastCalledWith("b");
		});

		it("keeps the open item open when it is not collapsible, and says so", async () => {
			const onValueChange = vi.fn();
			render(Harness, { props: { value: "a", onValueChange } });
			expect(trigger("a").getAttribute("aria-disabled")).toBe("true");
			expect(trigger("b").hasAttribute("aria-disabled")).toBe(false);
			await fireEvent.click(trigger("a"));
			expect(expanded("a")).toBe(true);
			expect(onValueChange).not.toHaveBeenCalled();
		});

		it("closes the open item when collapsible and reports an empty string", async () => {
			const onValueChange = vi.fn();
			render(Harness, { props: { value: "a", collapsible: true, onValueChange } });
			expect(trigger("a").hasAttribute("aria-disabled")).toBe(false);
			await fireEvent.click(trigger("a"));
			expect(expanded("a")).toBe(false);
			expect(onValueChange).toHaveBeenCalledWith("");
		});

		it("round-trips through bind:value and follows an external change", async () => {
			const { rerender } = render(Harness, { props: { value: "a" } });
			await rerender({ value: "c" });
			expect(expanded("a")).toBe(false);
			expect(expanded("c")).toBe(true);
			await rerender({ value: "" });
			expect(expanded("c")).toBe(false);
		});

		it("keeps its own state when nothing is bound", async () => {
			render(Harness);
			await fireEvent.click(trigger("b"));
			await fireEvent.click(trigger("c"));
			expect(expanded("b")).toBe(false);
			expect(expanded("c")).toBe(true);
		});
	});

	describe("type multiple", () => {
		it("lets several items be open and reports the list in opening order", async () => {
			const onValueChange = vi.fn();
			render(Harness, { props: { type: "multiple", onValueChange } });
			await fireEvent.click(trigger("b"));
			await fireEvent.click(trigger("a"));
			expect(expanded("a")).toBe(true);
			expect(expanded("b")).toBe(true);
			expect(onValueChange.mock.calls).toEqual([[["b"]], [["b", "a"]]]);
		});

		it("closes one item without touching the others", async () => {
			const onValueChange = vi.fn();
			render(Harness, { props: { type: "multiple", value: ["a", "b"], onValueChange } });
			await fireEvent.click(trigger("a"));
			expect(expanded("a")).toBe(false);
			expect(expanded("b")).toBe(true);
			expect(onValueChange).toHaveBeenCalledWith(["b"]);
		});

		it("never locks an open item, collapsible or not", async () => {
			render(Harness, { props: { type: "multiple", value: ["a"], collapsible: false } });
			expect(trigger("a").hasAttribute("aria-disabled")).toBe(false);
			await fireEvent.click(trigger("a"));
			expect(expanded("a")).toBe(false);
		});

		it("follows an external list", async () => {
			const { rerender } = render(Harness, { props: { type: "multiple", value: ["a"] } });
			await rerender({ value: ["b", "c"] });
			expect([expanded("a"), expanded("b"), expanded("c")]).toEqual([false, true, true]);
		});
	});

	describe("disabled", () => {
		it("disables every trigger when the root is disabled", async () => {
			const onValueChange = vi.fn();
			render(Harness, { props: { disabled: true, onValueChange } });
			for (const v of ["a", "b", "c"]) expect(trigger(v)).toBeDisabled();
			await fireEvent.click(trigger("a"));
			expect(onValueChange).not.toHaveBeenCalled();
		});

		it("disables just one item and skips it on click", async () => {
			const onValueChange = vi.fn();
			render(Harness, {
				props: {
					onValueChange,
					items: [
						{ value: "a", label: "Alpha" },
						{ value: "b", label: "Beta", disabled: true },
					],
				},
			});
			expect(trigger("b")).toBeDisabled();
			expect(trigger("a")).not.toBeDisabled();
			expect(screen.getByTestId("item-b").hasAttribute("data-disabled")).toBe(true);
			await fireEvent.click(trigger("b"));
			expect(onValueChange).not.toHaveBeenCalled();
		});
	});

	describe("keyboard", () => {
		function key(value: string, k: string) {
			return fireEvent.keyDown(trigger(value), { key: k });
		}

		it("ArrowDown and ArrowUp move focus between triggers, wrapping, without opening anything", async () => {
			const onValueChange = vi.fn();
			render(Harness, { props: { onValueChange } });
			trigger("a").focus();
			expect(await key("a", "ArrowDown")).toBe(false);
			expect(document.activeElement).toBe(trigger("b"));
			await key("b", "ArrowDown");
			expect(document.activeElement).toBe(trigger("c"));
			await key("c", "ArrowDown");
			expect(document.activeElement).toBe(trigger("a"));
			await key("a", "ArrowUp");
			expect(document.activeElement).toBe(trigger("c"));
			expect(onValueChange).not.toHaveBeenCalled();
		});

		it("Home and End jump to the first and last trigger", async () => {
			render(Harness);
			trigger("b").focus();
			expect(await key("b", "End")).toBe(false);
			expect(document.activeElement).toBe(trigger("c"));
			expect(await key("c", "Home")).toBe(false);
			expect(document.activeElement).toBe(trigger("a"));
		});

		it("skips disabled items", async () => {
			render(Harness, {
				props: {
					items: [
						{ value: "a", label: "Alpha" },
						{ value: "b", label: "Beta", disabled: true },
						{ value: "c", label: "Gamma" },
					],
				},
			});
			trigger("a").focus();
			await key("a", "ArrowDown");
			expect(document.activeElement).toBe(trigger("c"));
			await key("c", "ArrowUp");
			expect(document.activeElement).toBe(trigger("a"));
			await key("a", "End");
			expect(document.activeElement).toBe(trigger("c"));
		});

		it("uses the horizontal pair, and leaves the vertical pair alone, when horizontal", async () => {
			render(Harness, { props: { orientation: "horizontal" } });
			trigger("a").focus();
			expect(await key("a", "ArrowDown")).toBe(true);
			expect(document.activeElement).toBe(trigger("a"));
			expect(await key("a", "ArrowRight")).toBe(false);
			expect(document.activeElement).toBe(trigger("b"));
			await key("b", "ArrowLeft");
			expect(document.activeElement).toBe(trigger("a"));
		});

		it("leaves the horizontal pair alone when vertical", async () => {
			render(Harness);
			trigger("a").focus();
			expect(await key("a", "ArrowRight")).toBe(true);
			expect(await key("a", "ArrowLeft")).toBe(true);
			expect(document.activeElement).toBe(trigger("a"));
		});

		it("does not intercept Enter, Space or Tab, which stay native", async () => {
			render(Harness);
			trigger("a").focus();
			for (const k of ["Enter", " ", "Tab", "Escape"]) {
				expect(await key("a", k)).toBe(true);
			}
		});
	});

	describe("motion contract", () => {
		it("hides a closed item's region only after its transitionend", async () => {
			render(Harness, { props: { value: "a", collapsible: true } });
			await fireEvent.click(trigger("a"));
			expect(isInert(content("a"))).toBe(true);
			expect(content("a").style.visibility).not.toBe("hidden");
			await endCollapse(content("a"));
			expect(content("a").style.visibility).toBe("hidden");
		});

		it("settles immediately under reduced motion", async () => {
			stubReducedMotion(true);
			render(Harness, { props: { value: "a", collapsible: true } });
			await fireEvent.click(trigger("a"));
			await tick();
			expect(content("a").style.visibility).toBe("hidden");
		});

		it("settles on its own when no transitionend arrives", async () => {
			render(Harness, { props: { value: "a", collapsible: true } });
			await fireEvent.click(trigger("a"));
			await vi.advanceTimersByTimeAsync(DEFAULT_SETTLE_MS + SETTLE_SLACK_MS + 10);
			await tick();
			expect(content("a").style.visibility).toBe("hidden");
		});

		it("with forceMount={false}, unmounts a closed item's children once settled", async () => {
			render(Harness, { props: { value: "a", collapsible: true, forceMount: false } });
			expect(screen.queryByTestId("inside-b")).toBeNull();
			expect(screen.getByTestId("inside-a")).toBeInTheDocument();
			await fireEvent.click(trigger("a"));
			await endCollapse(content("a"));
			expect(screen.queryByTestId("inside-a")).toBeNull();
		});
	});

	describe("interruption", () => {
		it("a double toggle inside the animation: one onValueChange per toggle, final state correct", async () => {
			const onValueChange = vi.fn();
			render(Harness, { props: { type: "multiple", onValueChange } });
			await fireEvent.click(trigger("a"));
			await fireEvent.click(trigger("a"));
			await fireEvent.click(trigger("a"));
			expect(onValueChange.mock.calls).toEqual([[["a"]], [[]], [["a"]]]);
			expect(expanded("a")).toBe(true);
			expect(isInert(content("a"))).toBe(false);
			await vi.advanceTimersByTimeAsync(1000);
			await tick();
			expect(content("a").style.visibility).not.toBe("hidden");
		});

		it("switching items mid-animation leaves exactly the last one open and interactive", async () => {
			const onValueChange = vi.fn();
			render(Harness, { props: { onValueChange } });
			await fireEvent.click(trigger("a"));
			await fireEvent.click(trigger("b"));
			await fireEvent.click(trigger("a"));
			expect(onValueChange.mock.calls).toEqual([["a"], ["b"], ["a"]]);
			expect([expanded("a"), expanded("b")]).toEqual([true, false]);
			await vi.advanceTimersByTimeAsync(1000);
			await tick();
			expect(content("a").style.visibility).not.toBe("hidden");
			expect(isInert(content("a"))).toBe(false);
			expect(content("b").style.visibility).toBe("hidden");
			expect(isInert(content("b"))).toBe(true);
		});
	});

	describe("refs and classes", () => {
		it("merges class onto the root", () => {
			render(Harness, { props: { rootClass: "r-x" } });
			expect(screen.getByTestId("root")).toHaveClass("r-x");
		});

		it("binds the root element", async () => {
			let rootRef: HTMLDivElement | null = null;
			render(Harness, {
				props: {
					get rootRef() {
						return rootRef;
					},
					set rootRef(v) {
						rootRef = v;
					},
				},
			});
			await tick();
			expect(rootRef).toBe(screen.getByTestId("root"));
		});
	});
});
