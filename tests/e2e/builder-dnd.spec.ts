import { test, expect } from '@playwright/test';

const BUILDER_URL = '/builder/test';
// process.platform matches the test runner OS — fine for local + CI where
// runner and browser always share the same platform (no remote browsers).
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('Builder — Drag-and-drop (palette → canvas)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(BUILDER_URL);
		await page.locator('[role="treeitem"]').first().waitFor({ timeout: 15000 });
		// networkidle ensures Svelte hydration is complete before interacting
		await page.waitForLoadState('networkidle');
	});

	test('Clicking a palette component adds it to the canvas and layer tree', async ({ page }) => {
		const initialCount = await page.locator('[role="treeitem"]').count();

		await page.locator('[data-testid="palette-item-_spacer"]').click();

		// A new block should appear in the layer tree
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount + 1);
	});

	test('Undo removes the added block', async ({ page }) => {
		const initialCount = await page.locator('[role="treeitem"]').count();

		// Add a component via click
		await page.locator('[data-testid="palette-item-_spacer"]').click();
		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount + 1);

		// Undo
		await page.keyboard.press(`${modifier}+z`);

		await expect(page.locator('[role="treeitem"]')).toHaveCount(initialCount);
	});

	test('Dragging a palette component to the canvas adds it', async ({ page }) => {
		const initialCount = await page.locator('[role="treeitem"]').count();

		const paletteBtn = page.locator('[data-testid="palette-item-_spacer"]');
		const canvas = page.locator('[data-testid="canvas"]');

		// Get bounding boxes
		const paletteBB = await paletteBtn.boundingBox();
		const canvasBB = await canvas.boundingBox();
		expect(paletteBB).toBeTruthy();
		expect(canvasBB).toBeTruthy();

		// Simulate a pointer-event based drag (start → move past threshold → release on canvas).
		// The component uses pointer events with a 5px drag threshold, so we move 10px first
		// to initiate the drag, then glide to the canvas center before dropping.
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
