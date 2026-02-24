import { test, expect } from '@playwright/test';

const BUILDER_URL = '/builder/test';
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('Builder — Save', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(BUILDER_URL);
		await page.locator('[role="treeitem"]').first().waitFor({ timeout: 15000 });
		await page.waitForLoadState('networkidle');
	});

	test('Cmd+S triggers save and the button cycles through Saving → Saved → Save', async ({
		page
	}) => {
		// The button starts at "Save"
		const saveBtn = page.getByRole('button', { name: 'Save' });
		await expect(saveBtn).toBeVisible();

		// Listen for the PUT request
		const savePromise = page.waitForResponse(
			(res) => res.url().includes('/api/builder/pages/test') && res.request().method() === 'PUT'
		);

		await page.keyboard.press(`${modifier}+s`);

		// Wait for the API response
		const response = await savePromise;
		expect(response.ok()).toBe(true);

		// Should transition to "Saved" (green button)
		await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible({ timeout: 5000 });

		// After ~2s should go back to "Save"
		await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 5000 });
	});

	test('Clicking the Save button triggers save', async ({ page }) => {
		const savePromise = page.waitForResponse(
			(res) => res.url().includes('/api/builder/pages/test') && res.request().method() === 'PUT'
		);

		await page.getByRole('button', { name: 'Save' }).click();

		const response = await savePromise;
		expect(response.ok()).toBe(true);

		await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible({ timeout: 5000 });
	});
});
