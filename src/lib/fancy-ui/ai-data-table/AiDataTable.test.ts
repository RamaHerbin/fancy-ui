import { render, cleanup } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect } from "vitest";
import AiDataTable from "./AiDataTable.svelte";
import type { AiDataTableColumn, AiDataTableRow } from "./AiDataTable.svelte";

const COLUMNS: AiDataTableColumn[] = [
	{ key: "option", label: "Option" },
	{ key: "latency", label: "p95 latency (ms)", numeric: true },
	{ key: "selfHosted", label: "Self-hosted" },
	{ key: "sla", label: "SLA" },
];

const ROWS: AiDataTableRow[] = [
	{ option: "Managed cluster", latency: 42, selfHosted: false, sla: "99.95%" },
	{ option: "Serverless pool", latency: 88, selfHosted: false, sla: "99.9%" },
	{ option: "Self-run nodes", latency: 31, selfHosted: true, sla: null },
];

function headers(container: HTMLElement): HTMLTableCellElement[] {
	return [...container.querySelectorAll("thead th")] as HTMLTableCellElement[];
}

function bodyRows(container: HTMLElement): HTMLTableRowElement[] {
	return [...container.querySelectorAll("tbody tr")] as HTMLTableRowElement[];
}

function cellsOf(row: HTMLTableRowElement): HTMLTableCellElement[] {
	return [...row.querySelectorAll("td")] as HTMLTableCellElement[];
}

describe("AiDataTable", () => {
	afterEach(cleanup);

	it("renders one header per column, in order, inside a real table", () => {
		const { container } = render(AiDataTable, { props: { columns: COLUMNS, rows: ROWS } });

		expect(container.querySelector("table")).not.toBeNull();
		expect(headers(container).map((th) => th.textContent)).toEqual([
			"Option",
			"p95 latency (ms)",
			"Self-hosted",
			"SLA",
		]);
	});

	it("scopes every header to its column", () => {
		const { container } = render(AiDataTable, { props: { columns: COLUMNS, rows: ROWS } });

		for (const th of headers(container)) {
			expect(th.getAttribute("scope")).toBe("col");
		}
	});

	it("renders one row per record, reading each cell by its column key", () => {
		const { container } = render(AiDataTable, { props: { columns: COLUMNS, rows: ROWS } });
		const rows = bodyRows(container);

		expect(rows).toHaveLength(3);
		// The boolean cell carries its glyph and the words for it, in that order.
		expect(cellsOf(rows[0]).map((td) => td.textContent?.trim())).toEqual([
			"Managed cluster",
			"42",
			"– False",
			"99.95%",
		]);
	});

	it("right-aligns numeric columns and gives them tabular figures", () => {
		const { container } = render(AiDataTable, { props: { columns: COLUMNS, rows: ROWS } });
		const latencyHeader = headers(container)[1];
		const latencyCell = cellsOf(bodyRows(container)[0])[1];

		expect(latencyHeader.className).toContain("text-right");
		expect(latencyHeader.className).toContain("tabular-nums");
		expect(latencyCell.className).toContain("text-right");
		expect(latencyCell.className).toContain("tabular-nums");
	});

	it("lets an explicit align beat the numeric default, and leaves prose on the left", () => {
		const { container } = render(AiDataTable, {
			props: {
				columns: [
					{ key: "n", label: "N", numeric: true, align: "center" },
					{ key: "note", label: "Note" },
				],
				rows: [{ n: 1, note: "why" }],
			},
		});

		expect(headers(container)[0].className).toContain("text-center");
		expect(headers(container)[0].className).not.toContain("text-right");
		expect(headers(container)[1].className).toContain("text-left");
	});

	it("renders true as a check that says so out loud", () => {
		const { container } = render(AiDataTable, { props: { columns: COLUMNS, rows: ROWS } });
		const cell = cellsOf(bodyRows(container)[2])[2];

		const glyph = cell.querySelector(".ft-datatable-true") as SVGElement;
		expect(glyph).not.toBeNull();
		expect(glyph.getAttribute("aria-hidden")).toBe("true");
		expect(cell.querySelector(".sr-only")?.textContent).toBe("True");
	});

	it("renders false as a muted dash that says so out loud", () => {
		const { container } = render(AiDataTable, { props: { columns: COLUMNS, rows: ROWS } });
		const cell = cellsOf(bodyRows(container)[0])[2];

		const glyph = cell.querySelector(".ft-datatable-false") as HTMLElement;
		expect(glyph.textContent).toBe("–");
		expect(glyph.getAttribute("aria-hidden")).toBe("true");
		expect(cell.querySelector(".sr-only")?.textContent).toBe("False");
	});

	it("marks a null cell with an em dash rather than leaving it blank", () => {
		const { container } = render(AiDataTable, { props: { columns: COLUMNS, rows: ROWS } });
		const cell = cellsOf(bodyRows(container)[2])[3];

		const glyph = cell.querySelector(".ft-datatable-empty") as HTMLElement;
		expect(glyph.textContent).toBe("—");
		expect(glyph.getAttribute("aria-hidden")).toBe("true");
		expect(cell.querySelector(".sr-only")?.textContent).toBe("No value");
	});

	it("reads an empty string as the model saying nothing, like a null", () => {
		const { container } = render(AiDataTable, {
			props: { columns: COLUMNS, rows: [{ option: "Managed cluster", sla: "" }] },
		});
		const cell = cellsOf(bodyRows(container)[0])[3];

		expect(cell.querySelector(".ft-datatable-empty")?.textContent).toBe("—");
		expect(cell.querySelector(".sr-only")?.textContent).toBe("No value");
	});

	it("treats a key the row never mentioned as empty rather than crashing", () => {
		const { container } = render(AiDataTable, {
			props: { columns: COLUMNS, rows: [{ option: "Only a name" }] },
		});
		const cells = cellsOf(bodyRows(container)[0]);

		expect(cells).toHaveLength(4);
		expect(cells[1].querySelector(".ft-datatable-empty")?.textContent).toBe("—");
	});

	it("keeps the caption out of sight but in the accessibility tree by default", () => {
		const { container } = render(AiDataTable, {
			props: { columns: COLUMNS, rows: ROWS, caption: "Deployment options" },
		});
		const caption = container.querySelector("caption") as HTMLElement;

		expect(caption.textContent).toBe("Deployment options");
		expect(caption.classList.contains("sr-only")).toBe(true);
	});

	it("shows the caption as a muted line when asked", () => {
		const { container } = render(AiDataTable, {
			props: {
				columns: COLUMNS,
				rows: ROWS,
				caption: "Deployment options",
				captionVisible: true,
			},
		});
		const caption = container.querySelector("caption") as HTMLElement;

		expect(caption.classList.contains("sr-only")).toBe(false);
		expect(caption.className).toContain("text-muted-foreground");
	});

	it("renders no caption element when there is nothing to caption", () => {
		const { container } = render(AiDataTable, { props: { columns: COLUMNS, rows: ROWS } });

		expect(container.querySelector("caption")).toBeNull();
	});

	it("tints one column top to bottom, and only that one", () => {
		const { container } = render(AiDataTable, {
			props: { columns: COLUMNS, rows: ROWS, highlightColumn: "latency" },
		});

		expect(headers(container)[1].classList.contains("ft-datatable-highlight")).toBe(true);
		expect(headers(container)[0].classList.contains("ft-datatable-highlight")).toBe(false);

		for (const row of bodyRows(container)) {
			const cells = cellsOf(row);
			expect(cells[1].classList.contains("ft-datatable-highlight")).toBe(true);
			expect(cells[3].classList.contains("ft-datatable-highlight")).toBe(false);
		}
	});

	it("tints nothing when the highlight key matches no column", () => {
		const { container } = render(AiDataTable, {
			props: { columns: COLUMNS, rows: ROWS, highlightColumn: "nope" },
		});

		expect(container.querySelectorAll(".ft-datatable-highlight")).toHaveLength(0);
	});

	it("stripes every other row", () => {
		const { container } = render(AiDataTable, { props: { columns: COLUMNS, rows: ROWS } });
		const striped = bodyRows(container).map((tr) => tr.classList.contains("ft-datatable-zebra"));

		expect(striped).toEqual([false, true, false]);
	});

	it("hands the cell snippet the raw value and where it sits", () => {
		const { container } = render(AiDataTable, {
			props: {
				columns: COLUMNS,
				rows: ROWS,
				cell: createRawSnippet<[unknown, { row: number; key: string }]>((value, at) => ({
					render: () =>
						`<span class="custom-cell">${at().row}:${at().key}=${String(value())}</span>`,
				})),
			},
		});
		const cells = cellsOf(bodyRows(container)[1]);

		expect(container.querySelectorAll(".custom-cell")).toHaveLength(12);
		expect(cells[0].textContent?.trim()).toBe("1:option=Serverless pool");
		expect(cells[2].textContent?.trim()).toBe("1:selfHosted=false");
		// The default glyphs step aside entirely rather than doubling up.
		expect(container.querySelector(".ft-datatable-false")).toBeNull();
	});

	it("tightens the rows when dense", () => {
		const { container } = render(AiDataTable, {
			props: { columns: COLUMNS, rows: ROWS, dense: true },
		});
		const table = container.querySelector("table") as HTMLTableElement;

		expect(table.classList.contains("ft-datatable-dense")).toBe(true);
	});

	it("renders at full width without dense", () => {
		const { container } = render(AiDataTable, { props: { columns: COLUMNS, rows: ROWS } });
		const table = container.querySelector("table") as HTMLTableElement;

		expect(table.classList.contains("ft-datatable-dense")).toBe(false);
	});

	it("survives a model that returned columns but no rows", () => {
		const { container } = render(AiDataTable, { props: { columns: COLUMNS, rows: [] } });

		expect(headers(container)).toHaveLength(4);
		expect(bodyRows(container)).toHaveLength(0);
	});

	it("makes the scrolling wrapper reachable from the keyboard, and says what it is", () => {
		const { container } = render(AiDataTable, {
			props: { columns: COLUMNS, rows: ROWS, caption: "Deployment options" },
		});
		const root = container.firstElementChild as HTMLElement;

		expect(root.getAttribute("tabindex")).toBe("0");
		expect(root.getAttribute("role")).toBe("region");
		expect(root.getAttribute("aria-label")).toBe("Deployment options");
	});

	it("names the scroll region generically when there is no caption to borrow", () => {
		const { container } = render(AiDataTable, { props: { columns: COLUMNS, rows: ROWS } });
		const root = container.firstElementChild as HTMLElement;

		expect(root.getAttribute("aria-label")).toBe("Data table");
	});

	it("merges custom classes onto the scrolling root", () => {
		const { container } = render(AiDataTable, {
			props: { columns: COLUMNS, rows: ROWS, class: "my-table" },
		});
		const root = container.firstElementChild as HTMLElement;

		expect(root.className).toContain("my-table");
		expect(root.className).toContain("ft-datatable");
		expect(root.className).toContain("overflow-x-auto");
	});
});
