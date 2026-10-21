import { render, cleanup, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi, type MockInstance } from "vitest";
import GitHubStars from "./GitHubStars.svelte";

const CACHE_KEY = "fancyui:github-stars";
const HOUR = 60 * 60 * 1000;

let fetchMock: ReturnType<typeof vi.fn>;
let consoleError: MockInstance<typeof console.error>;
let consoleWarn: MockInstance<typeof console.warn>;

function respond(status: number, body: unknown = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

beforeEach(() => {
	localStorage.clear();
	fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
	consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
	consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	consoleError.mockRestore();
	consoleWarn.mockRestore();
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("GitHubStars", () => {
	it("fetches once, renders the count and caches it for an hour", async () => {
		fetchMock.mockResolvedValue(respond(200, { stargazers_count: 1234 }));
		const { container } = render(GitHubStars);
		await waitFor(() => expect(container.textContent).toContain("1.2K"));

		const cached = JSON.parse(localStorage.getItem(CACHE_KEY)!);
		expect(cached.value).toBe(1234);

		cleanup();
		const again = render(GitHubStars);
		await waitFor(() => expect(again.container.textContent).toContain("1.2K"));
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("refetches once the cached count is older than an hour", async () => {
		localStorage.setItem(CACHE_KEY, JSON.stringify({ value: 10, at: Date.now() - HOUR - 1 }));
		fetchMock.mockResolvedValue(respond(200, { stargazers_count: 20 }));
		const { container } = render(GitHubStars);
		await waitFor(() => expect(container.textContent).toContain("20"));
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("stays silent on a 403 rate limit and renders nothing", async () => {
		fetchMock.mockResolvedValue(respond(403, { message: "API rate limit exceeded" }));
		const { container } = render(GitHubStars);
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		await flush();
		expect(container.querySelector("span")).toBeNull();
		expect(consoleError).not.toHaveBeenCalled();
		expect(consoleWarn).not.toHaveBeenCalled();
	});

	it("does not hit the API again on the next page after a 403", async () => {
		fetchMock.mockResolvedValue(respond(403, { message: "API rate limit exceeded" }));
		render(GitHubStars);
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		await flush();
		cleanup();

		render(GitHubStars);
		await flush();
		await flush();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("keeps showing a stale cached count when the API refuses", async () => {
		localStorage.setItem(CACHE_KEY, JSON.stringify({ value: 42, at: Date.now() - HOUR - 1 }));
		fetchMock.mockResolvedValue(respond(403));
		const { container } = render(GitHubStars);
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(container.textContent).toContain("42"));
		expect(consoleError).not.toHaveBeenCalled();
	});

	it("survives a storage that throws and a network that rejects", async () => {
		const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		fetchMock.mockRejectedValue(new TypeError("offline"));
		const { container } = render(GitHubStars);
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		await flush();
		expect(container.querySelector("span")).toBeNull();
		expect(consoleError).not.toHaveBeenCalled();
		getItem.mockRestore();
	});
});
