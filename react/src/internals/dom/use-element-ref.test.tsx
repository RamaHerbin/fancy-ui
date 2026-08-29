import { useEffect } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { useElementRef } from "./use-element-ref.js";

describe("useElementRef", () => {
	afterEach(cleanup);

	it("reports null on the first render and the node once it is attached", () => {
		const seen: (HTMLDivElement | null)[] = [];

		function Probe() {
			const [node, ref] = useElementRef<HTMLDivElement>();
			seen.push(node);
			return <div ref={ref} data-testid="target" />;
		}

		render(<Probe />);

		expect(seen[0]).toBeNull();
		expect(seen.at(-1)).toBe(screen.getByTestId("target"));
	});

	it("keeps one setter identity for the life of the component", () => {
		const setters: unknown[] = [];

		function Probe({ n }: { n: number }) {
			const [, ref] = useElementRef<HTMLDivElement>();
			setters.push(ref);
			return <div ref={ref}>{n}</div>;
		}

		const { rerender } = render(<Probe n={1} />);
		rerender(<Probe n={2} />);
		rerender(<Probe n={3} />);

		expect(setters.length).toBeGreaterThan(1);
		expect(new Set(setters).size).toBe(1);
	});

	it("re-runs an effect keyed on [node] when a conditional node appears — the C-1 bug class", () => {
		const arm = vi.fn();
		const disarm = vi.fn();

		function Panel({ open }: { open: boolean }) {
			const [node, ref] = useElementRef<HTMLDivElement>();
			useEffect(() => {
				if (!node) return;
				arm(node);
				return () => {
					disarm(node);
				};
			}, [node]);
			return open ? <div ref={ref} data-testid="panel" /> : null;
		}

		const { rerender } = render(<Panel open={false} />);
		expect(arm).not.toHaveBeenCalled();

		rerender(<Panel open />);
		expect(arm).toHaveBeenCalledTimes(1);
		expect(arm).toHaveBeenCalledWith(screen.getByTestId("panel"));

		rerender(<Panel open={false} />);
		expect(disarm).toHaveBeenCalledTimes(1);
	});

	it("publishes null again when the element is detached", () => {
		const seen: (HTMLDivElement | null)[] = [];

		function Probe({ open }: { open: boolean }) {
			const [node, ref] = useElementRef<HTMLDivElement>();
			seen.push(node);
			return open ? <div ref={ref} /> : null;
		}

		const { rerender } = render(<Probe open />);
		expect(seen.at(-1)).toBeInstanceOf(HTMLDivElement);

		rerender(<Probe open={false} />);
		expect(seen.at(-1)).toBeNull();
	});
});
