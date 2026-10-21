import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorBody from "./ErrorBody.svelte";
import source from "./ErrorBody.svelte?raw";
import { newIssueUrl } from "$lib/site.js";

describe("ErrorBody", () => {
	afterEach(cleanup);

	it("renders the 404 variant with its copy and the four actions", () => {
		const { container, getByRole } = render(ErrorBody, {
			props: { status: 404, url: "https://example.test/docs/components/nope", onsearch: () => {} },
		});
		expect(container.textContent).toContain("404");
		expect(getByRole("heading", { level: 1 }).textContent).toBe("Page not found");
		expect(container.textContent).toContain("does not exist or has moved");
		expect(container.querySelector('a[href="/"]')?.textContent).toContain("Back to home");
		expect(container.querySelector('a[href="/docs/components"]')?.textContent).toContain(
			"Browse components"
		);
		expect(getByRole("button", { name: "Search the docs" })).toBeTruthy();
		expect(container.querySelector("a[data-report]")).toBeTruthy();
	});

	it("renders the 401 variant", () => {
		const { getByRole, container } = render(ErrorBody, { props: { status: 401, url: "/x" } });
		expect(getByRole("heading", { level: 1 }).textContent).toBe("Sign in required");
		expect(container.textContent).toContain("signed in");
	});

	it("renders the generic variant with the thrown message", () => {
		const { getByRole, container } = render(ErrorBody, {
			props: { status: 500, message: "Boom", url: "/x" },
		});
		expect(getByRole("heading", { level: 1 }).textContent).toBe("Something went wrong");
		expect(container.textContent).toContain("An unexpected error occurred");
		expect(container.textContent).toContain("Boom");
	});

	it("points the report link at a pre-filled issue carrying the current URL", () => {
		const url = "https://example.test/docs/components/nope";
		const { container } = render(ErrorBody, { props: { status: 404, url } });
		const link = container.querySelector<HTMLAnchorElement>("a[data-report]")!;
		const href = link.getAttribute("href")!;
		expect(href.startsWith(newIssueUrl({}))).toBe(true);
		expect(new URL(href).searchParams.get("body")).toContain(url);
		expect(link.getAttribute("rel")).toContain("noopener");
	});

	it("calls onsearch from the search button and hides it without a handler", async () => {
		const onsearch = vi.fn();
		const a = render(ErrorBody, { props: { status: 404, url: "/x", onsearch } });
		await fireEvent.click(a.getByRole("button", { name: "Search the docs" }));
		expect(onsearch).toHaveBeenCalledOnce();
		cleanup();
		const b = render(ErrorBody, { props: { status: 404, url: "/x" } });
		expect(b.queryByRole("button", { name: "Search the docs" })).toBeNull();
	});

	it("uses theme tokens and no violet literals", () => {
		expect(source).not.toMatch(/#7c3aed|#a78bfa|124,\s*58,\s*237|violet|purple/i);
		expect(source).toContain("--color-");
	});
});
