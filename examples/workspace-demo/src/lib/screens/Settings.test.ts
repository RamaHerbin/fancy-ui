import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScreenHarness from "$lib/test/ScreenHarness.svelte";
import {
	expectToast,
	makeApi,
	makeGatedApi,
	morphState,
	screenRoot,
	waitForState,
} from "$lib/test/screen-kit.js";
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
		await waitFor(() => expect(screen.getByRole("button", { name: "General" })).toHaveFocus());
	});

	it("ready: section titles are level-2 headings under the page title", async () => {
		mount(makeApi());
		await waitForState("settings", "ready");
		expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent?.trim())).toEqual([
			"General",
			"Notifications",
			"Privacy",
			"Security",
		]);
		expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
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
		// Unavailable while there is nothing to save, but still focusable, so a
		// keyboard user who just saved keeps their place when it goes back to rest.
		const idleSave = screen.getByRole("button", { name: "Save settings" });
		expect(idleSave).toHaveAttribute("aria-disabled", "true");
		expect(idleSave).not.toHaveAttribute("disabled");

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

describe("Settings screen save and publish", () => {
	it("shows the save in flight on the button and confirms only once it resolved", async () => {
		const gated = makeGatedApi();
		const saveSpy = vi.spyOn(gated.api, "saveSettings");
		mount(gated.api);
		await waitForState("settings", "ready");
		await fireEvent.input(screen.getByRole("textbox", { name: "Workspace name" }), {
			target: { value: "Orbit" },
		});
		const save = screen.getByRole("button", { name: "Save settings" });
		expect(morphState(save)).toBe("idle");

		gated.hold();
		await fireEvent.click(save);
		await waitFor(() => expect(morphState(save)).toBe("loading"));
		expect(save).toHaveAttribute("aria-busy", "true");
		// Pressing again while the first save is in flight sends nothing more.
		await fireEvent.click(save);
		expect(screen.queryByText("Settings saved")).toBeNull();
		expect(saveSpy).toHaveBeenCalledTimes(1);

		gated.release();
		await waitFor(() => expect(morphState(save)).toBe("success"));
		await expectToast("Settings saved");
		expect(saveSpy).toHaveBeenCalledTimes(1);
		expect((await gated.api.getSettings()).workspaceName).toBe("Orbit");
	});

	it("a failed save marks the button, keeps the edits and offers Retry in the toast", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("settings", "ready");
		await fireEvent.input(screen.getByRole("textbox", { name: "Workspace name" }), {
			target: { value: "Orbit" },
		});
		api.configure({ failure: "once" });
		const save = screen.getByRole("button", { name: "Save settings" });
		await fireEvent.click(save);
		await expectToast("Couldn’t save your settings");
		await waitFor(() => expect(morphState(save)).toBe("error"));

		await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
		await waitFor(() => expect(morphState(save)).toBe("success"));
		await waitFor(() => expect(screen.queryByRole("button", { name: "Retry" })).toBeNull());
		api.configure({ failure: "never" });
		expect((await api.getSettings()).workspaceName).toBe("Orbit");
	});
});
