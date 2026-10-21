import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import PixelLoader from "./PixelLoader.vue";

describe("PixelLoader listeners and precedence", () => {
	afterEach(cleanup);

	it("calls a consumer click listener once", async () => {
		const spy = vi.fn();
		const { getByTestId } = render(PixelLoader, { attrs: { "data-testid": "p", onClick: spy } });
		getByTestId("p").click();
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it("lets a consumer style win over the component's own", () => {
		const { getByTestId } = render(PixelLoader, {
			attrs: { "data-testid": "p", style: "--ft-pixel-speed: 9s; opacity: 0.5" },
		});
		const el = getByTestId("p");
		expect(el.style.getPropertyValue("--ft-pixel-speed")).toBe("9s");
		expect(el.style.opacity).toBe("0.5");
	});
});
