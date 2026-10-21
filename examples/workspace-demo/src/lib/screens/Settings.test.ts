import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScreenHarness from "$lib/test/ScreenHarness.svelte";
import { expectToast, makeApi, screenRoot, waitForState } from "$lib/test/screen-kit.js";
import { clearToasts } from "$lib/test/toast-tracker.js";
import Settings from "./Settings.svelte";

vi.mock("fancy-ui-svelte", async (original) =>
	(await import("$lib/test/toast-tracker.js")).withTracking(await original())
);

afterEach(() => {
	cleanup();
	clearToasts();
});

const mount = (api: ReturnType<typeof makeApi>) => render(ScreenHarness, { screen: Settings, api });

describe("Settings screen states", () => {
	it("loading: skeletons, no sections yet", () => {
		mount(makeApi({}, { pending: true }));
		expect(screenRoot("settings").dataset.state).toBe("loading");
		expect(screenRoot("settings")).toHaveAttribute("aria-busy", "true");
		expect(screen.queryByRole("button", { name: "General" })).toBeNull();
	});

	it("ready: four sections, only General open", async () => {
		mount(makeApi());
		await waitForState("settings", "ready");
		for (const name of ["General", "Notifications", "Privacy", "Security"]) {
			expect(screen.getByRole("button", { name })).toBeInTheDocument();
		}
		expect(screen.getByRole("button", { name: "General" })).toHaveAttribute(
			"aria-expanded",
			"true"
		);
		expect(screen.getByRole("button", { name: "Security" })).toHaveAttribute(
			"aria-expanded",
			"false"
		);
		expect(screen.getByRole("textbox", { name: "Workspace name" })).toHaveValue("Orbit Atelier");
	});

	it("empty: a first launch asks to set the workspace up, then shows the sections", async () => {
		mount(makeApi({ scenario: "empty" }));
		await waitForState("settings", "empty");
		expect(screen.getByRole("heading", { name: "Set up your workspace" })).toBeInTheDocument();
		await fireEvent.click(screen.getByRole("button", { name: "Start with the basics" }));
		expect(screen.getByRole("button", { name: "General" })).toBeInTheDocument();
	});

	it("error: retry recovers", async () => {
		mount(makeApi({ failure: "once" }));
		await waitForState("settings", "error");
		await fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		await waitForState("settings", "ready");
	});
});

describe("Settings screen editing", () => {
	it("opens a section on demand and saves a changed switch", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("settings", "ready");
		expect(screen.getByRole("button", { name: "Save settings" })).toBeDisabled();

		await fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
		const mentions = screen.getByRole("switch", { name: "Mentions by email" });
		expect(mentions).toBeChecked();
		await fireEvent.click(mentions);

		await fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
		await expectToast("Settings saved");
		expect((await api.getSettings()).mentionsByEmail).toBe(false);
	});

	it("keeps the edits and says so when saving fails", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("settings", "ready");
		api.configure({ failure: "always" });
		await fireEvent.input(screen.getByRole("textbox", { name: "Workspace name" }), {
			target: { value: "Orbit" },
		});
		await fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
		await expectToast("Couldn’t save your settings");
		expect(screen.getByRole("textbox", { name: "Workspace name" })).toHaveValue("Orbit");
		api.configure({ failure: "never" });
		expect((await api.getSettings()).workspaceName).toBe("Orbit Atelier");
	});
});
