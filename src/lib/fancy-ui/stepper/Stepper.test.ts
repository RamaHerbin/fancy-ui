import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Stepper from "./Stepper.svelte";
import Step from "./Step.svelte";
import Harness from "./StepperHarness.test.svelte";
import { sound } from "../sound/sound.svelte.js";

interface Item {
	label: string;
	description?: string;
}

const ITEMS: Item[] = [{ label: "Account" }, { label: "Profile" }, { label: "Confirmation" }];

function list(container: HTMLElement): HTMLOListElement {
	return container.querySelector("ol") as HTMLOListElement;
}

function items(container: HTMLElement): HTMLLIElement[] {
	return Array.from(container.querySelectorAll("li"));
}

function connectors(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll(".ft-step-connector"));
}

function stepByLabel(container: HTMLElement, label: string): HTMLLIElement {
	return items(container).find((li) => li.textContent?.includes(label)) as HTMLLIElement;
}

describe("Stepper", () => {
	afterEach(cleanup);

	// Regression guard mirroring ToggleGroup's identical one: register/
	// unregister run inside each Step's own `$effect`, and reading the
	// shared registry array — even just the `includes`/`indexOf` lookup,
	// leaving the mutating `push`/`splice` itself untracked — makes that
	// effect depend on the very array its own call mutates, alternating
	// register/unregister forever until Svelte throws
	// `effect_update_depth_exceeded`. Registration is fully synchronous, so
	// the count has to be right the instant `render()` returns, with no
	// extra `tick()` needed to "settle".
	it("settles registration in one pass on mount, with no extra tick needed", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		expect(items(container)).toHaveLength(3);
		await tick();
		expect(items(container)).toHaveLength(3);
	});

	// list-style: none strips the implicit list role from an <ol> in
	// WebKit, so a screen reader announces neither "list, N items" nor
	// "item M of N" — the only remaining positional cue, since the visible
	// step number is `aria-hidden`. ThreadList/SubagentList already state
	// `role="list"` for the same reason; Stepper's <ol> must too.
	it("states role=list on the ol so its list semantics survive list-style:none", () => {
		const { container, getByRole, getAllByRole } = render(Harness, { props: { items: ITEMS } });

		expect(getByRole("list")).toBe(list(container));
		expect(getAllByRole("listitem")).toHaveLength(ITEMS.length);
	});

	it("renders an ol containing one li per Step, in order", () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const lis = items(container);

		expect(list(container)).toBeTruthy();
		expect(lis).toHaveLength(3);
		expect(lis[0].textContent).toContain("Account");
		expect(lis[1].textContent).toContain("Profile");
		expect(lis[2].textContent).toContain("Confirmation");
	});

	it("derives done/current/upcoming from position relative to current, not any prop on Step", () => {
		const { container } = render(Harness, { props: { items: ITEMS, current: 1 } });

		expect(stepByLabel(container, "Account").dataset.status).toBe("done");
		expect(stepByLabel(container, "Profile").dataset.status).toBe("current");
		expect(stepByLabel(container, "Confirmation").dataset.status).toBe("upcoming");
	});

	it("marks exactly the current step with aria-current='step'", () => {
		const { container } = render(Harness, { props: { items: ITEMS, current: 1 } });

		expect(stepByLabel(container, "Account").hasAttribute("aria-current")).toBe(false);
		expect(stepByLabel(container, "Profile").getAttribute("aria-current")).toBe("step");
		expect(stepByLabel(container, "Confirmation").hasAttribute("aria-current")).toBe(false);
	});

	it("carries sr-only status text distinguishing the three states without relying on colour", () => {
		const { container } = render(Harness, { props: { items: ITEMS, current: 1 } });

		expect(stepByLabel(container, "Account").textContent).toContain("completed");
		expect(stepByLabel(container, "Profile").textContent).toContain("current step");
		expect(stepByLabel(container, "Confirmation").textContent).toContain("not started");
	});

	it("shows a checkmark glyph for a done step instead of its number", () => {
		const { container } = render(Harness, { props: { items: ITEMS, current: 1 } });
		const done = stepByLabel(container, "Account");

		expect(done.querySelector("svg")).toBeTruthy();
		expect(done.querySelector('[data-status="done"] > span[aria-hidden="true"]')).toBeFalsy();
	});

	it("shows the 1-based step number for current and upcoming steps", () => {
		const { container } = render(Harness, { props: { items: ITEMS, current: 1 } });

		expect(
			stepByLabel(container, "Profile").querySelector('[data-status="current"]')?.textContent
		).toContain("2");
		expect(
			stepByLabel(container, "Confirmation").querySelector('[data-status="upcoming"]')?.textContent
		).toContain("3");
	});

	it("colours the connector after a done step distinctly from the connector after the current step", () => {
		const { container } = render(Harness, { props: { items: ITEMS, current: 1 } });
		const links = connectors(container);

		expect(links).toHaveLength(2); // one before step 2, one before step 3
		expect(links[0].className).toContain("ft-step-connector-done"); // step 1 (done) -> step 2
		expect(links[1].className).not.toContain("ft-step-connector-done"); // step 2 (current) -> step 3
	});

	it("renders no connector before the first step", () => {
		const { container } = render(Harness, { props: { items: ITEMS, current: 0 } });
		// Only 2 connectors for 3 steps, never a leading one.
		expect(connectors(container)).toHaveLength(2);
	});

	it("hides connectors and the ellipsis-equivalent decoration from the accessibility tree", () => {
		const { container } = render(Harness, { props: { items: ITEMS, current: 1 } });
		for (const connector of connectors(container)) {
			expect(connector.getAttribute("aria-hidden")).toBe("true");
		}
	});

	it("renders steps as non-focusable, non-interactive elements when clickable is false", () => {
		const { container } = render(Harness, {
			props: { items: ITEMS, current: 1, clickable: false },
		});
		expect(container.querySelectorAll("button")).toHaveLength(0);
		for (const trigger of container.querySelectorAll(".ft-step-trigger")) {
			expect(trigger.hasAttribute("tabindex")).toBe(false);
		}
	});

	it("renders steps as real buttons when clickable is true", () => {
		const { container } = render(Harness, { props: { items: ITEMS, current: 1, clickable: true } });
		const buttons = container.querySelectorAll("button");
		expect(buttons).toHaveLength(3);
		for (const button of buttons) {
			expect(button.getAttribute("type")).toBe("button");
		}
	});

	it("jumps to the clicked step and reports it through onCurrentChange and onStepClick when clickable", async () => {
		const onCurrentChange = vi.fn();
		const onStepClick = vi.fn();
		const { container } = render(Harness, {
			props: { items: ITEMS, current: 0, clickable: true, onCurrentChange, onStepClick },
		});

		const confirmationButton = stepByLabel(container, "Confirmation").querySelector("button")!;
		await fireEvent.click(confirmationButton);

		expect(onStepClick).toHaveBeenCalledWith(2);
		expect(onCurrentChange).toHaveBeenCalledWith(2);
		expect(stepByLabel(container, "Confirmation").getAttribute("aria-current")).toBe("step");
	});

	it("does nothing on click when clickable is false, even dispatched directly at the trigger", async () => {
		const onCurrentChange = vi.fn();
		const onStepClick = vi.fn();
		const { container } = render(Harness, {
			props: { items: ITEMS, current: 0, clickable: false, onCurrentChange, onStepClick },
		});

		const trigger = stepByLabel(container, "Confirmation").querySelector(".ft-step-trigger")!;
		await fireEvent.click(trigger);

		expect(onStepClick).not.toHaveBeenCalled();
		expect(onCurrentChange).not.toHaveBeenCalled();
	});

	it("round-trips current through bind:current", async () => {
		const { container, getByTestId } = render(Harness, {
			props: { items: ITEMS, current: 0, clickable: true },
		});

		expect(getByTestId("bound-current").textContent).toBe("0");
		const profileButton = stepByLabel(container, "Profile").querySelector("button")!;
		await fireEvent.click(profileButton);
		expect(getByTestId("bound-current").textContent).toBe("1");
	});

	it("round-trips the ol element through bind:ref", () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		expect(list(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("sets data-orientation on the root and each step, defaulting to horizontal", () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		expect(list(container).getAttribute("data-orientation")).toBe("horizontal");
		expect(items(container)[0].getAttribute("data-orientation")).toBe("horizontal");
	});

	it("switches to vertical orientation on both the root and every step", () => {
		const { container } = render(Harness, { props: { items: ITEMS, orientation: "vertical" } });
		expect(list(container).getAttribute("data-orientation")).toBe("vertical");
		for (const li of items(container)) {
			expect(li.getAttribute("data-orientation")).toBe("vertical");
		}
	});

	it("still connects exactly n-1 segments in vertical orientation", () => {
		const { container } = render(Harness, { props: { items: ITEMS, orientation: "vertical" } });
		expect(connectors(container)).toHaveLength(2);
	});

	it("renders an optional description line under the label", () => {
		const { container } = render(Harness, {
			props: { items: [{ label: "Account", description: "Basic info" }] },
		});
		expect(container.textContent).toContain("Basic info");
	});

	it("lets custom children content override the bullet glyph", () => {
		const { container } = render(Step, {
			props: {
				label: "Custom",
				children: createRawSnippet(() => ({ render: () => "<em>★</em>" })),
			},
		});
		expect(container.querySelector("em")?.textContent).toBe("★");
	});

	it("degrades to a plain, upcoming, non-focusable item when a Step renders outside a Stepper", () => {
		const { container } = render(Step, { props: { label: "Solo" } });
		const li = container.querySelector("li")!;

		expect(li.dataset.status).toBe("upcoming");
		expect(li.hasAttribute("aria-current")).toBe(false);
		expect(container.querySelector("button")).toBeFalsy();
	});

	it("merges the class prop onto the ol root and a Step's li", () => {
		const { container: rootContainer } = render(Stepper, { props: { class: "mt-4" } });
		expect(list(rootContainer).className).toContain("mt-4");

		const { container: stepContainer } = render(Step, { props: { label: "X", class: "pl-2" } });
		expect(stepContainer.querySelector("li")?.className).toContain("pl-2");
	});

	// The bullet fill, its label colour, the halo around the current bullet and
	// the connector behind it now crossfade over 150 ms instead of snapping.
	// The transition hangs off the two base classes rather than off each status
	// modifier, so this pins that both base classes are actually on the
	// elements — without them the rule would select nothing and the whole
	// change would silently do nothing.
	it("carries the base bullet and connector classes the transition hangs off", () => {
		const { container } = render(Harness, { props: { items: ITEMS, current: 1 } });

		const bullets = Array.from(container.querySelectorAll(".ft-step-bullet"));
		expect(bullets).toHaveLength(ITEMS.length);
		expect(connectors(container).length).toBeGreaterThan(0);

		// The status modifiers still ride on top of the base class, not instead
		// of it.
		expect(bullets.some((b) => b.className.includes("ft-step-bullet-current"))).toBe(true);
		expect(bullets.some((b) => b.className.includes("ft-step-bullet-done"))).toBe(true);
	});

	it("reduced motion: the status colours still cross-fade, because none of them is travel", () => {
		const real = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			...real(query),
			matches: true,
		})) as typeof window.matchMedia;

		try {
			// Deliberate: the bullet/connector transition is colour and a static
			// halo, neither of which moves anything, so it is declared outside any
			// `prefers-reduced-motion` query. Suppressing it would make the stepper
			// flicker rather than settle. jsdom cannot read the rule, so what this
			// pins is that advancing a step still produces the same class contract
			// under the preference.
			const { container } = render(Harness, { props: { items: ITEMS, current: 0 } });
			expect(stepByLabel(container, "Account").dataset.status).toBe("current");

			const { container: laterContainer } = render(Harness, {
				props: { items: ITEMS, current: 2 },
			});
			expect(stepByLabel(laterContainer, "Account").dataset.status).toBe("done");
			expect(stepByLabel(laterContainer, "Confirmation").dataset.status).toBe("current");
		} finally {
			window.matchMedia = real;
		}
	});

	it("works uncontrolled, with neither current nor onCurrentChange passed in", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, clickable: true } });
		expect(stepByLabel(container, "Account").getAttribute("aria-current")).toBe("step");

		const profileButton = stepByLabel(container, "Profile").querySelector("button")!;
		await fireEvent.click(profileButton);
		expect(stepByLabel(container, "Profile").getAttribute("aria-current")).toBe("step");
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays the select cue exactly once when sound is enabled and a clickable step moves to a different step", async () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, current: 0, clickable: true, sound: true },
			});

			const confirmationButton = stepByLabel(container, "Confirmation").querySelector("button")!;
			await fireEvent.click(confirmationButton);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, current: 0, clickable: true },
			});

			const confirmationButton = stepByLabel(container, "Confirmation").querySelector("button")!;
			await fireEvent.click(confirmationButton);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when the root is not clickable, even dispatched directly at the trigger", () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, current: 0, clickable: false, sound: true },
			});

			const trigger = stepByLabel(container, "Confirmation").querySelector(".ft-step-trigger")!;
			trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing on a re-click of the already-current step, though onStepClick still fires — the changed-only guard", async () => {
			const onStepClick = vi.fn();
			const { container } = render(Harness, {
				props: { items: ITEMS, current: 1, clickable: true, sound: true, onStepClick },
			});

			const profileButton = stepByLabel(container, "Profile").querySelector("button")!;
			await fireEvent.click(profileButton);

			expect(play).not.toHaveBeenCalled();
			expect(onStepClick).toHaveBeenCalledTimes(1);
			expect(onStepClick).toHaveBeenCalledWith(1);
		});
	});
});
