import type { Page } from "@playwright/test";

/**
 * Console errors that are a documented fallback, not a failure. Library demos
 * may log the WebGL one when the browser has no WebGL.
 */
export const KNOWN_NOISE: string[] = ["Unable to initialize WebGL."];

/**
 * Keep a test off the network for the GitHub star counter: the public API
 * answers 403 once a shared runner is rate limited.
 */
export async function routeGithubApi(page: Page): Promise<void> {
	await page.route("https://api.github.com/**", (route) =>
		route.fulfill({ json: { stargazers_count: 0 } })
	);
}

/**
 * Collect console errors that are not known noise. Read `.errors` at the end
 * of the test and assert it is empty.
 */
export function collectConsoleErrors(page: Page): { errors: string[] } {
	const errors: string[] = [];
	page.on("console", (msg) => {
		if (msg.type() === "error" && !KNOWN_NOISE.includes(msg.text())) {
			errors.push(msg.text());
		}
	});
	return { errors };
}
