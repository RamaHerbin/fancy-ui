import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import PropsTable from "./PropsTable.svelte";

const PROPS = [
	{ name: "class", type: "string", description: "Extra classes" },
	{ name: "speed", type: "number", description: "Speed" },
	{ name: "onclick", type: "(event: MouseEvent) => void", description: "Click handler" },
	{ name: "children", type: "Snippet", description: "Content" },
	{ name: "open", type: "boolean", description: "Whether it is open; bindable" },
	{ name: "onzorbleflux", type: "() => void", description: "Unknown words" },
];

function portNames(container: HTMLElement): Record<string, string> {
	const out: Record<string, string> = {};
	for (const row of container.querySelectorAll("tbody tr")) {
		const svelte = row.querySelector("td code")!.textContent!.trim();
		const port = row.querySelector("[data-port-name]");
		if (port) out[svelte] = port.textContent!.trim();
		if (row.querySelector("[data-port-name-unknown]")) out[svelte] = "?";
	}
	return out;
}

describe("PropsTable", () => {
	afterEach(() => cleanup());

	it("shows only the Svelte names by default", () => {
		const { container } = render(PropsTable, { props: { props: PROPS } });
		expect(container.querySelectorAll("[data-port-name], [data-port-name-unknown]")).toHaveLength(
			0
		);
	});

	it("shows the React name next to each Svelte name that changes", () => {
		const { container } = render(PropsTable, { props: { props: PROPS, framework: "react" } });
		expect(portNames(container)).toEqual({
			class: "className",
			onclick: "onClick",
			onzorbleflux: "?",
		});
	});

	it("shows Vue slots and v-model names", () => {
		const { container } = render(PropsTable, { props: { props: PROPS, framework: "vue" } });
		expect(portNames(container)).toEqual({
			onclick: "onClick",
			children: "#default",
			open: "v-model:open",
			onzorbleflux: "?",
		});
	});
});
