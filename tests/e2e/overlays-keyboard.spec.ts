import { expect, test, type Locator, type Page } from "@playwright/test";

// Keyboard and focus contract for the overlay family, driven through the live
// docs demos (Svelte reference). Each scenario opens from the keyboard, checks
// where focus lands, walks Tab, closes, and checks where focus goes back to.
//
// A behaviour a component does not promise is not asserted (a dropdown menu is
// not a focus trap, a tooltip is not opened with Enter); a behaviour this spec
// cannot drive is a `test.fixme` with its reason, never a silent pass.

async function openDocs(page: Page, slug: string) {
	await page.goto(`/docs/components/${slug}`);
	// Demos are client components: wait for hydration before driving them.
	await page.waitForLoadState("networkidle");
}

/** The live Preview pane at the top of a component page (its BasicUsage demo). */
function stage(page: Page): Locator {
	return page.locator("section:has(h2#preview) [data-thumb-stage]");
}

async function scrollLocked(page: Page): Promise<boolean> {
	return page.evaluate(
		() => document.body.style.position === "fixed" && document.body.style.overflow === "hidden"
	);
}

async function focusInside(locator: Locator): Promise<boolean> {
	return locator.evaluate((node) => node.contains(document.activeElement));
}

async function activeIsBody(page: Page): Promise<boolean> {
	return page.evaluate(
		() => document.activeElement === document.body || document.activeElement === null
	);
}

/** Presses Tab `count` times and asserts focus never leaves `panel`. */
async function expectTabStaysInside(page: Page, panel: Locator, count: number, shift = false) {
	for (let i = 0; i < count; i += 1) {
		await page.keyboard.press(shift ? "Shift+Tab" : "Tab");
		expect(await focusInside(panel), `focus left the panel after ${i + 1} Tab`).toBe(true);
	}
}

/** Clicks a point of the page outside every overlay (top-left corner of the viewport). */
async function clickOutside(page: Page) {
	await page.mouse.click(4, 4);
}

test.describe("Overlays keyboard and focus contract", () => {
	test("Dialog: keyboard open, trap, Escape, focus return, scroll lock, trigger ARIA", async ({
		page,
	}) => {
		await openDocs(page, "dialog");
		const trigger = stage(page).getByRole("button", { name: "Invite member" });

		await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
		await expect(trigger).toHaveAttribute("aria-expanded", "false");
		await expect(trigger).not.toHaveAttribute("aria-controls");

		await trigger.focus();
		await page.keyboard.press("Enter");
		const dialog = page.getByRole("dialog", { name: "Invite a member" });
		await expect(dialog).toBeVisible();
		await expect(trigger).toHaveAttribute("aria-expanded", "true");
		const controls = await trigger.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(await dialog.getAttribute("id")).toBe(controls);

		expect(await focusInside(dialog)).toBe(true);
		expect(await scrollLocked(page)).toBe(true);
		// Close, email, Cancel, Invite: six presses wrap at least once each way.
		await expectTabStaysInside(page, dialog, 6);
		await expectTabStaysInside(page, dialog, 6, true);

		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await expect(trigger).toBeFocused();
		await expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(await scrollLocked(page)).toBe(false);

		// Space opens as well.
		await page.keyboard.press(" ");
		await expect(dialog).toBeVisible();
		expect(await focusInside(dialog)).toBe(true);
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await expect(trigger).toBeFocused();
	});

	test("Dialog: an outside click closes it without dropping focus to the body", async ({
		page,
	}) => {
		await openDocs(page, "dialog");
		const trigger = stage(page).getByRole("button", { name: "Invite member" });
		await trigger.focus();
		await page.keyboard.press("Enter");
		const dialog = page.getByRole("dialog", { name: "Invite a member" });
		await expect(dialog).toBeVisible();

		await clickOutside(page);
		await expect(dialog).toBeHidden();
		expect(await activeIsBody(page)).toBe(false);
		await expect(trigger).toBeFocused();
		expect(await scrollLocked(page)).toBe(false);
	});

	test("Dialog → Popover: Escape closes only the top layer, scroll lock survives the nested close", async ({
		page,
	}) => {
		await openDocs(page, "dialog");
		const trigger = page.getByRole("button", { name: "Edit access" });
		await trigger.scrollIntoViewIfNeeded();
		await trigger.focus();
		await page.keyboard.press("Enter");
		const dialog = page.getByRole("dialog", { name: "Edit access" });
		await expect(dialog).toBeVisible();
		expect(await scrollLocked(page)).toBe(true);

		const popoverTrigger = dialog.getByRole("button", { name: "Change role" });
		await popoverTrigger.focus();
		await page.keyboard.press("Enter");
		await expect(popoverTrigger).toHaveAttribute("aria-expanded", "true");
		const popoverId = await popoverTrigger.getAttribute("aria-controls");
		expect(popoverId).toBeTruthy();
		const popover = page.locator(`[id="${popoverId}"]`);
		await expect(popover).toBeVisible();
		expect(await focusInside(popover)).toBe(true);

		await page.keyboard.press("Escape");
		await expect(popover).toBeHidden();
		await expect(dialog).toBeVisible();
		await expect(popoverTrigger).toBeFocused();
		expect(await scrollLocked(page)).toBe(true);

		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await expect(trigger).toBeFocused();
		expect(await scrollLocked(page)).toBe(false);
	});

	test("AlertDialog: Cancel gets initial focus, trap, Escape cancels, outside click does not close", async ({
		page,
	}) => {
		await openDocs(page, "alert-dialog");
		const trigger = stage(page).getByRole("button", { name: "Delete project" });

		await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
		await expect(trigger).toHaveAttribute("aria-expanded", "false");

		await trigger.focus();
		await page.keyboard.press("Enter");
		const alert = page.getByRole("alertdialog", { name: "Delete this project?" });
		await expect(alert).toBeVisible();
		await expect(alert.getByRole("button", { name: "Cancel" })).toBeFocused();
		await expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(await alert.getAttribute("id")).toBe(await trigger.getAttribute("aria-controls"));
		expect(await scrollLocked(page)).toBe(true);
		await expectTabStaysInside(page, alert, 4);
		await expectTabStaysInside(page, alert, 4, true);

		// An alert dialog does not close on an outside click — focus must stay in it.
		await clickOutside(page);
		await expect(alert).toBeVisible();
		expect(await focusInside(alert)).toBe(true);

		await page.keyboard.press("Escape");
		await expect(alert).toBeHidden();
		await expect(trigger).toBeFocused();
		await expect(stage(page)).toContainText("Cancelled.");
		expect(await scrollLocked(page)).toBe(false);
	});

	test("Sheet: keyboard open, trap, Escape, focus return, scroll lock, outside click", async ({
		page,
	}) => {
		await openDocs(page, "sheet");
		const trigger = stage(page).getByRole("button", { name: "Open settings" });
		await trigger.focus();
		await page.keyboard.press("Enter");
		const sheet = page.getByRole("dialog", { name: "Settings" });
		await expect(sheet).toBeVisible();
		expect(await focusInside(sheet)).toBe(true);
		expect(await scrollLocked(page)).toBe(true);
		await expectTabStaysInside(page, sheet, 5);
		await expectTabStaysInside(page, sheet, 5, true);

		await page.keyboard.press("Escape");
		await expect(sheet).toBeHidden();
		await expect(trigger).toBeFocused();
		expect(await scrollLocked(page)).toBe(false);

		await page.keyboard.press(" ");
		await expect(sheet).toBeVisible();
		// The sheet slides in from the right: the far left of the viewport is outside it.
		const box = page.viewportSize()!;
		await page.mouse.click(4, box.height / 2);
		await expect(sheet).toBeHidden();
		expect(await activeIsBody(page)).toBe(false);
		await expect(trigger).toBeFocused();
		expect(await scrollLocked(page)).toBe(false);
	});

	test("Drawer: keyboard open, trap, Escape, focus return, scroll lock, outside click", async ({
		page,
	}) => {
		await openDocs(page, "drawer");
		const trigger = stage(page).getByRole("button", { name: "Open filters" });
		await trigger.focus();
		await page.keyboard.press("Enter");
		const drawer = page.getByRole("dialog", { name: "Filters" });
		await expect(drawer).toBeVisible();
		expect(await focusInside(drawer)).toBe(true);
		expect(await scrollLocked(page)).toBe(true);
		await expectTabStaysInside(page, drawer, 4);
		await expectTabStaysInside(page, drawer, 4, true);

		await page.keyboard.press("Escape");
		await expect(drawer).toBeHidden();
		await expect(trigger).toBeFocused();
		expect(await scrollLocked(page)).toBe(false);

		await page.keyboard.press(" ");
		await expect(drawer).toBeVisible();
		await clickOutside(page);
		await expect(drawer).toBeHidden();
		expect(await activeIsBody(page)).toBe(false);
		await expect(trigger).toBeFocused();
		expect(await scrollLocked(page)).toBe(false);
	});

	test("Popover: keyboard open, focus moves in, trap, Escape, focus return, trigger ARIA", async ({
		page,
	}) => {
		await openDocs(page, "popover");
		const trigger = stage(page).getByRole("button", { name: "Options" });
		await expect(trigger).toHaveAttribute("aria-expanded", "false");
		await expect(trigger).not.toHaveAttribute("aria-controls");

		await trigger.focus();
		await page.keyboard.press("Enter");
		await expect(trigger).toHaveAttribute("aria-expanded", "true");
		const panel = page.locator(`[id="${await trigger.getAttribute("aria-controls")}"]`);
		await expect(panel).toBeVisible();
		await expect(panel.getByRole("textbox", { name: "Width" })).toBeFocused();
		// A popover is not modal, so it does not lock the page.
		expect(await scrollLocked(page)).toBe(false);
		await expectTabStaysInside(page, panel, 3);
		await expectTabStaysInside(page, panel, 3, true);

		await page.keyboard.press("Escape");
		await expect(panel).toBeHidden();
		await expect(trigger).toBeFocused();
		await expect(trigger).toHaveAttribute("aria-expanded", "false");

		await page.keyboard.press(" ");
		await expect(panel).toBeVisible();
		await clickOutside(page);
		await expect(panel).toBeHidden();
		expect(await activeIsBody(page)).toBe(false);
		await expect(trigger).toBeFocused();
	});

	test("DropdownMenu: Enter and Space open on the first item, Escape returns focus, Tab leaves", async ({
		page,
	}) => {
		await openDocs(page, "dropdown-menu");
		const trigger = stage(page).getByRole("button", { name: "Options" });
		await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
		await expect(trigger).toHaveAttribute("aria-expanded", "false");

		for (const key of ["Enter", " "]) {
			await trigger.focus();
			await page.keyboard.press(key);
			const menu = page.getByRole("menu");
			await expect(menu, `menu opens on ${JSON.stringify(key)}`).toBeVisible();
			await expect(trigger).toHaveAttribute("aria-expanded", "true");
			expect(await menu.getAttribute("id")).toBe(await trigger.getAttribute("aria-controls"));
			await expect(menu.getByRole("menuitem", { name: "Rename" })).toBeFocused();
			await page.keyboard.press("ArrowDown");
			await expect(menu.getByRole("menuitem", { name: "Duplicate" })).toBeFocused();

			await page.keyboard.press("Escape");
			await expect(menu).toBeHidden();
			await expect(trigger).toBeFocused();
			await expect(trigger).toHaveAttribute("aria-expanded", "false");
		}

		// A menu is not modal: Tab closes it and does not cycle inside.
		await page.keyboard.press("Enter");
		const menu = page.getByRole("menu");
		await expect(menu).toBeVisible();
		await page.keyboard.press("Tab");
		await expect(menu).toBeHidden();

		// Outside click closes, and focus is not dropped to the body.
		await trigger.focus();
		await page.keyboard.press("Enter");
		await expect(menu).toBeVisible();
		await clickOutside(page);
		await expect(menu).toBeHidden();
		expect(await activeIsBody(page)).toBe(false);
		await expect(trigger).toBeFocused();
	});

	test("CommandMenu: keyboard open, search input focused, trap, Escape, focus return, scroll lock", async ({
		page,
	}) => {
		await openDocs(page, "command-menu");
		const trigger = stage(page).getByRole("button", { name: "Open command menu" });
		await trigger.focus();
		await page.keyboard.press("Enter");
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole("combobox")).toBeFocused();
		expect(await scrollLocked(page)).toBe(true);
		await expectTabStaysInside(page, dialog, 3);
		await expectTabStaysInside(page, dialog, 3, true);

		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await expect(trigger).toBeFocused();
		expect(await scrollLocked(page)).toBe(false);

		await page.keyboard.press(" ");
		await expect(dialog).toBeVisible();
		await clickOutside(page);
		await expect(dialog).toBeHidden();
		expect(await activeIsBody(page)).toBe(false);
		await expect(trigger).toBeFocused();
		expect(await scrollLocked(page)).toBe(false);
	});

	test("Tooltip: keyboard focus opens it, Escape closes it and focus stays on the trigger", async ({
		page,
	}) => {
		await openDocs(page, "tooltip");
		const trigger = stage(page).getByRole("button", { name: "Add to favorites" });
		// Opened by focus from the keyboard (focus-visible), not by Enter: Enter activates the button.
		await trigger.focus();
		const tooltip = page.getByRole("tooltip");
		await expect(tooltip).toBeVisible();
		await expect(trigger).toHaveAttribute("aria-describedby", (await tooltip.getAttribute("id"))!);
		expect(await scrollLocked(page)).toBe(false);

		await page.keyboard.press("Escape");
		await expect(tooltip).toBeHidden();
		await expect(trigger).toBeFocused();
		await expect(trigger).not.toHaveAttribute("aria-describedby");
	});

	// An input-anchored panel hands no focus back on dismiss: a press on plain
	// page text has to blur the input as usual, or the field stays focused and
	// a focus-to-open field cannot be reopened by clicking it again.
	test("Combobox: an outside press on plain text blurs the input, and a click reopens it", async ({
		page,
	}) => {
		await openDocs(page, "combobox");
		const input = stage(page).getByRole("combobox");
		const listbox = page.getByRole("listbox");

		await input.click();
		await expect(listbox).toBeVisible();
		await expect(input).toBeFocused();

		await page.locator("h1").first().click();
		await expect(listbox).toBeHidden();
		await expect(input).not.toBeFocused();

		await input.click();
		await expect(listbox).toBeVisible();
		await expect(input).toBeFocused();
	});
});
