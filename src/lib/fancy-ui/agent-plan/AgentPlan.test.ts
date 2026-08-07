import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import AgentPlan from "./AgentPlan.svelte";
import type { PlanStepData } from "../_internals/ai-types.js";

function step(overrides: Partial<PlanStepData> = {}): PlanStepData {
	return { id: "s1", label: "Read the failing test", status: "pending", ...overrides };
}

/** Three top-level steps, the middle one carrying two substeps: five rows, two done. */
function nested(): PlanStepData[] {
	return [
		step({ id: "s1", label: "Read the failing test", status: "done" }),
		step({
			id: "s2",
			label: "Locate the retry helper",
			status: "running",
			substeps: [
				step({ id: "s2a", label: "Search the repo", status: "done" }),
				step({ id: "s2b", label: "Open the module", status: "running" }),
			],
		}),
		step({ id: "s3", label: "Apply the fix", status: "pending" }),
	];
}

function rows(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>('[role="listitem"]')];
}

function labels(container: HTMLElement): string[] {
	return [...container.querySelectorAll(".ft-agentplan-step-label")].map(
		(el) => el.textContent ?? ""
	);
}

function count(container: HTMLElement): string {
	return container.querySelector(".ft-agentplan-count")?.textContent ?? "";
}

function bar(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-agentplan-bar");
}

function glyph(row: HTMLElement): HTMLElement {
	return row.querySelector(".ft-agentplan-glyph") as HTMLElement;
}

describe("AgentPlan", () => {
	afterEach(cleanup);

	it('heads the plan with its label, defaulting to "Plan"', () => {
		const { container } = render(AgentPlan, { props: { steps: [step()] } });

		expect(container.querySelector(".ft-agentplan-label")?.textContent).toBe("Plan");
	});

	it("uses the label it is given and names the list with it", () => {
		const { container } = render(AgentPlan, {
			props: { steps: [step()], label: "Migration plan" },
		});

		const heading = container.querySelector(".ft-agentplan-label") as HTMLElement;
		const list = container.querySelector('[role="list"]') as HTMLElement;

		expect(heading.textContent).toBe("Migration plan");
		expect(list.getAttribute("aria-labelledby")).toBe(heading.id);
	});

	it("counts substeps in the n/m total, not just the top-level steps", () => {
		const { container } = render(AgentPlan, { props: { steps: nested() } });

		expect(count(container)).toBe("2/5");
		expect(rows(container)).toHaveLength(5);
	});

	it("recounts when a step finishes", async () => {
		const { container, rerender } = render(AgentPlan, { props: { steps: nested() } });
		expect(count(container)).toBe("2/5");

		const finished = nested();
		finished[2].status = "done";
		await rerender({ steps: finished });

		expect(count(container)).toBe("3/5");
	});

	it.each([
		["pending", "ft-status-pending"],
		["running", "ft-status-running"],
		["done", "ft-status-done"],
		["error", "ft-status-error"],
		["cancelled", "ft-status-cancelled"],
	] as const)("marks the glyph for %s", (status, className) => {
		const { container } = render(AgentPlan, { props: { steps: [step({ status })] } });

		const row = rows(container)[0];
		expect(glyph(row).classList.contains(className)).toBe(true);
		expect(glyph(row).getAttribute("aria-hidden")).toBe("true");
		expect(row.dataset.status).toBe(status);
	});

	it("names each status out loud, since the glyph is hidden from assistive tech", () => {
		const { container } = render(AgentPlan, {
			props: { steps: [step({ status: "error" }), step({ id: "s2", status: "cancelled" })] },
		});

		expect([...container.querySelectorAll(".sr-only")].map((el) => el.textContent)).toEqual([
			"Failed",
			"Cancelled",
		]);
	});

	it("indents substeps one level, in visual order under their parent", () => {
		const { container } = render(AgentPlan, { props: { steps: nested() } });
		const all = rows(container);

		expect(labels(container)).toEqual([
			"Read the failing test",
			"Locate the retry helper",
			"Search the repo",
			"Open the module",
			"Apply the fix",
		]);
		expect(all.map((row) => row.classList.contains("ft-agentplan-sub"))).toEqual([
			false,
			false,
			true,
			true,
			false,
		]);
		// The rail stops on the last child of the group rather than running on.
		expect(all.map((row) => row.classList.contains("ft-agentplan-sub-last"))).toEqual([
			false,
			false,
			false,
			true,
			false,
		]);
	});

	it("flattens anything nested deeper than one level instead of indenting further", () => {
		const steps: PlanStepData[] = [
			step({
				id: "s1",
				label: "Ship it",
				substeps: [
					step({
						id: "s1a",
						label: "Build",
						substeps: [step({ id: "s1a1", label: "Compile" })],
					}),
					step({ id: "s1b", label: "Publish" }),
				],
			}),
		];

		const { container } = render(AgentPlan, { props: { steps } });

		expect(labels(container)).toEqual(["Ship it", "Build", "Compile", "Publish"]);
		expect(rows(container).map((row) => row.classList.contains("ft-agentplan-sub"))).toEqual([
			false,
			true,
			true,
			true,
		]);
		expect(count(container)).toBe("0/4");
	});

	it("marks the first running step as the current one, and only that one", () => {
		const steps = nested();
		steps[2].status = "running";
		const { container } = render(AgentPlan, { props: { steps } });

		const current = rows(container).map((row) => row.getAttribute("aria-current"));
		expect(current).toEqual([null, "step", null, null, null]);
	});

	it("moves aria-current onto the substep once the parent is done", async () => {
		const steps = nested();
		steps[1].status = "done";
		const { container } = render(AgentPlan, { props: { steps } });

		expect(rows(container).map((row) => row.getAttribute("aria-current"))).toEqual([
			null,
			null,
			null,
			"step",
			null,
		]);
	});

	it("marks nothing current when the plan has not started", () => {
		const { container } = render(AgentPlan, {
			props: { steps: [step(), step({ id: "s2" })] },
		});

		expect(rows(container).every((row) => row.getAttribute("aria-current") === null)).toBe(true);
	});

	it("renders the detail line under the step it belongs to", () => {
		const { container } = render(AgentPlan, {
			props: { steps: [step({ detail: "tests/retry.spec.ts" })] },
		});

		const detail = container.querySelector(".ft-agentplan-detail") as HTMLElement;
		expect(detail.textContent).toBe("tests/retry.spec.ts");
		expect(detail.getAttribute("title")).toBe("tests/retry.spec.ts");
	});

	it("says nothing where there is no detail", () => {
		const { container } = render(AgentPlan, { props: { steps: [step()] } });

		expect(container.querySelector(".ft-agentplan-detail")).toBeNull();
	});

	it("mutes a finished step without striking it through", () => {
		const { container } = render(AgentPlan, {
			props: { steps: [step({ status: "done" }), step({ id: "s2", status: "running" })] },
		});

		const [done, running] = [
			...container.querySelectorAll<HTMLElement>(".ft-agentplan-step-label"),
		];
		expect(done.className).toContain("text-muted-foreground");
		expect(done.className).not.toContain("line-through");
		expect(running.className).toContain("font-medium");
	});

	it("sizes the progress bar to the done fraction, substeps included", () => {
		const { container } = render(AgentPlan, { props: { steps: nested() } });

		expect(bar(container)?.style.width).toBe("40%");
	});

	it("leaves the bar empty rather than dividing by nothing", () => {
		const { container } = render(AgentPlan, { props: { steps: [] } });

		expect(count(container)).toBe("0/0");
		expect(bar(container)?.style.width).toBe("0%");
		expect(rows(container)).toHaveLength(0);
	});

	it("drops the bar when progress is turned off, keeping the count", () => {
		const { container } = render(AgentPlan, {
			props: { steps: nested(), showProgress: false },
		});

		expect(container.querySelector(".ft-agentplan-track")).toBeNull();
		expect(count(container)).toBe("2/5");
	});

	it("leaves rows inert until onSelect says otherwise", () => {
		const { container } = render(AgentPlan, { props: { steps: nested() } });

		expect(container.querySelectorAll("button")).toHaveLength(0);
	});

	it("turns every row into a button when onSelect is supplied", async () => {
		const onSelect = vi.fn();
		const { container } = render(AgentPlan, { props: { steps: nested(), onSelect } });

		const buttons = container.querySelectorAll("button");
		expect(buttons).toHaveLength(5);

		// The third row is the first substep: a nested step reports itself, not its parent.
		await fireEvent.click(buttons[2]);
		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect.mock.calls[0][0]).toMatchObject({ id: "s2a", label: "Search the repo" });
	});

	it("lets the item snippet replace the row body, keeping the glyph", () => {
		const { container } = render(AgentPlan, {
			props: {
				steps: nested(),
				item: createRawSnippet<[PlanStepData, number]>((stepArg, index) => ({
					render: () =>
						`<span class="custom-row">${index()}: ${(stepArg() as PlanStepData).label}</span>`,
				})),
			},
		});

		expect([...container.querySelectorAll(".custom-row")].map((el) => el.textContent)).toEqual([
			"0: Read the failing test",
			"1: Locate the retry helper",
			"2: Search the repo",
			"3: Open the module",
			"4: Apply the fix",
		]);
		expect(container.querySelector(".ft-agentplan-step-label")).toBeNull();
		expect(container.querySelectorAll(".ft-agentplan-glyph")).toHaveLength(5);
	});

	it("speaks the status of a custom row, since the sr-only label lives only in the default body", () => {
		const { container } = render(AgentPlan, {
			props: {
				steps: [step({ status: "error" })],
				item: createRawSnippet<[PlanStepData, number]>(() => ({
					render: () => `<span class="custom-row">mine</span>`,
				})),
			},
		});

		expect(container.querySelector(".sr-only")?.textContent).toBe("Failed");
	});

	it("renders a plan that repeats an id instead of crashing on it", () => {
		const steps: PlanStepData[] = [
			step({ id: "retry", label: "Retry the request", status: "done" }),
			step({ id: "retry", label: "Retry the request", status: "error" }),
			step({
				id: "retry",
				label: "Retry the request",
				status: "running",
				substeps: [step({ id: "retry", label: "Back off" })],
			}),
		];

		// Keying on the id alone would throw `each_key_duplicate` before a single
		// row reached the DOM, and the ids here come from a model.
		const { container } = render(AgentPlan, { props: { steps } });

		expect(rows(container)).toHaveLength(4);
		expect(count(container)).toBe("1/4");
	});

	it("keeps the rows already on screen keyed the same when the plan grows", async () => {
		const { container, rerender } = render(AgentPlan, { props: { steps: nested() } });
		const first = rows(container)[0];

		await rerender({ steps: [...nested(), step({ id: "s4", label: "Open a PR" })] });

		// Same node, not a remount: an appended step must not replay every entrance.
		expect(rows(container)[0]).toBe(first);
		expect(rows(container)).toHaveLength(6);
	});

	it("keeps a row's key stable when a step is inserted earlier in the plan", async () => {
		const { container, rerender } = render(AgentPlan, { props: { steps: nested() } });
		const last = rows(container)[rows(container).length - 1];

		// Inserted at the front rather than appended: keying by flattened position
		// would shift every row after the insertion point even though none of
		// their ids changed, tearing them down and rebuilding them for nothing.
		await rerender({ steps: [step({ id: "s0", label: "Set up the sandbox" }), ...nested()] });

		expect(rows(container)).toHaveLength(6);
		expect(rows(container)[rows(container).length - 1]).toBe(last);
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(AgentPlan, {
			props: { steps: [step()], class: "my-plan" },
		});
		const root = container.firstElementChild as HTMLElement;

		expect(root.className).toContain("my-plan");
		expect(root.className).toContain("ft-agentplan");
	});
});
