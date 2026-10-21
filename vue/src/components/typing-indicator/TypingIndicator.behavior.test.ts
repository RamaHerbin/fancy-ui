import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import TypingIndicator from "./TypingIndicator.vue";

describe("TypingIndicator precedence", () => {
	afterEach(cleanup);

	it("keeps the component's own custom properties over a consumer style", () => {
		const { getByTestId } = render(TypingIndicator, {
			attrs: { "data-testid": "t", style: "--ft-typing-size: 99px; opacity: 0.5" },
		});
		const el = getByTestId("t");
		expect(el.style.getPropertyValue("--ft-typing-size")).toBe("6px");
		expect(el.style.opacity).toBe("0.5");
	});
});
