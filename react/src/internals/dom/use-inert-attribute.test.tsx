import { useState } from "react";
import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { useInertAttribute } from "./use-inert-attribute.js";
import { useComposedRefs } from "./use-composed-refs.js";

function Panel({ inert, id = "panel" }: { inert: boolean; id?: string }) {
	const ref = useInertAttribute<HTMLDivElement>(inert);
	return <div ref={ref} data-testid={id} />;
}

describe("useInertAttribute", () => {
	afterEach(cleanup);

	it("writes the attribute, not a property, on the very first commit", () => {
		const { getByTestId } = render(<Panel inert />);
		// The ATTRIBUTE is the contract: jsdom implements no `inert` IDL
		// property, and it is the attribute that `:not([inert])` selectors and
		// assistive technology read in a real browser.
		expect(getByTestId("panel").hasAttribute("inert")).toBe(true);
	});

	it("leaves the attribute off when the flag starts false", () => {
		const { getByTestId } = render(<Panel inert={false} />);
		expect(getByTestId("panel").hasAttribute("inert")).toBe(false);
	});

	it("adds and removes the attribute as the flag flips", () => {
		const { getByTestId, rerender } = render(<Panel inert={false} />);
		const node = getByTestId("panel");

		rerender(<Panel inert />);
		expect(node.hasAttribute("inert")).toBe(true);

		rerender(<Panel inert={false} />);
		expect(node.hasAttribute("inert")).toBe(false);
	});

	it("re-applies to a node that remounts while the flag is unchanged", () => {
		// The layout effect alone cannot cover this: its dependency never
		// changes, so only the callback ref sees the new node.
		function Remounting() {
			const [key, setKey] = useState(0);
			const ref = useInertAttribute<HTMLDivElement>(true);
			return (
				<>
					<button onClick={() => setKey((k) => k + 1)}>remount</button>
					<div key={key} ref={ref} data-testid="panel" data-key={key} />
				</>
			);
		}

		const { getByTestId, getByText } = render(<Remounting />);
		expect(getByTestId("panel").hasAttribute("inert")).toBe(true);

		act(() => {
			getByText("remount").click();
		});

		const next = getByTestId("panel");
		expect(next.getAttribute("data-key")).toBe("1");
		expect(next.hasAttribute("inert")).toBe(true);
	});

	it("hands back one stable ref identity for the life of the component", () => {
		const seen = new Set<unknown>();

		function Probe({ inert }: { inert: boolean }) {
			seen.add(useInertAttribute<HTMLDivElement>(inert));
			return null;
		}

		const { rerender } = render(<Probe inert={false} />);
		rerender(<Probe inert />);
		rerender(<Probe inert={false} />);
		expect(seen.size).toBe(1);
	});

	it("composes with another ref on the same element", () => {
		let captured: HTMLDivElement | null = null;

		function Composed({ inert }: { inert: boolean }) {
			const inertRef = useInertAttribute<HTMLDivElement>(inert);
			const ref = useComposedRefs<HTMLDivElement>(inertRef, (node) => {
				captured = node;
			});
			return <div ref={ref} data-testid="panel" />;
		}

		const { getByTestId } = render(<Composed inert />);
		expect(captured).toBe(getByTestId("panel"));
		expect(getByTestId("panel").hasAttribute("inert")).toBe(true);
	});
});
