import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { collectErrors, expectBorderBeamRunning, waitForHydration } from "../../smoke-helpers";

// The /server route is a Server Component page: it imports the library's
// components directly, with no "use client" anywhere in the app's own file.
// The package's client boundary (react/scripts/client-boundary.mjs) is what
// makes that legal.

test("the page file is a Server Component that imports the package directly", () => {
	const source = readFileSync(new URL("../app/server/page.tsx", import.meta.url), "utf8");
	expect(source).not.toMatch(/["']use client["']/);
	expect(source).toMatch(/from "fancy-ui-react"/);
});

test("server markup is deterministic: two requests return the same HTML", async ({ request }) => {
	const first = await (await request.get("/server")).text();
	const second = await (await request.get("/server")).text();
	expect(first).toContain('data-testid="server-button"');
	expect(second).toBe(first);
});

test("hydrates with no warning, effects run, events reach handlers", async ({ page }) => {
	const errors = collectErrors(page);
	await page.goto("/server");
	await waitForHydration(page);

	// Server-rendered library components are present before and after hydration.
	await expect(page.getByTestId("server-button")).toBeVisible();
	await expect(page.getByTestId("server-cn")).toHaveText("text-sm p-2");
	await expectBorderBeamRunning(page);

	// Handlers owned by a client island reach library components.
	await page.getByTestId("rainbow").click();
	await expect(page.getByTestId("clicks")).toHaveText("clicks: 1");
	await expect(page.getByTestId("dialog-state")).toHaveText("dialog: closed");
	await page.getByRole("button", { name: "Open dialog" }).first().click();
	await expect(page.getByTestId("dialog-state")).toHaveText("dialog: open");
	await page.keyboard.press("Escape");
	await expect(page.getByTestId("dialog-state")).toHaveText("dialog: closed");

	expect(errors).toEqual([]);
});

test("a .dark ancestor re-themes the tokens, server-rendered", async ({ page }) => {
	await page.goto("/server");
	const probe = (scope: string) =>
		page.getByTestId(scope).evaluate((el) => {
			const p = document.createElement("div");
			p.style.backgroundColor = "var(--background)";
			el.appendChild(p);
			const bg = getComputedStyle(p).backgroundColor;
			p.remove();
			const button = el.querySelector("button");
			return { bg, button: button ? getComputedStyle(button).backgroundColor : null };
		});
	const light = await probe("light-scope");
	const dark = await probe("dark-scope");
	expect(light.bg).not.toBe("rgba(0, 0, 0, 0)");
	expect(dark.bg).not.toBe("rgba(0, 0, 0, 0)");
	expect(dark.bg).not.toBe(light.bg);
	expect(dark.button).not.toBe(light.button);
});
