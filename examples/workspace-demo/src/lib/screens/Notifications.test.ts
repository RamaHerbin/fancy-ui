import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScreenHarness from "$lib/test/ScreenHarness.svelte";
import { expectToast, makeApi, screenRoot, waitForState } from "$lib/test/screen-kit.js";
import { clearToasts } from "$lib/test/toast-tracker.js";
import Notifications from "./Notifications.svelte";

vi.mock("fancy-ui-svelte", async (original) =>
	(await import("$lib/test/toast-tracker.js")).withTracking(await original())
);

afterEach(() => {
	cleanup();
	clearToasts();
});

const mount = (api: ReturnType<typeof makeApi>) =>
	render(ScreenHarness, { screen: Notifications, api });

const unread = async (api: ReturnType<typeof makeApi>) =>
	(await api.listNotifications()).filter((n) => !n.read).length;

describe("Notifications screen states", () => {
	it("loading: skeleton rows, no list yet", () => {
		mount(makeApi({}, { pending: true }));
		expect(screenRoot("notifications").dataset.state).toBe("loading");
		expect(screenRoot("notifications")).toHaveAttribute("aria-busy", "true");
		expect(screen.queryByRole("list")).toBeNull();
	});

	it("ready: newest first, unread ones marked and counted", async () => {
		mount(makeApi());
		await waitForState("notifications", "ready");
		const rows = screen.getAllByRole("listitem");
		expect(rows).toHaveLength(6);
		expect(rows[0]).toHaveTextContent("Theo mentioned you in Onboarding copy");
		expect(rows[0]).toHaveTextContent("Unread");
		expect(rows[5]).not.toHaveTextContent("Unread");
		expect(screen.getByText("3 unread")).toBeInTheDocument();
	});

	it("empty: nothing to show and nothing to press", async () => {
		mount(makeApi({ scenario: "empty" }));
		await waitForState("notifications", "empty");
		expect(screen.getByRole("heading", { name: "No notifications yet" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Mark all as read" })).toBeNull();
	});

	it("error: retry recovers", async () => {
		mount(makeApi({ failure: "once" }));
		await waitForState("notifications", "error");
		await fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		await waitForState("notifications", "ready");
	});
});

describe("Notifications screen reading", () => {
	it("marks one notification read", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("notifications", "ready");
		await fireEvent.click(
			screen.getByRole("button", { name: "Mark as read: Theo mentioned you in Onboarding copy" })
		);
		await expectToast("2 unread");
		expect(await unread(api)).toBe(2);
	});

	it("marks everything read in one step and Undo restores exactly those", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("notifications", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
		await expectToast("All caught up");
		expect(await unread(api)).toBe(0);

		await fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
		await expectToast("3 unread");
		expect(await unread(api)).toBe(3);
	});

	it("leaves the list as it was and says so when the call fails", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("notifications", "ready");
		api.configure({ failure: "always" });
		await fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
		await expectToast("Couldn’t update your notifications");
		expect(screen.getByText("3 unread")).toBeInTheDocument();
	});
});
