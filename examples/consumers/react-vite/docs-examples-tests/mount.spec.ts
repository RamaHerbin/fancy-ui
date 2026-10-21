import { expect, test } from "@playwright/test";
import { collectErrors } from "../../smoke-helpers";

// DOCS_EXAMPLES is set by scripts/consumers/docs-examples-react.mjs: a JSON
// array of { name, file, exportName } for every example copied into the app.
const examples: { name: string; file: string; exportName: string }[] = JSON.parse(
	process.env.DOCS_EXAMPLES ?? "[]"
);

test("the harness received the examples", () => {
	expect(examples.length).toBeGreaterThan(0);
});

for (const { name } of examples) {
	test(`example "${name}" mounts with no console error`, async ({ page }) => {
		const errors = collectErrors(page);
		await page.goto(`/?example=${encodeURIComponent(name)}`);
		const host = page.locator(`[data-example="${name}"]`);
		await expect(host).toHaveAttribute("data-example-status", "mounted");
		// Something real rendered, not an empty shell.
		expect(await host.locator("*").count()).toBeGreaterThan(0);
		// Let effects (canvas, observers, timers) run their first frames.
		await page.waitForTimeout(300);
		expect(errors).toEqual([]);
	});
}

test("dialog example opens from its trigger and closes with Escape", async ({ page }) => {
	test.skip(!examples.some((e) => e.name === "dialog"), "dialog example not in this run");
	await page.goto("/?example=dialog");
	await page.getByRole("button", { name: "Invite member" }).click();
	await expect(page.getByRole("dialog")).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toBeHidden();
});

test("button example runs its handler", async ({ page }) => {
	test.skip(!examples.some((e) => e.name === "button"), "button example not in this run");
	await page.goto("/?example=button");
	await page.getByRole("button", { name: /Clicked 0 times/ }).click();
	await expect(page.getByRole("button", { name: "Clicked 1 time" })).toBeVisible();
});

test("input example takes typed text", async ({ page }) => {
	test.skip(!examples.some((e) => e.name === "input"), "input example not in this run");
	await page.goto("/?example=input");
	const field = page.getByLabel("Email");
	await field.fill("a@b.co");
	await expect(field).toHaveValue("a@b.co");
});
