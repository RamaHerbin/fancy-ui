import { expect, test, type Page } from "@playwright/test";

// The framework choice is client state read after mount, so interactions wait
// for hydration instead of racing the prerendered (Svelte) HTML.
async function hydrated(page: Page) {
	await page.waitForLoadState("networkidle");
}

async function pick(page: Page, name: "React" | "Svelte" | "Vue") {
	const radio = page.getByRole("radio", { name }).first();
	await radio.click();
	await expect(radio).toHaveAttribute("aria-checked", "true");
}

interface RegistryJson {
	name: string;
	version: number;
	components: {
		slug: string;
		docs: Record<"svelte" | "react" | "vue", string | null>;
		copySource: Record<"svelte" | "react" | "vue", string | null>;
	}[];
}

const SITE = "https://fancy-ui.rama.app";
const local = (url: string) => url.replace(SITE, "");

const FRAMEWORKS = [
	{ label: "Svelte", registry: "/r/svelte/", importRoot: "$lib/components/ui/fancy/" },
	{ label: "React", registry: "/r/", importRoot: "@/components/ui/fancy/components/" },
	{ label: "Vue", registry: "/r/vue/", importRoot: "@/components/ui/fancy/components/" },
] as const;

test.describe("Every component page offers the copy-source install", () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => localStorage.removeItem("fancy-ui-framework"));
	});

	for (const slug of ["rainbow-button", "border-beam", "compare"]) {
		test(`${slug}: the copy tab follows the framework`, async ({ page }) => {
			await page.goto(`/docs/components/${slug}`);
			await hydrated(page);
			const install = page.locator("section:has(h2#installation)");

			for (const fw of FRAMEWORKS) {
				await pick(page, fw.label);
				await install.getByRole("button", { name: "Copy source", exact: true }).click();
				await expect(install.locator(".docs-install-cmd")).toContainText(
					`${fw.registry}${slug}.json`
				);
				await expect(install).toContainText(`from "${fw.importRoot}${slug}"`);
			}
		});
	}

	test("the sound module imports from where the copy lands", async ({ page }) => {
		await page.goto("/docs/components/sound?framework=react");
		await hydrated(page);
		const install = page.locator("section:has(h2#installation)");
		await install.getByRole("button", { name: "Copy source", exact: true }).click();
		await expect(install).toContainText('from "@/components/ui/fancy/sound"');
		await expect(install).not.toContainText("fancy/components/sound");
	});

	test("the page links the Markdown edition of each framework", async ({ page }) => {
		await page.goto("/docs/components/rainbow-button");
		const alternates = page.locator('link[rel="alternate"][type="text/markdown"]');
		await expect(alternates).toHaveCount(3);
		const hrefs = await alternates.evaluateAll((links) =>
			links.map((link) => link.getAttribute("href"))
		);
		expect(hrefs).toEqual([
			"/docs/components/rainbow-button.md",
			"/docs/components/react/rainbow-button.md",
			"/docs/components/vue/rainbow-button.md",
		]);
	});
});

test.describe("registry.json v2 links resolve", () => {
	let json: RegistryJson;

	test.beforeAll(async ({ request }) => {
		const res = await request.get("/registry.json");
		expect(res.ok()).toBe(true);
		json = await res.json();
	});

	test("is the project-wide v2 index", () => {
		expect(json.name).toBe("fancy-ui");
		expect(json.version).toBe(2);
		expect(json.components.length).toBeGreaterThan(100);
	});

	test("every copy source is a registry item of that name", async ({ request }) => {
		test.setTimeout(180_000);
		for (const c of json.components) {
			for (const url of Object.values(c.copySource)) {
				if (!url) continue;
				const res = await request.get(local(url));
				expect(res.status(), url).toBe(200);
				expect((await res.json()).name, url).toBe(c.slug);
			}
		}
	});

	test("every Markdown URL serves that framework's page", async ({ request }) => {
		test.setTimeout(180_000);
		const pkg = { svelte: "fancy-ui-svelte", react: "fancy-ui-react", vue: "fancy-ui-vue" };
		for (const c of json.components) {
			for (const [fw, url] of Object.entries(c.docs) as [keyof typeof pkg, string | null][]) {
				if (!url) continue;
				const res = await request.get(local(url));
				expect(res.status(), url).toBe(200);
				expect(await res.text(), url).toContain(`\`${pkg[fw]}\``);
			}
		}
	});
});
