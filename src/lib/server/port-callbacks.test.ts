import { describe, expect, it } from "vitest";
import { parseCallbacks, portCallbacksFor } from "./port-callbacks.js";

describe("parseCallbacks", () => {
	it("reads callback members and skips plain keys", () => {
		const src = `
interface Props {
	onpercentagechange?: (percentage: number) => void;
	onFadeIn?: (() => void) | (() => void)[];
	onPhaseChange: (phase: string) => void;
}
const options = {
	once: true,
	onchange: null,
};
`;
		expect(parseCallbacks(src)).toEqual(["onpercentagechange", "onFadeIn", "onPhaseChange"]);
	});
});

describe("portCallbacksFor", () => {
	it("reads the names the React port keeps lowercase", () => {
		expect(portCallbacksFor("react", "compare", "Compare")).toEqual(
			expect.arrayContaining(["onpercentagechange", "ondragstart", "ondragend"])
		);
		expect(portCallbacksFor("react", "pulse-beam", "PulseBeam")).toEqual(
			expect.arrayContaining(["onfadein", "onfadeout"])
		);
		expect(portCallbacksFor("react", "datamosh-transition", "DatamoshTransition")).toEqual(
			expect.arrayContaining(["oncovered", "onrevealed", "onPhaseChange"])
		);
	});

	it("reads the camel-cased props of the Vue port", () => {
		expect(portCallbacksFor("vue", "compare", "Compare")).toEqual(
			expect.arrayContaining(["onPercentageChange", "onpercentagechange"])
		);
	});

	it("does not list native handlers a port only forwards", () => {
		expect(portCallbacksFor("react", "ripple-button", "RippleButton")).not.toContain(
			"onPointerMove"
		);
		expect(portCallbacksFor("vue", "ripple-button", "RippleButton")).not.toContain("onPointerMove");
	});

	it("skips test files", () => {
		// The React Compare test stubs matchMedia with `onchange: null`.
		expect(portCallbacksFor("react", "compare", "Compare")).not.toContain("onchange");
	});

	it("is empty for a component without a port", () => {
		expect(portCallbacksFor("vue", "no-such-component", "NoSuchComponent")).toEqual([]);
	});
});
