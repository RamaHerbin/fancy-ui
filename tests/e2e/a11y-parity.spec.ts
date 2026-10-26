import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { getComponentsByStatus } from "../../src/lib/fancy-ui/registry";

// Accessibility gate: every finished component's parity stage, in both themes,
// must have no serious or critical axe violation. One test per slug so a failure
// names the component. Markup the demo harness owns (prose, wrappers) opts out
// with a `data-demo` attribute.

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const POPUPS = [
	"[role=dialog]",
	"[role=alertdialog]",
	"[role=listbox]",
	"[role=menu]",
	"[role=tooltip]",
	"[popover]",
];

const slugs = getComponentsByStatus("done")
	.map((c) => c.slug)
	.sort();

async function settle(page: Page) {
	await page.evaluate(async () => {
		await document.fonts.ready;
		// Streaming demos keep inserting `.ft-fresh` tint spans: wait for them to go quiet.
		for (let i = 0; i < 80 && document.querySelector("[data-parity-stage] .ft-fresh"); i++) {
			await new Promise((r) => setTimeout(r, 100));
		}
		document.getAnimations().forEach((a) => {
			try {
				a.finish();
			} catch {
				// an infinite animation cannot finish
			}
		});
		await new Promise((r) => setTimeout(r, 300));
	});
}

async function scan(page: Page) {
	const builder = new AxeBuilder({ page }).withTags(TAGS).exclude("[data-demo]");
	builder.include("[data-parity-stage]");
	for (const sel of POPUPS) {
		if (await page.locator(sel).count()) builder.include(sel);
	}
	const { violations } = await builder.analyze();
	return violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

test.describe.configure({ mode: "parallel" });

for (const slug of slugs) {
	for (const theme of ["light", "dark"] as const) {
		test(`a11y-parity ${slug} (${theme})`, async ({ page }) => {
			await page.goto(`/_parity/${slug}?theme=${theme}`);
			await page.waitForLoadState("networkidle");
			await settle(page);
			let hits = await scan(page);
			if (hits.length) {
				// timer-driven reveals are not WAAPI animations: give them real time, keep persisting hits
				await page.waitForTimeout(4000);
				await settle(page);
				hits = await scan(page);
			}
			expect(
				hits.map((v) => ({
					id: v.id,
					impact: v.impact,
					nodes: v.nodes.map((n) => `${n.target.join(" ")} :: ${n.html.slice(0, 160)}`),
				}))
			).toEqual([]);
		});
	}
}
