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

	it("keeps Save unavailable until something changed, without taking it out of the tab order", async () => {
		const api = makeApi();
		const update = vi.spyOn(api, "updateProfile");
		mount(api);
		await waitForState("profile", "ready");
		const save = screen.getByRole("button", { name: "Save changes" });
		expect(save).toHaveAttribute("aria-disabled", "true");
		expect(save).not.toHaveAttribute("disabled");
		await fireEvent.click(save);
		expect(update).not.toHaveBeenCalled();
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

describe("Profile screen save and publish", () => {
	it("shows the save in flight on the button and confirms only once it resolved", async () => {
		const gated = makeGatedApi();
		mount(gated.api);
		await waitForState("profile", "ready");
		await fireEvent.input(screen.getByRole("textbox", { name: "Name" }), {
			target: { value: "Maya O." },
		});
		const save = screen.getByRole("button", { name: "Save changes" });
		expect(morphState(save)).toBe("idle");

		gated.hold();
		await fireEvent.click(save);
		await waitFor(() => expect(morphState(save)).toBe("loading"));
		expect(save).toHaveAttribute("aria-busy", "true");
		expect(screen.queryByText("Profile saved")).toBeNull();

		gated.release();
		await waitFor(() => expect(morphState(save)).toBe("success"));
		await expectToast("Profile saved");
		expect((await gated.api.getProfile()).name).toBe("Maya O.");
	});

	it("a failed save marks the button, keeps the edits and offers Retry in the toast", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("profile", "ready");
		await fireEvent.input(screen.getByRole("textbox", { name: "Name" }), {
			target: { value: "Maya O." },
		});
		api.configure({ failure: "once" });
		const save = screen.getByRole("button", { name: "Save changes" });
		await fireEvent.click(save);
		await expectToast("Couldn’t save your profile");
		await waitFor(() => expect(morphState(save)).toBe("error"));
		expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Maya O.");

		await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
		await waitFor(() => expect(morphState(save)).toBe("success"));
		await waitFor(() => expect(screen.queryByRole("button", { name: "Retry" })).toBeNull());
		api.configure({ failure: "never" });
		expect((await api.getProfile()).name).toBe("Maya O.");
	});

	it("a refused field is not a failed save: no Retry, the message sits by the field", async () => {
		mount(makeApi());
		await waitForState("profile", "ready");
		await fireEvent.input(screen.getByRole("textbox", { name: "Name" }), {
			target: { value: " " },
		});
		const save = screen.getByRole("button", { name: "Save changes" });
		await fireEvent.click(save);
		await waitFor(() =>
			expect(screen.getByRole("textbox", { name: "Name" })).toHaveAttribute("aria-invalid", "true")
		);
		expect(morphState(save)).toBe("idle");
		expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
	});
});
