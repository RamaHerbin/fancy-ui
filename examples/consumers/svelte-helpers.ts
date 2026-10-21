import { expect, type Page } from "@playwright/test";

/** The computed background of the first element matching `selector`. */
const background = (page: Page, selector: string) =>
	page
		.locator(selector)
		.first()
		.evaluate((el) => getComputedStyle(el).backgroundColor);

/**
 * `var(--primary)` resolved to a colour inside `rootSelector` (the wrapper that
 * carries `.dark`), as the browser computes it there.
 */
const primaryToken = (page: Page, rootSelector: string) =>
	page
		.locator(rootSelector)
		.first()
		.evaluate((host) => {
			const probe = document.createElement("div");
			probe.style.backgroundColor = "var(--primary)";
			host.appendChild(probe);
			const value = getComputedStyle(probe).backgroundColor;
			probe.remove();
			return value;
		});

/**
 * Dark mode through a `.dark` ancestor, the way a consumer toggles it: the
 * toggle adds the class to a wrapper (not <html>, not the OS preference), and
 * a library Button's background must follow the flipped `--primary` token,
 * both ways. Runs in a light colour scheme so the media query cannot be what
 * flips it.
 */
export async function expectDarkAncestorTheme(
	page: Page,
	opts: { toggle: string; root: string; button: string }
) {
	const root = page.locator(opts.root);
	await expect(root).not.toHaveClass(/\bdark\b/);
	const light = await background(page, opts.button);
	const lightToken = await primaryToken(page, opts.root);
	expect(lightToken).not.toBe("rgba(0, 0, 0, 0)");
	expect(light).toBe(lightToken);

	await page.locator(opts.toggle).click();
	await expect(root).toHaveClass(/\bdark\b/);
	const darkToken = await primaryToken(page, opts.root);
	expect(darkToken).not.toBe(lightToken);
	// Buttons transition their colours: wait for the computed value to settle.
	await expect.poll(() => background(page, opts.button)).toBe(darkToken);

	await page.locator(opts.toggle).click();
	await expect(root).not.toHaveClass(/\bdark\b/);
	await expect.poll(() => background(page, opts.button)).toBe(lightToken);
}

/** The consumer's own handler ran through the library Button's `onclick`. */
export async function expectButtonOnclick(page: Page, trigger: string, output: string) {
	await expect(page.locator(output)).toHaveText("button clicks: 0");
	await page.locator(trigger).click();
	await expect(page.locator(output)).toHaveText("button clicks: 1");
}

/**
 * The consumer's `onOpenChange` saw the Dialog open and close, in order, with
 * the booleans the component reports (opened with Enter, closed with Escape).
 */
export async function expectDialogOnOpenChange(page: Page, trigger: string, output: string) {
	await expect(page.locator(output)).toHaveText("dialog events: none");
	await page.locator(trigger).focus();
	await page.keyboard.press("Enter");
	await expect(page.getByRole("dialog")).toBeVisible();
	await expect(page.locator(output)).toHaveText("dialog events: true");
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toBeHidden();
	await expect(page.locator(output)).toHaveText("dialog events: true,false");
}

/**
 * The install page's snippets, pasted into the app, render and work: the
 * first-component snippet shows a RainbowButton, the composed one a button
 * inside a BorderBeam that animates.
 */
export async function expectInstallSnippets(page: Page) {
	const first = page.getByTestId("snippet-first");
	await expect(first.getByRole("button", { name: "Click me" })).toBeVisible();
	const usage = page.getByTestId("snippet-usage");
	await expect(usage.getByRole("button", { name: "Click me" })).toBeVisible();
	// The snippet's own comet head, not any other BorderBeam on the page.
	const head = usage.locator(".border-beam .bb-head").first();
	await expect(head).toBeAttached();
	const css = await head.evaluate((el) => {
		const cs = getComputedStyle(el);
		return {
			position: cs.position,
			name: cs.animationName,
			maxDuration: Math.max(...cs.animationDuration.split(",").map((d) => parseFloat(d))),
		};
	});
	expect(css.position).toBe("absolute");
	expect(css.name).not.toBe("none");
	expect(css.name).not.toBe("");
	expect(css.maxDuration).toBeGreaterThan(0);
}
