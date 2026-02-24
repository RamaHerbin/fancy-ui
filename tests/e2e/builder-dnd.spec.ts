import { test, expect } from '@playwright/test';

const BUILDER_URL = '/builder/test';
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('Builder — Drag-and-drop (palette → canvas)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(BUILDER_URL);
		await page.locator('[role="treeitem"]').first().waitFor({ timeout: 15000 });
		await page.waitForLoadState('networkidle');
	});

	test('Clicking a palette component adds it to the canvas and layer tree', async ({ page }) => {
		const initialCount = await page.locator('[role="treeitem"]').count();

		// Click "Spacer" from the palette — it's a button in the palette panel (left sidebar)
		// Use a more specific selector to target palette buttons (not tree items)
		const paletteButton = page.locator('button', { hasText: 'Spacer' }).first();
		await paletteButton.click();

		// A new block should appear in the layer tree
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount + 1);
	});

	test('Undo removes the added block', async ({ page }) => {
		const initialCount = await page.locator('[role="treeitem"]').count();

		// Add a component via click
		const paletteButton = page.locator('button', { hasText: 'Spacer' }).first();
		await paletteButton.click();
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount + 1);

		// Undo
		await page.keyboard.press(`${modifier}+z`);

		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount);
	});

	test('Dragging a palette component to the canvas adds it', async ({ page }) => {
		const initialCount = await page.locator('[role="treeitem"]').count();

		// Locate a palette button and the canvas drop zone
		const paletteBtn = page.locator('button', { hasText: 'Spacer' }).first();
		const canvas = page.locator('.overflow-y-auto.bg-muted\\/30');

		// Get bounding boxes
		const paletteBB = await paletteBtn.boundingBox();
		const canvasBB = await canvas.boundingBox();
		expect(paletteBB).toBeTruthy();
		expect(canvasBB).toBeTruthy();

		// Simulate a pointer-event based drag (start → move past threshold → release on canvas)
		const startX = paletteBB!.x + paletteBB!.width / 2;
		const startY = paletteBB!.y + paletteBB!.height / 2;
		const endX = canvasBB!.x + canvasBB!.width / 2;
		const endY = canvasBB!.y + canvasBB!.height / 2;

		await page.mouse.move(startX, startY);
		await page.mouse.down();

		// Move past the 5px drag threshold
		await page.mouse.move(startX + 10, startY + 10, { steps: 3 });

		// Move to canvas center
		await page.mouse.move(endX, endY, { steps: 5 });

		// Drop
		await page.mouse.up();

		// A new block should appear
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount + 1);
	});
});
