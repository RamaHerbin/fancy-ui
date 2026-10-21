// @vitest-environment node
import { describe, expect, it } from "vitest";
import { render } from "svelte/server";
import EggRuntime from "./EggRuntime.svelte";
import { eggRuntime } from "./runtime.svelte.js";

describe("EggRuntime (SSR)", () => {
	it("renders nothing on the server and touches no browser global", () => {
		const { body } = render(EggRuntime);
		// Hydration markers plus the empty, always-present live region: no overlay.
		expect(body.replace(/<!--[^>]*-->/g, "").trim()).toBe(
			'<p class="sr-only" role="status" data-egg-announcer=""></p>'
		);
		expect(eggRuntime.active).toBeNull();
		expect(eggRuntime.start()).toBeTypeOf("function");
	});
});
