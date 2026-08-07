import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import SubagentList from "./SubagentList.svelte";
import type { SubagentData } from "../_internals/ai-types.js";

const agents: SubagentData[] = [
	{
		id: "a",
		name: "Researcher",
		task: "Read the changelog for breaking changes",
		status: "running",
		progress: 0.42,
		model: "mini",
	},
	{ id: "b", name: "Writer", task: "Draft the migration note", status: "done" },
	{ id: "c", name: "Reviewer", task: "Check the code samples", status: "pending" },
];

function agent(overrides: Partial<SubagentData> = {}): SubagentData {
	return {
		id: "a",
		name: "Researcher",
		task: "Read the changelog",
		status: "running",
		...overrides,
	};
}

function rows(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>(".ft-subagents-row")];
}

function list(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="list"]') as HTMLElement;
}

function bar(container: HTMLElement): HTMLElement | null {
	return container.querySelector('[role="progressbar"]');
}

function states(container: HTMLElement): string[] {
	return [...container.querySelectorAll(".ft-subagents-state")].map((el) => el.textContent ?? "");
}

describe("SubagentList", () => {
	afterEach(cleanup);

	it("renders one row per agent", () => {
		const { container } = render(SubagentList, { props: { agents } });

		expect(rows(container)).toHaveLength(3);
		expect(container.querySelectorAll('[role="list"] > li')).toHaveLength(3);
	});

	it("renders each agent's name", () => {
		const { container } = render(SubagentList, { props: { agents } });
		const names = [...container.querySelectorAll(".ft-subagents-name")].map((el) => el.textContent);

		expect(names).toEqual(["Researcher", "Writer", "Reviewer"]);
	});

	it("names the list by how many workers are still running", () => {
		const { container } = render(SubagentList, {
			props: {
				agents: [
					agent({ id: "a", status: "running" }),
					agent({ id: "b", status: "running" }),
					agent({ id: "c", status: "pending" }),
				],
			},
		});

		expect(list(container).getAttribute("aria-label")).toBe("2 agents running");
	});

	it("drops the plural for a single running worker", () => {
		const { container } = render(SubagentList, {
			props: { agents: [agent({ status: "running" }), agent({ id: "b", status: "done" })] },
		});

		expect(list(container).getAttribute("aria-label")).toBe("1 agent running");
	});

	it("switches the derived label to the total once the last worker lands", () => {
		const { container } = render(SubagentList, {
			props: {
				agents: [
					agent({ id: "a", status: "done" }),
					agent({ id: "b", status: "done" }),
					agent({ id: "c", status: "done" }),
				],
			},
		});

		expect(list(container).getAttribute("aria-label")).toBe("3 agents finished");
	});

	it("counts a failed or abandoned worker as finished too", () => {
		const { container } = render(SubagentList, {
			props: {
				agents: [agent({ id: "a", status: "error" }), agent({ id: "b", status: "cancelled" })],
			},
		});

		expect(list(container).getAttribute("aria-label")).toBe("2 agents finished");
	});

	it("falls back to the headcount when nothing has started yet", () => {
		const { container } = render(SubagentList, {
			props: {
				agents: [agent({ id: "a", status: "pending" }), agent({ id: "b", status: "done" })],
			},
		});

		expect(list(container).getAttribute("aria-label")).toBe("2 agents");
	});

	it("still names an empty list", () => {
		const { container } = render(SubagentList, { props: { agents: [] } });

		expect(list(container).getAttribute("aria-label")).toBe("No agents");
		expect(rows(container)).toHaveLength(0);
	});

	it("lets an explicit label win over the derived one", () => {
		const { container } = render(SubagentList, { props: { agents, label: "Research fan-out" } });

		expect(list(container).getAttribute("aria-label")).toBe("Research fan-out");
	});

	it.each([
		["pending", "ft-status-pending"],
		["running", "ft-status-running"],
		["done", "ft-status-done"],
		["error", "ft-status-error"],
		["cancelled", "ft-status-cancelled"],
	] as const)("marks the status dot for %s", (status, className) => {
		const { container } = render(SubagentList, { props: { agents: [agent({ status })] } });
		const dot = container.querySelector(".ft-subagents-dot") as HTMLElement;

		expect(dot.classList.contains(className)).toBe(true);
		expect(dot.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders the model badge only for the agents that name a model", () => {
		const { container } = render(SubagentList, { props: { agents } });
		const badges = container.querySelectorAll(".ft-subagents-model");

		expect(badges).toHaveLength(1);
		expect(badges[0].textContent).toBe("mini");
	});

	it("draws the progress bar at the reported fraction", () => {
		const { container } = render(SubagentList, {
			props: { agents: [agent({ status: "running", progress: 0.42 })] },
		});
		const track = bar(container) as HTMLElement;
		const fill = track.querySelector(".ft-subagents-progress-fill") as HTMLElement;

		expect(fill.style.width).toBe("42%");
		expect(track.getAttribute("aria-valuenow")).toBe("42");
		expect(track.getAttribute("aria-valuemin")).toBe("0");
		expect(track.getAttribute("aria-valuemax")).toBe("100");
		expect(track.getAttribute("aria-label")).toBe("Running");
	});

	it.each([
		[-0.5, "0%"],
		[1.4, "100%"],
	])("clamps a progress of %s into the track", (progress, expected) => {
		const { container } = render(SubagentList, {
			props: { agents: [agent({ status: "running", progress })] },
		});
		const fill = container.querySelector(".ft-subagents-progress-fill") as HTMLElement;

		expect(fill.style.width).toBe(expected);
	});

	it("shows the status word instead when a running worker reports no progress", () => {
		const { container } = render(SubagentList, {
			props: { agents: [agent({ status: "running" })] },
		});

		expect(bar(container)).toBeNull();
		expect(states(container)).toEqual(["running"]);
	});

	it("keeps the bar off a finished worker even when it left a progress value behind", () => {
		const { container } = render(SubagentList, {
			props: { agents: [agent({ status: "done", progress: 1 })] },
		});

		expect(bar(container)).toBeNull();
		expect(states(container)).toEqual(["done"]);
	});

	it.each([
		["pending", "pending"],
		["done", "done"],
		["error", "error"],
		["cancelled", "cancelled"],
	] as const)("captions a %s worker in words", (status, word) => {
		const { container } = render(SubagentList, { props: { agents: [agent({ status })] } });

		expect(states(container)).toEqual([word]);
	});

	it("renders the task line by default, with the full text kept in a title", () => {
		const { container } = render(SubagentList, { props: { agents } });
		const tasks = [...container.querySelectorAll(".ft-subagents-task")];

		expect(tasks).toHaveLength(3);
		expect(tasks[0].textContent).toBe("Read the changelog for breaking changes");
		expect(tasks[0].getAttribute("title")).toBe("Read the changelog for breaking changes");
	});

	it("drops the task line in compact mode, keeping the name and the status", () => {
		const { container } = render(SubagentList, { props: { agents, compact: true } });

		expect(container.querySelectorAll(".ft-subagents-task")).toHaveLength(0);
		expect(container.querySelectorAll(".ft-subagents-name")).toHaveLength(3);
		expect(bar(container)).not.toBeNull();
		expect((container.firstElementChild as HTMLElement).className).toContain(
			"ft-subagents-compact"
		);
	});

	it("leaves the rows inert without onSelect", () => {
		const { container } = render(SubagentList, { props: { agents } });

		expect(container.querySelectorAll("button")).toHaveLength(0);
	});

	it("turns every row into a button that reports the agent and its index", async () => {
		const onSelect = vi.fn();
		const { container } = render(SubagentList, { props: { agents, onSelect } });
		const buttons = container.querySelectorAll("button");

		expect(buttons).toHaveLength(3);

		await fireEvent.click(buttons[1]);
		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenLastCalledWith(agents[1], 1);
	});

	it("lets the item snippet replace the row body, keeping the status dot", () => {
		const { container } = render(SubagentList, {
			props: {
				agents,
				item: createRawSnippet<[SubagentData, number]>((data, index) => ({
					render: () => `<span class="custom-row">${index()}: ${data().name}</span>`,
				})),
			},
		});
		const custom = [...container.querySelectorAll(".custom-row")].map((el) => el.textContent);

		expect(custom).toEqual(["0: Researcher", "1: Writer", "2: Reviewer"]);
		expect(container.querySelectorAll(".ft-subagents-name")).toHaveLength(0);
		expect(container.querySelectorAll(".ft-subagents-dot")).toHaveLength(3);
	});

	it("speaks the status of a replaced row, since the dot is hidden from assistive tech", () => {
		const { container } = render(SubagentList, {
			props: {
				agents: [agent({ status: "error" })],
				item: createRawSnippet<[SubagentData, number]>(() => ({
					render: () => `<span class="custom-row">mine</span>`,
				})),
			},
		});

		expect(container.querySelector(".sr-only")?.textContent).toBe("Failed");
	});

	it("says nothing twice on a row that already captions itself", () => {
		const { container } = render(SubagentList, {
			props: { agents: [agent({ status: "done" }), agent({ id: "b", status: "pending" })] },
		});

		expect(container.querySelector(".sr-only")).toBeNull();
		expect(states(container)).toEqual(["done", "pending"]);
	});

	it("speaks the status of a row whose caption was replaced by a progress bar", () => {
		const { container } = render(SubagentList, {
			props: { agents: [agent({ status: "running", progress: 0.62 })], onSelect: vi.fn() },
		});
		const row = container.querySelector("button") as HTMLButtonElement;

		// A `progressbar` is children-presentational, so neither its own label nor
		// its value reaches the name of the button around it.
		expect(row.textContent).toContain("Running");
		expect(row.textContent).toContain("62%");
	});

	it("does not repeat the progress bar's own announcement on a non-selectable row", () => {
		const { container } = render(SubagentList, {
			props: { agents: [agent({ status: "running", progress: 0.62 })] },
		});

		// Outside a button the progress bar is its own object, independently
		// announced with its label and value — this text would only echo it.
		expect(container.querySelector(".sr-only")).toBeNull();
		expect(bar(container)?.getAttribute("aria-label")).toBe("Running");
		expect(bar(container)?.getAttribute("aria-valuenow")).toBe("62");
	});

	it("renders a fan-out that repeats an id instead of crashing on it", () => {
		// Keying on the id alone would throw `each_key_duplicate` before a single row
		// reached the DOM, and the ids here come from a model.
		const { container } = render(SubagentList, {
			props: {
				agents: [
					agent({ id: "worker", name: "Researcher" }),
					agent({ id: "worker", name: "Writer", status: "done" }),
					agent({ id: "worker", name: "Reviewer", status: "pending" }),
				],
			},
		});

		expect(rows(container)).toHaveLength(3);
		expect(
			[...container.querySelectorAll(".ft-subagents-name")].map((el) => el.textContent)
		).toEqual(["Researcher", "Writer", "Reviewer"]);
	});

	it("keeps the rows already on screen keyed the same when a worker is spawned", async () => {
		const { container, rerender } = render(SubagentList, { props: { agents } });
		const first = rows(container)[0];

		await rerender({ agents: [...agents, agent({ id: "d", name: "Auditor" })] });

		// Same node, not a remount: an appended worker must not replay every entrance.
		expect(rows(container)[0]).toBe(first);
		expect(rows(container)).toHaveLength(4);
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(SubagentList, { props: { agents, class: "my-fanout" } });
		const root = container.firstElementChild as HTMLElement;

		expect(root.className).toContain("my-fanout");
		expect(root.className).toContain("ft-subagents");
	});
});
