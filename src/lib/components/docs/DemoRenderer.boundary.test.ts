import { render, cleanup, waitFor } from "@testing-library/svelte";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	it,
	expect,
	vi,
	type MockInstance,
} from "vitest";
import DemoRenderer from "./DemoRenderer.svelte";

// The hero preview must never fail silently: a failed import is logged with its real
// error, and a demo that throws while rendering shows a visible error state.

beforeAll(() => {
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	);
	HTMLCanvasElement.prototype.getContext = (() => null) as any;
});

// Hoisted with the mocks below, which run before any top-level statement.
const { RENDER_ERROR, EXAMPLE_IMPORT_ERROR, MODULE_IMPORT_ERROR } = vi.hoisted(() => ({
	RENDER_ERROR: new Error("hero exploded while rendering"),
	EXAMPLE_IMPORT_ERROR: new Error("hero example chunk failed to load"),
	MODULE_IMPORT_ERROR: new Error("component module failed to load"),
}));

// marquee resolves through its BasicUsage example (skipDirectRender).
vi.mock("./examples/marquee/BasicUsage.svelte", () => ({
	default: () => {
		throw RENDER_ERROR;
	},
}));

// border-beam also resolves through BasicUsage; this time the import itself rejects.
vi.mock("./examples/border-beam/BasicUsage.svelte", () => {
	throw EXAMPLE_IMPORT_ERROR;
});

// meteors renders directly from its index module.
vi.mock("$lib/fancy-ui/meteors/index.ts", () => {
	throw MODULE_IMPORT_ERROR;
});

const LOAD = { timeout: 10_000 };

let consoleError: MockInstance<typeof console.error>;

beforeEach(() => {
	consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	consoleError.mockRestore();
});

const loggedText = () =>
	consoleError.mock.calls.map((args) => args.map(String).join(" ")).join("\n");

// The real error object reaches the console, not only a message about it.
const loggedErrorObject = () =>
	consoleError.mock.calls.some((args) => args.some((a) => a instanceof Error));

describe("DemoRenderer failures", { timeout: 20_000 }, () => {
	it("shows a visible error state when the hero throws while rendering", async () => {
		const { container } = render(DemoRenderer, { slug: "marquee" });
		const failed = await waitFor(() => {
			const el = container.querySelector<HTMLElement>('[data-preview-error="render"]');
			expect(el).not.toBeNull();
			return el!;
		}, LOAD);
		expect(failed).toHaveTextContent("This preview failed to render.");
		expect(consoleError.mock.calls.flat()).toContain(RENDER_ERROR);
	});

	it("logs a failed example import instead of swallowing it", async () => {
		const { container } = render(DemoRenderer, { slug: "border-beam" });
		await waitFor(() => expect(loggedText()).toContain("border-beam"), LOAD);
		expect(loggedErrorObject()).toBe(true);
		// The visitor gets the visible error state, not a spinner forever or an empty frame.
		await waitFor(
			() => expect(container.querySelector('[data-preview-error="import"]')).not.toBeNull(),
			LOAD
		);
	});

	it("logs a failed component module import", async () => {
		const { container } = render(DemoRenderer, { slug: "meteors" });
		await waitFor(() => expect(loggedText()).toContain("meteors"), LOAD);
		expect(loggedErrorObject()).toBe(true);
		const failed = await waitFor(() => {
			const el = container.querySelector<HTMLElement>('[data-preview-error="import"]');
			expect(el).not.toBeNull();
			return el!;
		}, LOAD);
		// The raw error goes to the console, never into the page.
		expect(failed.textContent).not.toContain("[vitest]");
	});
});
