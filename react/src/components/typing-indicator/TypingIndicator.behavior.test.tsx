import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { TypingIndicator } from "./TypingIndicator.js";

describe("TypingIndicator precedence", () => {
	afterEach(cleanup);

	it("keeps the component's own custom properties over a consumer style", () => {
		const { getByTestId } = render(
			<TypingIndicator
				data-testid={"t"}
				style={{ "--ft-typing-size": "99px", opacity: "0.5" } as React.CSSProperties}
			/>
		);
		const el = getByTestId("t");
		expect(el.style.getPropertyValue("--ft-typing-size")).toBe("6px");
		expect(el.style.opacity).toBe("0.5");
	});
});
