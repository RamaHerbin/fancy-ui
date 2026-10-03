import { expect, test } from "@playwright/test";

test.describe("Site footer on the home page", () => {
	test("renders the link columns and the install block without console errors", async ({
		page,
	}) => {
		// Library demos elsewhere may log this when the browser has no WebGL;
		// it is their documented fallback, not a failure.
		const KNOWN_NOISE = ["Unable to initialize WebGL."];
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error" && !KNOWN_NOISE.includes(msg.text())) {
				consoleErrors.push(msg.text());
			}
		});

		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto("/");

		const footer = page.locator("footer").last();
		await footer.scrollIntoViewIfNeeded();
		await expect(footer).toBeVisible();

		for (const title of ["Docs", "Resources", "Community"]) {
			await expect(footer.getByText(title, { exact: true })).toBeVisible();
		}
		await expect(footer.getByRole("link", { name: "Components" })).toHaveAttribute(
			"href",
			"/docs/components"
		);
		await expect(footer.getByRole("link", { name: "Inspiration" })).toHaveAttribute(
			"href",
			"/inspiration"
		);

		// The install block follows the framework store, so it carries the switch.
		await expect(footer.getByRole("radiogroup")).toBeVisible();
		await expect(footer.getByText(/pnpm add fancy-ui-/).first()).toBeVisible();

		expect(consoleErrors, `unexpected console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
	});
});
