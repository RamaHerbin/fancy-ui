// Each route is its screen, composed against the shared API the layout
// configures: no placeholder outline left, and the screen's first call goes
// to that shared instance (so the query-string switches reach it).
import { cleanup, render } from "@testing-library/svelte";
import type { Component } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "$lib/test/dom-shims.js";
import { DEFAULT_CONFIG, api } from "$lib/data/api.js";
import ProfilePage from "./profile/+page.svelte";
import SettingsPage from "./settings/+page.svelte";
import ApiKeysPage from "./api-keys/+page.svelte";
import NotificationsPage from "./notifications/+page.svelte";

const ROUTES: [string, Component, string, keyof typeof api][] = [
	["/profile", ProfilePage, "profile", "getProfile"],
	["/settings", SettingsPage, "settings", "getSettings"],
	["/api-keys", ApiKeysPage, "api-keys", "listApiKeys"],
	["/notifications", NotificationsPage, "notifications", "listNotifications"],
];

beforeEach(() => {
	api.configure({ ...DEFAULT_CONFIG, latency: { min: 0, max: 0 } });
	api.reset();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	api.configure({ ...DEFAULT_CONFIG, latency: { ...DEFAULT_CONFIG.latency } });
	api.reset();
});

describe("routes", () => {
	for (const [path, Page, screenName, firstCall] of ROUTES) {
		it(`${path} renders the ${screenName} screen against the shared API`, async () => {
			const spy = vi.spyOn(api, firstCall as "getProfile");
			const { container } = render(Page);
			expect(container.querySelector(`[data-screen="${screenName}"]`)).not.toBeNull();
			expect(container.querySelector('[data-testid="screen-outline"]')).toBeNull();
			expect(container.querySelectorAll("h1")).toHaveLength(1);
			expect(spy).toHaveBeenCalledOnce();
			await vi.waitFor(() =>
				expect(
					container.querySelector<HTMLElement>(`[data-screen="${screenName}"]`)?.dataset.state
				).toBe("ready")
			);
		});
	}
});
