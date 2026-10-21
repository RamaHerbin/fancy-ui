import { expect, test } from "@playwright/test";

// humans.txt is a plain static file; llms.txt and robots.txt point to it.
test.describe("humans egg", () => {
	// llms.txt is generated on the fly on a cold dev server.
	test.describe.configure({ timeout: 90_000 });

	test("serves humans.txt as plain text with the secrets section", async ({ request }) => {
		const res = await request.get("/humans.txt");
		expect(res.status()).toBe(200);
		expect(res.headers()["content-type"]).toContain("text/plain");
		const body = await res.text();
		expect(body).toContain("/* SECRETS */");
		expect(body).toContain("fancy.help()");
	});

	test("llms.txt links to humans.txt", async ({ request }) => {
		const res = await request.get("/llms.txt", { timeout: 60_000 });
		expect(res.status()).toBe(200);
		expect(await res.text()).toContain("/humans.txt");
	});

	test("robots.txt mentions humans.txt", async ({ request }) => {
		const res = await request.get("/robots.txt");
		expect(res.status()).toBe(200);
		expect(await res.text()).toContain("humans.txt");
	});
});
