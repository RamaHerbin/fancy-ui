import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import NeonBorder from "./NeonBorder.svelte";

describe("NeonBorder style merge", () => {
	afterEach(cleanup);

	it("merges a consumer style and keeps the component's --neon-* vars winning", () => {
		const { getByTestId } = render(NeonBorder, {
			props: { "data-testid": "n", style: "--neon-duration: 99s; opacity: 0.5" },
		});
		const el = getByTestId("n");
		expect(el.style.getPropertyValue("--neon-duration")).toBe("6s");
		expect(el.style.opacity).toBe("0.5");
	});
});
