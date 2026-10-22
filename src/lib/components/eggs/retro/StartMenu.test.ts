import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import StartMenu from "./StartMenu.svelte";

const { markFound, trigger } = vi.hoisted(() => ({
	markFound: vi.fn(),
	trigger: vi.fn(async () => {}),
}));

vi.mock("../discovery.svelte.js", () => ({
	markFound,
	createEggsState: (total: number) => ({ found: new Set(), count: 0, total }),
}));
vi.mock("../runtime.svelte.js", () => ({ eggRuntime: { trigger } }));

describe("StartMenu", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("renders a menu with two items and focuses the first", () => {
		render(StartMenu, { onclose: vi.fn() });
		const items = screen.getAllByRole("menuitem");
		expect(screen.getByRole("menu").id).toBe("retro-start-menu");
		expect(items).toHaveLength(2);
		expect(document.activeElement).toBe(items[0]);
	});

	it("moves focus with the arrow keys", async () => {
		render(StartMenu, { onclose: vi.fn() });
		const [about, shut] = screen.getAllByRole("menuitem");
		await fireEvent.keyDown(about!, { key: "ArrowDown" });
		expect(document.activeElement).toBe(shut);
		await fireEvent.keyDown(shut!, { key: "ArrowDown" });
		expect(document.activeElement).toBe(about);
		await fireEvent.keyDown(about!, { key: "ArrowUp" });
		expect(document.activeElement).toBe(shut);
	});

	it("calls onclose on Escape", async () => {
		const onclose = vi.fn();
		render(StartMenu, { onclose });
		await fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
		expect(onclose).toHaveBeenCalledOnce();
	});

	it("About opens the about window and records the find; OK closes", async () => {
		const onclose = vi.fn();
		render(StartMenu, { onclose });
		await fireEvent.click(screen.getByRole("menuitem", { name: /about/i }));
		expect(markFound).toHaveBeenCalledWith("retro");
		expect(screen.getByText("ABOUT.EXE")).toBeTruthy();
		expect(screen.getByText(/Secrets found: 0 \//)).toBeTruthy();
		expect(screen.queryByRole("menu")).toBeNull();
		await fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(onclose).toHaveBeenCalledOnce();
	});

	it("Shut down closes the menu and fires the retro egg", async () => {
		const onclose = vi.fn();
		render(StartMenu, { onclose });
		await fireEvent.click(screen.getByRole("menuitem", { name: /shut down/i }));
		expect(onclose).toHaveBeenCalledOnce();
		expect(trigger).toHaveBeenCalledWith("retro");
		expect(markFound).not.toHaveBeenCalled();
	});
});
