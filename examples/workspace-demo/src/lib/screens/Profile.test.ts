import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScreenHarness from "$lib/test/ScreenHarness.svelte";
import { expectToast, makeApi, screenRoot, waitForState } from "$lib/test/screen-kit.js";
import { clearToasts } from "$lib/test/toast-tracker.js";
import Profile from "./Profile.svelte";

vi.mock("fancy-ui-svelte", async (original) =>
	(await import("$lib/test/toast-tracker.js")).withTracking(await original())
);

afterEach(() => {
	cleanup();
	clearToasts();
});

const mount = (api: ReturnType<typeof makeApi>) => render(ScreenHarness, { screen: Profile, api });

describe("Profile screen states", () => {
	it("loading: skeletons while the request is pending, marked busy", async () => {
		mount(makeApi({}, { pending: true }));
		expect(screenRoot("profile").dataset.state).toBe("loading");
		expect(screenRoot("profile")).toHaveAttribute("aria-busy", "true");
		expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
		expect(screen.queryByRole("textbox")).toBeNull();
	});

	it("ready: the form is filled from the profile", async () => {
		mount(makeApi());
		await waitForState("profile", "ready");
		expect(screenRoot("profile")).toHaveAttribute("aria-busy", "false");
		expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Maya Okafor");
		expect(screen.getByRole("textbox", { name: "Handle" })).toHaveValue("maya");
		expect(screen.getByRole("img", { name: "Maya Okafor" })).toBeInTheDocument();
	});

	it("empty: a first launch invites the user to add details, then shows the form", async () => {
		mount(makeApi({ scenario: "empty" }));
		await waitForState("profile", "empty");
		expect(screen.getByRole("heading", { name: "Finish your profile" })).toBeInTheDocument();
		await fireEvent.click(screen.getByRole("button", { name: "Add details" }));
		expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
		await waitFor(() => expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus());
	});

	it("error: an alert with a retry that recovers", async () => {
		mount(makeApi({ failure: "once" }));
		await waitForState("profile", "error");
		expect(screen.getByRole("alert")).toHaveTextContent("This didn’t load");
		await fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		await waitForState("profile", "ready");
	});

	it("error: stays in the error state while the service keeps failing", async () => {
		mount(makeApi({ failure: "always" }));
		await waitForState("profile", "error");
		await fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		await waitFor(() => expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled());
		expect(screenRoot("profile").dataset.state).toBe("error");
	});
});

describe("Profile screen editing", () => {
	it("saves the changes and confirms with a toast", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("profile", "ready");
		await fireEvent.input(screen.getByRole("textbox", { name: "Name" }), {
			target: { value: "Maya O." },
		});
		await fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
		await expectToast("Profile saved");
		expect((await api.getProfile()).name).toBe("Maya O.");
	});

	it("keeps Save disabled until something changed", async () => {
		mount(makeApi());
		await waitForState("profile", "ready");
		expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
	});

	it("explains a refused name next to the field and changes nothing", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("profile", "ready");
		await fireEvent.input(screen.getByRole("textbox", { name: "Name" }), {
			target: { value: "  " },
		});
		await fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
		await expectToast("A name is required.");
		expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("aria-invalid", "true");
		expect((await api.getProfile()).name).toBe("Maya Okafor");
	});

	it("keeps the user's edits and says so when the save call fails", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("profile", "ready");
		api.configure({ failure: "always" });
		await fireEvent.input(screen.getByRole("textbox", { name: "Name" }), {
			target: { value: "Maya O." },
		});
		await fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
		await expectToast("Couldn’t save your profile");
		expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Maya O.");
		expect(screenRoot("profile").dataset.state).toBe("ready");
	});
});
