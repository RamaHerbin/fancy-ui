import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScreenHarness from "$lib/test/ScreenHarness.svelte";
import { expectToast, makeApi, screenRoot, waitForState } from "$lib/test/screen-kit.js";
import { clearToasts } from "$lib/test/toast-tracker.js";
import ApiKeys, { UNDO_WINDOW_MS } from "./ApiKeys.svelte";

vi.mock("fancy-ui-svelte", async (original) =>
	(await import("$lib/test/toast-tracker.js")).withTracking(await original())
);

afterEach(() => {
	cleanup();
	clearToasts();
	vi.useRealTimers();
});

const mount = (api: ReturnType<typeof makeApi>) => render(ScreenHarness, { screen: ApiKeys, api });

describe("ApiKeys screen states", () => {
	it("loading: skeleton rows, no list yet", () => {
		mount(makeApi({}, { pending: true }));
		expect(screenRoot("api-keys").dataset.state).toBe("loading");
		expect(screenRoot("api-keys")).toHaveAttribute("aria-busy", "true");
		expect(screen.queryByRole("list", { name: "API keys" })).toBeNull();
	});

	it("ready: lists the keys newest first with scopes and last use", async () => {
		mount(makeApi());
		await waitForState("api-keys", "ready");
		const rows = screen.getAllByRole("listitem");
		expect(rows).toHaveLength(3);
		expect(rows[0]).toHaveTextContent("Staging admin");
		expect(screen.getByText("Never used")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Revoke Production deploys" })).toBeInTheDocument();
	});

	it("empty: invites to create the first key", async () => {
		mount(makeApi({ scenario: "empty" }));
		await waitForState("api-keys", "empty");
		expect(screen.getByRole("heading", { name: "No API keys yet" })).toBeInTheDocument();
		await fireEvent.click(screen.getByRole("button", { name: "Create your first key" }));
		expect(screen.getByRole("textbox", { name: "Key name" })).toBeInTheDocument();
	});

	it("error: retry recovers", async () => {
		mount(makeApi({ failure: "once" }));
		await waitForState("api-keys", "error");
		await fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		await waitForState("api-keys", "ready");
	});
});

describe("ApiKeys screen creating", () => {
	it("shows the secret once, then forgets it", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("api-keys", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Create key" }));
		await fireEvent.input(screen.getByRole("textbox", { name: "Key name" }), {
			target: { value: "CI runner" },
		});
		await fireEvent.click(screen.getByRole("checkbox", { name: "read" }));
		await fireEvent.click(screen.getByRole("button", { name: "Create" }));

		const secret = await screen.findByTestId("new-secret");
		expect(secret.textContent).toMatch(/^fws_live_[a-z0-9]{32}$/);
		expect(screen.getAllByRole("listitem")).toHaveLength(4);

		await fireEvent.click(screen.getByRole("button", { name: "I’ve saved it" }));
		expect(screen.queryByTestId("new-secret")).toBeNull();
		expect(document.body.textContent).not.toContain(secret.textContent);
	});

	it("explains a refused key next to the field", async () => {
		mount(makeApi());
		await waitForState("api-keys", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Create key" }));
		await fireEvent.click(screen.getByRole("button", { name: "Create" }));
		await expectToast("Give the key a name.");
		expect(screen.getByRole("textbox", { name: "Key name" })).toHaveAttribute(
			"aria-invalid",
			"true"
		);
	});
});

describe("ApiKeys screen revoking", () => {
	it("removes the row at once and Undo brings it back untouched", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("api-keys", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Revoke Production deploys" }));
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		await fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
		expect(await api.listApiKeys()).toHaveLength(3);
	});

	it("commits the revocation once the undo window has passed", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const api = makeApi();
		mount(api);
		await waitForState("api-keys", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Revoke Production deploys" }));
		expect(await api.listApiKeys()).toHaveLength(3);
		await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 50);
		expect((await api.listApiKeys()).map((key) => key.name)).not.toContain("Production deploys");
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
	});

	it("two quick revocations are two independent undos", async () => {
		const api = makeApi();
		mount(api);
		await waitForState("api-keys", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Revoke Production deploys" }));
		await fireEvent.click(screen.getByRole("button", { name: "Revoke Analytics export" }));
		expect(screen.getAllByRole("listitem")).toHaveLength(1);
		const undos = await screen.findAllByRole("button", { name: "Undo" });
		expect(undos).toHaveLength(2);
		await fireEvent.click(undos[0]);
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
	});

	it("puts the row back and says so when the revocation is refused", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const api = makeApi();
		mount(api);
		await waitForState("api-keys", "ready");
		await fireEvent.click(screen.getByRole("button", { name: "Revoke Production deploys" }));
		api.configure({ failure: "always" });
		await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 50);
		await expectToast("Couldn’t revoke Production deploys");
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
	});
});
