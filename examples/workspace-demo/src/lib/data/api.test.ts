import { describe, expect, it } from "vitest";
import {
	ApiError,
	DEFAULT_CONFIG,
	createApi,
	parseApiConfig,
	settle,
	type ApiConfig,
} from "./api.js";
import { MOCK_NOW, createMockData } from "./mock.js";

/** A sleep that records the delay it was asked for and resolves at once. */
function recordingSleep() {
	const delays: number[] = [];
	return {
		delays,
		sleep: (ms: number) => {
			delays.push(ms);
			return Promise.resolve();
		},
	};
}

function api(config: Partial<ApiConfig> = {}) {
	const clock = recordingSleep();
	return { api: createApi(config, { sleep: clock.sleep }), delays: clock.delays };
}

async function outcomes(config: Partial<ApiConfig>, calls: number) {
	const { api: client } = api(config);
	const out: boolean[] = [];
	for (let i = 0; i < calls; i++) {
		out.push(
			await client.getProfile().then(
				() => true,
				() => false
			)
		);
	}
	return out;
}

describe("mock data", () => {
	it("seeds a populated workspace by default", () => {
		const data = createMockData();
		expect(data.profile.name).toBeTruthy();
		expect(data.apiKeys.length).toBeGreaterThan(1);
		expect(data.notifications.some((n) => n.read)).toBe(true);
		expect(data.notifications.some((n) => !n.read)).toBe(true);
	});

	it("models a first launch with the empty scenario", () => {
		const data = createMockData("empty");
		expect(data.profile.name).toBeTruthy();
		expect(data.profile.bio).toBe("");
		expect(data.apiKeys).toEqual([]);
		expect(data.notifications).toEqual([]);
	});

	it("dates everything at or before a fixed instant, so prerendered output is stable", () => {
		const data = createMockData();
		const stamps = [
			data.profile.joinedAt,
			...data.apiKeys.flatMap((k) => [k.createdAt, k.lastUsedAt ?? k.createdAt]),
			...data.notifications.map((n) => n.createdAt),
		].map((iso) => Date.parse(iso));
		expect(stamps.every((t) => Number.isFinite(t) && t <= MOCK_NOW)).toBe(true);
		expect(createMockData()).toEqual(data);
	});

	it("hands out a fresh copy every time", () => {
		const a = createMockData();
		a.apiKeys.pop();
		a.profile.name = "Changed";
		const b = createMockData();
		expect(b.apiKeys.length).toBe(a.apiKeys.length + 1);
		expect(b.profile.name).not.toBe("Changed");
	});
});

describe("seeded latency", () => {
	it("draws the same delays for the same seed", async () => {
		const a = api({ seed: 7 });
		const b = api({ seed: 7 });
		for (const client of [a.api, b.api]) {
			await client.getProfile();
			await client.listApiKeys();
			await client.listNotifications();
		}
		expect(a.delays).toEqual(b.delays);
		expect(a.delays).toHaveLength(3);
	});

	it("draws different delays for another seed", async () => {
		const a = api({ seed: 1 });
		const b = api({ seed: 2 });
		for (const client of [a.api, b.api]) {
			for (let i = 0; i < 4; i++) await client.getSettings();
		}
		expect(a.delays).not.toEqual(b.delays);
	});

	it("stays inside the configured window", async () => {
		const { api: client, delays } = api({ latency: { min: 100, max: 200 } });
		for (let i = 0; i < 20; i++) await client.getProfile();
		expect(delays.every((d) => Number.isInteger(d) && d >= 100 && d <= 200)).toBe(true);
	});

	it("skips the wait entirely at zero latency", async () => {
		const { api: client, delays } = api({ latency: { min: 0, max: 0 } });
		await client.getProfile();
		expect(delays).toEqual([]);
	});

	it("does not shift the latency sequence when the failure switch changes", async () => {
		const a = api({ seed: 3, failure: "never" });
		const b = api({ seed: 3, failure: 0.5 });
		for (const client of [a.api, b.api]) {
			for (let i = 0; i < 6; i++) await client.getProfile().catch(() => undefined);
		}
		expect(a.delays).toEqual(b.delays);
	});
});

describe("failure switch", () => {
	it("never fails by default", async () => {
		expect(DEFAULT_CONFIG.failure).toBe("never");
		expect(await outcomes({}, 5)).toEqual([true, true, true, true, true]);
	});

	it("always fails with a retryable ApiError naming the operation", async () => {
		const { api: client } = api({ failure: "always" });
		const error = await client.getSettings().catch((e: unknown) => e);
		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({ operation: "getSettings", code: "unavailable", retryable: true });
		expect((error as ApiError).message).toBeTruthy();
	});

	it("fails only the first call of each operation with 'once', so a retry succeeds", async () => {
		const { api: client } = api({ failure: "once" });
		await expect(client.getProfile()).rejects.toBeInstanceOf(ApiError);
		await expect(client.getProfile()).resolves.toBeTruthy();
		await expect(client.listApiKeys()).rejects.toBeInstanceOf(ApiError);
		await expect(client.listApiKeys()).resolves.toBeTruthy();
	});

	it("fails at a seeded rate, reproducibly", async () => {
		const first = await outcomes({ seed: 11, failure: 0.5 }, 24);
		const second = await outcomes({ seed: 11, failure: 0.5 }, 24);
		expect(first).toEqual(second);
		expect(first).toContain(true);
		expect(first).toContain(false);
		expect(await outcomes({ failure: 0 }, 6)).not.toContain(false);
		expect(await outcomes({ failure: 1 }, 6)).not.toContain(true);
	});

	it("can be flipped at runtime", async () => {
		const { api: client } = api();
		await expect(client.getProfile()).resolves.toBeTruthy();
		client.configure({ failure: "always" });
		expect(client.config.failure).toBe("always");
		await expect(client.getProfile()).rejects.toBeInstanceOf(ApiError);
		client.configure({ failure: "never" });
		await expect(client.getProfile()).resolves.toBeTruthy();
	});

	it("leaves the data untouched when a write fails", async () => {
		const { api: client } = api({ failure: "always" });
		await expect(client.createApiKey({ name: "CI", scopes: ["read"] })).rejects.toBeInstanceOf(
			ApiError
		);
		await expect(client.saveSettings({ workspaceName: "Nope" })).rejects.toBeInstanceOf(ApiError);
		client.configure({ failure: "never" });
		const keys = await client.listApiKeys();
		expect(keys.map((k) => k.name)).not.toContain("CI");
		expect((await client.getSettings()).workspaceName).not.toBe("Nope");
	});
});

describe("profile and settings", () => {
	it("returns copies the caller cannot use to change the store", async () => {
		const { api: client } = api();
		const profile = await client.getProfile();
		profile.name = "Mutated";
		expect((await client.getProfile()).name).not.toBe("Mutated");
	});

	it("merges and persists a profile update", async () => {
		const { api: client } = api();
		const before = await client.getProfile();
		const after = await client.updateProfile({ bio: "Building calm tools." });
		expect(after).toEqual({ ...before, bio: "Building calm tools." });
		expect(await client.getProfile()).toEqual(after);
	});

	it("rejects an empty name as a non-retryable validation error", async () => {
		const { api: client } = api();
		const error = await client.updateProfile({ name: "   " }).catch((e: unknown) => e);
		expect(error).toMatchObject({ code: "invalid", retryable: false, field: "name" });
	});

	it("merges and persists a settings patch", async () => {
		const { api: client } = api();
		const saved = await client.saveSettings({ density: "compact", emailDigest: "off" });
		expect(saved.density).toBe("compact");
		expect(await client.getSettings()).toEqual(saved);
	});

	it("accepts reactive proxies as input (a form bound to component state)", async () => {
		const { api: client } = api();
		const patch = new Proxy({ density: "compact" as const }, {});
		await expect(client.saveSettings(patch)).resolves.toMatchObject({ density: "compact" });
	});
});

describe("API keys", () => {
	it("lists keys newest first, without any secret", async () => {
		const { api: client } = api();
		const keys = await client.listApiKeys();
		const created = keys.map((k) => Date.parse(k.createdAt));
		expect(created).toEqual([...created].sort((a, b) => b - a));
		for (const key of keys) expect(key).not.toHaveProperty("secret");
	});

	it("creates a key, reveals its secret once, and lists it first", async () => {
		const { api: client } = api();
		const { key, secret } = await client.createApiKey({
			name: "Deploy bot",
			scopes: ["read", "write"],
		});
		expect(secret.startsWith(key.prefix)).toBe(true);
		expect(secret.endsWith(key.lastFour)).toBe(true);
		expect(key.lastUsedAt).toBeNull();
		const keys = await client.listApiKeys();
		expect(keys[0]).toEqual(key);
		expect(JSON.stringify(keys)).not.toContain(secret);
	});

	it("generates the same ids and secrets for the same seed", async () => {
		const a = await api({ seed: 5 }).api.createApiKey({ name: "x", scopes: ["read"] });
		const b = await api({ seed: 5 }).api.createApiKey({ name: "x", scopes: ["read"] });
		expect(a).toEqual(b);
	});

	it("refuses a key without a name or a scope", async () => {
		const { api: client } = api();
		await expect(client.createApiKey({ name: "", scopes: ["read"] })).rejects.toMatchObject({
			code: "invalid",
			field: "name",
		});
		await expect(client.createApiKey({ name: "x", scopes: [] })).rejects.toMatchObject({
			code: "invalid",
			field: "scopes",
		});
	});

	it("revokes a key, and reports an unknown one as not found", async () => {
		const { api: client } = api();
		const [first] = await client.listApiKeys();
		await client.revokeApiKey(first.id);
		expect((await client.listApiKeys()).map((k) => k.id)).not.toContain(first.id);
		await expect(client.revokeApiKey(first.id)).rejects.toMatchObject({
			code: "not_found",
			retryable: false,
		});
	});
});

describe("notifications", () => {
	it("lists newest first", async () => {
		const { api: client } = api();
		const list = await client.listNotifications();
		const stamps = list.map((n) => Date.parse(n.createdAt));
		expect(stamps).toEqual([...stamps].sort((a, b) => b - a));
	});

	it("marks a group read and back (the grouped undo)", async () => {
		const { api: client } = api();
		const unread = (await client.listNotifications()).filter((n) => !n.read).map((n) => n.id);
		expect(unread.length).toBeGreaterThan(1);
		const updated = await client.setNotificationsRead(unread, true);
		expect(updated.every((n) => n.read)).toBe(true);
		expect((await client.listNotifications()).filter((n) => !n.read)).toEqual([]);
		await client.setNotificationsRead(unread, false);
		const restored = (await client.listNotifications()).filter((n) => !n.read).map((n) => n.id);
		expect(restored.sort()).toEqual([...unread].sort());
	});

	it("archives a group and reports unknown ids", async () => {
		const { api: client } = api();
		const [a, b] = await client.listNotifications();
		await client.archiveNotifications([a.id, b.id]);
		const ids = (await client.listNotifications()).map((n) => n.id);
		expect(ids).not.toContain(a.id);
		expect(ids).not.toContain(b.id);
		await expect(client.archiveNotifications([a.id])).rejects.toMatchObject({ code: "not_found" });
	});
});

describe("scenario and reset", () => {
	it("serves the first-launch data under the empty scenario", async () => {
		const { api: client } = api({ scenario: "empty" });
		expect(await client.listApiKeys()).toEqual([]);
		expect(await client.listNotifications()).toEqual([]);
	});

	it("reset() restores the scenario's seed data", async () => {
		const { api: client } = api();
		const [first] = await client.listApiKeys();
		await client.revokeApiKey(first.id);
		client.reset();
		expect((await client.listApiKeys()).map((k) => k.id)).toContain(first.id);
		client.configure({ scenario: "empty" });
		expect(await client.listApiKeys()).toEqual([]);
	});
});

describe("parseApiConfig", () => {
	it("reads nothing from an empty query", () => {
		expect(parseApiConfig("")).toEqual({});
	});

	it("reads every switch", () => {
		expect(parseApiConfig("?fail=always&scenario=empty&seed=9&latency=0")).toEqual({
			failure: "always",
			scenario: "empty",
			seed: 9,
			latency: { min: 0, max: 0 },
		});
		expect(parseApiConfig("fail=once").failure).toBe("once");
		expect(parseApiConfig("fail=0.25").failure).toBe(0.25);
		expect(parseApiConfig("latency=slow").latency).toEqual({ min: 1200, max: 2400 });
		expect(parseApiConfig(new URLSearchParams("latency=300")).latency).toEqual({
			min: 300,
			max: 300,
		});
	});

	it("ignores values it does not understand", () => {
		expect(parseApiConfig("fail=sometimes&scenario=chaos&seed=x&latency=-4&fail=2")).toEqual({});
	});
});

describe("settle", () => {
	it("maps a resolved request to ready", async () => {
		expect(
			await settle(
				() => Promise.resolve([1]),
				(d) => d.length === 0
			)
		).toEqual({
			status: "ready",
			data: [1],
		});
	});

	it("maps an empty result to empty", async () => {
		expect(
			await settle(
				() => Promise.resolve([] as number[]),
				(d) => d.length === 0
			)
		).toEqual({
			status: "empty",
			data: [],
		});
	});

	it("maps an ApiError to error and wraps anything else", async () => {
		const failing = api({ failure: "always" }).api;
		const state = await settle(() => failing.listApiKeys());
		expect(state.status).toBe("error");
		if (state.status === "error") expect(state.error.operation).toBe("listApiKeys");
		const odd = await settle(() => Promise.reject(new Error("boom")));
		expect(odd.status).toBe("error");
		if (odd.status === "error") expect(odd.error).toBeInstanceOf(ApiError);
	});
});
