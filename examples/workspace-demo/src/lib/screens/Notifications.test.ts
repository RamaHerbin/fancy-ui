import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScreenHarness from "$lib/test/ScreenHarness.svelte";
import { expectToast, makeApi, screenRoot, toastOf, waitForState } from "$lib/test/screen-kit.js";
import { clearToasts } from "$lib/test/toast-tracker.js";
import { UNDO_WINDOW_MS } from "./undo.js";
import Notifications from "./Notifications.svelte";

vi.mock("fancy-ui-svelte", async (original) =>
	(await import("$lib/test/toast-tracker.js")).withTracking(await original())
);

afterEach(() => {
	cleanup();
	clearToasts();
	vi.useRealTimers();
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

		await fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
		await expectToast("3 unread");
		expect(await unread(api)).toBe(3);
	});

	it("leaves the list as it was and says so when the call fails", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const api = makeApi();
		mount(api);
		await waitForState("notifications", "ready");
		api.configure({ failure: "always" });
		await fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
		await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 100);
		await expectToast("Couldn’t update your notifications");
		expect(screen.getByText("3 unread")).toBeInTheDocument();
	});
});

describe("Notifications screen grouped undo", () => {
	it("mark all read is optimistic: nothing is sent until the undo window closes", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const api = makeApi();
		mount(api);
		await waitForState("notifications", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
		expect(screen.getByText("All caught up")).toBeInTheDocument();
		expect(await unread(api)).toBe(3);
		const panel = toastOf(await screen.findByRole("button", { name: "Undo" }));
		expect(panel.querySelector(".ft-toast-progress")).not.toBeNull();

		await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 100);
		expect(await unread(api)).toBe(0);
		await waitFor(() => expect(screen.queryByRole("button", { name: "Undo" })).toBeNull());
	});

	it("Undo restores the batch and never calls the service", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const api = makeApi();
		const spy = vi.spyOn(api, "setNotificationsRead");
		mount(api);
		await waitForState("notifications", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
		await fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
		expect(screen.getByText("3 unread")).toBeInTheDocument();
		await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS * 2);
		expect(spy).not.toHaveBeenCalled();
		expect(await unread(api)).toBe(3);
	});

	it("one marked unread again during the window stays unread after the batch commits", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const api = makeApi();
		mount(api);
		await waitForState("notifications", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
		await fireEvent.click(
			screen.getByRole("button", { name: "Mark as unread: Theo mentioned you in Onboarding copy" })
		);
		await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 100);
		const theo = (await api.listNotifications()).find((n) => n.title.startsWith("Theo mentioned"));
		expect(theo?.read).toBe(false);
		expect(await unread(api)).toBe(1);
		expect(screen.getByText("1 unread")).toBeInTheDocument();
	});

	it("clear read removes the read ones with one undo", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("notifications", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Clear read" }));
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
		await expectToast("Cleared 3 notifications");
		await fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
		expect(screen.getAllByRole("listitem")).toHaveLength(6);
		expect(await api.listNotifications()).toHaveLength(6);
	});

	it("clear read is committed once the window closes", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const api = makeApi();
		mount(api);
		await waitForState("notifications", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Clear read" }));
		expect(await api.listNotifications()).toHaveLength(6);
		await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 100);
		expect(await api.listNotifications()).toHaveLength(3);
		expect(screen.queryByRole("button", { name: "Clear read" })).toBeNull();
	});

	it("a refused clear brings the notifications back and says so", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const api = makeApi();
		mount(api);
		await waitForState("notifications", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Clear read" }));
		api.configure({ failure: "always" });
		await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 100);
		await expectToast("Couldn’t update your notifications");
		expect(screen.getAllByRole("listitem")).toHaveLength(6);
	});

	it("leaving the screen commits what is pending", async () => {
		const api = makeApi();
		const view = mount(api);
		await waitForState("notifications", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
		await screen.findByRole("button", { name: "Undo" });
		await view.rerender({ shown: false });
		await waitFor(() => expect(screen.queryByRole("button", { name: "Undo" })).toBeNull());
		await waitFor(async () => expect(await unread(api)).toBe(0));
	});
});
