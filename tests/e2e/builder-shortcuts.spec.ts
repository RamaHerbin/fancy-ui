import { test, expect } from '@playwright/test';

const BUILDER_URL = '/builder/test';
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

/** Wait for the editor to be fully loaded and hydrated */
async function waitForEditor(page: import('@playwright/test').Page) {
	await page.locator('[role="treeitem"]').first().waitFor({ timeout: 15000 });
	await page.waitForLoadState('networkidle');
}

/** Return the currently selected tree item (aria-selected="true") */
function selectedItem(page: import('@playwright/test').Page) {
	return page.locator('[role="treeitem"][aria-selected="true"]');
}

test.describe('Builder — Keyboard shortcuts', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(BUILDER_URL);
		await waitForEditor(page);
	});

	test('ArrowDown selects the first block when nothing is selected', async ({ page }) => {
		// Nothing selected initially
		await expect(selectedItem(page)).toHaveCount(0);

		await page.keyboard.press('ArrowDown');

		await expect(selectedItem(page)).toHaveCount(1);
	});

	test('ArrowDown / ArrowUp navigates through the layer tree', async ({ page }) => {
		// Select the first node
		await page.keyboard.press('ArrowDown');
		await expect(selectedItem(page)).toHaveCount(1);
		const first = await selectedItem(page).getAttribute('data-drop-id');

		// Move down
		await page.keyboard.press('ArrowDown');
		const second = await selectedItem(page).getAttribute('data-drop-id');
		expect(second).not.toBe(first);

		// Move back up
		await page.keyboard.press('ArrowUp');
		const backToFirst = await selectedItem(page).getAttribute('data-drop-id');
		expect(backToFirst).toBe(first);
	});

	test('Escape deselects the current block', async ({ page }) => {
		// Select a block
		await page.locator('[role="treeitem"]').first().click();
		await expect(selectedItem(page)).toHaveCount(1);

		await page.keyboard.press('Escape');

		await expect(selectedItem(page)).toHaveCount(0);
	});

	test('Cmd+D duplicates the selected block', async ({ page }) => {
		const initialCount = await page.locator('[role="treeitem"]').count();

		// Select the first root block (the spacer)
		await page.locator('[role="treeitem"]').first().click();
		await expect(selectedItem(page)).toHaveCount(1);

		await page.keyboard.press(`${modifier}+d`);

		// A duplicate should appear
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount + 1);
	});

	test('Cmd+Z undoes the duplication', async ({ page }) => {
		const initialCount = await page.locator('[role="treeitem"]').count();

		// Select and duplicate
		await page.locator('[role="treeitem"]').first().click();
		await page.keyboard.press(`${modifier}+d`);
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount + 1);

		// Undo
		await page.keyboard.press(`${modifier}+z`);
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount);
	});

	test('Backspace deletes the selected block', async ({ page }) => {
		const initialCount = await page.locator('[role="treeitem"]').count();

		// Select the first root block
		await page.locator('[role="treeitem"]').first().click();

		await page.keyboard.press('Backspace');

		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount - 1);

		// Undo to restore
		await page.keyboard.press(`${modifier}+z`);
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount);
	});

	test('Cmd+C / Cmd+V copies and pastes a block', async ({ page }) => {
		const initialCount = await page.locator('[role="treeitem"]').count();

		// Select the first block
		await page.locator('[role="treeitem"]').first().click();

		// Copy
		await page.keyboard.press(`${modifier}+c`);

		// Paste
		await page.keyboard.press(`${modifier}+v`);

		// One new block added
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount + 1);

		// Undo
		await page.keyboard.press(`${modifier}+z`);
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount);
	});

	test('Cmd+X cuts (removes) the selected block', async ({ page }) => {
		const initialCount = await page.locator('[role="treeitem"]').count();

		// Select the first block
		await page.locator('[role="treeitem"]').first().click();
		await expect(selectedItem(page)).toHaveCount(1);
		const cutId = await selectedItem(page).getAttribute('data-drop-id');

		// Cut
		await page.keyboard.press(`${modifier}+x`);

		// Block removed
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount - 1);

		// The cut block is no longer in the tree
		await expect(page.locator(`[data-drop-id="${cutId}"]`)).toHaveCount(0);

		// Undo restores it
		await page.keyboard.press(`${modifier}+z`);
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount);
	});

	test('Shortcuts are ignored when focus is in an input', async ({ page }) => {
		const initialCount = await page.locator('[role="treeitem"]').count();

		// Select a block first
		await page.locator('[role="treeitem"]').first().click();
		await expect(selectedItem(page)).toHaveCount(1);

		// Focus the title input in the top bar
		const titleInput = page.locator('input[type="text"]').first();
		await titleInput.click();

		// Try to duplicate — should be ignored because we're in an input
		await page.keyboard.press(`${modifier}+d`);

		// Count should remain the same
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount);
	});
});
