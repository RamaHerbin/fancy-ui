import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "fancy-ui-framework";

async function load() {
	vi.resetModules();
	return await import("./framework.svelte.js");
}

function visit(search: string) {
	window.history.replaceState(null, "", `/docs/components/button${search}#props`);
}

describe("framework store", () => {
	beforeEach(() => {
		localStorage.clear();
		visit("");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("starts on Svelte with nothing saved", async () => {
		const store = await load();
		expect(store.getFramework()).toBe("svelte");
	});

	it("restores the saved choice", async () => {
		localStorage.setItem(KEY, "vue");
		const store = await load();
		expect(store.getFramework()).toBe("vue");
	});

	it("lets the URL win over the saved choice, and saves it", async () => {
		localStorage.setItem(KEY, "vue");
		visit("?framework=react");
		const store = await load();
		expect(store.getFramework()).toBe("react");
		expect(localStorage.getItem(KEY)).toBe("react");
	});

	it("ignores an unknown framework in the URL", async () => {
		localStorage.setItem(KEY, "vue");
		visit("?framework=angular");
		const store = await load();
		expect(store.getFramework()).toBe("vue");
	});

	it("writes a switch to the URL without adding a history entry", async () => {
		visit("?tab=code");
		const store = await load();
		const before = window.history.length;
		store.setFramework("vue");
		const url = new URL(window.location.href);
		expect(url.searchParams.get("framework")).toBe("vue");
		expect(url.searchParams.get("tab")).toBe("code");
		expect(url.pathname).toBe("/docs/components/button");
		expect(url.hash).toBe("#props");
		expect(window.history.length).toBe(before);
		expect(localStorage.getItem(KEY)).toBe("vue");
	});

	it("follows a URL reached later, and keeps the choice when the URL has none", async () => {
		const store = await load();
		store.followUrl(new URL("http://localhost/docs/components/button?framework=vue"));
		expect(store.getFramework()).toBe("vue");
		expect(localStorage.getItem(KEY)).toBe("vue");
		store.followUrl(new URL("http://localhost/docs/components/button"));
		expect(store.getFramework()).toBe("vue");
	});
});
