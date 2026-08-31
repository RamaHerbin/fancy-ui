import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { TerminalBlock } from "./TerminalBlock.js";

const ESC = "\u001b";

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

function log(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="log"]') as HTMLElement;
}

/** The output rows, in order, excluding the command line. */
function rows(container: HTMLElement): HTMLElement[] {
	return Array.from(log(container).querySelectorAll(".ft-line")).filter(
		(el) => !el.classList.contains("flex")
	) as HTMLElement[];
}

function textOf(container: HTMLElement): string[] {
	return rows(container).map((el) => el.textContent ?? "");
}

describe("TerminalBlock", () => {
	afterEach(cleanup);

	it("renders the command after the prompt glyph", () => {
		const { container } = render(<TerminalBlock output="" command="pnpm build" prompt=">" />);

		const commandLine = log(container).querySelector(".flex") as HTMLElement;
		expect(commandLine.textContent).toContain(">");
		expect(commandLine.textContent).toContain("pnpm build");
		expect(commandLine.querySelector(".ft-prompt")?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders no command line at all when no command is given", () => {
		const { container } = render(<TerminalBlock output="done" />);
		expect(log(container).querySelector(".ft-prompt")).toBeNull();
	});

	it("renders one row per line of output", () => {
		const { container } = render(
			<TerminalBlock output={"added 214 packages\naudited 215 packages\nfound 0 vulnerabilities"} />
		);

		expect(textOf(container)).toEqual([
			"added 214 packages",
			"audited 215 packages",
			"found 0 vulnerabilities",
		]);
	});

	it("appends rows as the output grows, keeping the ones already there", () => {
		const { container, rerender } = render(<TerminalBlock output="resolving…" running />);
		expect(textOf(container)).toEqual(["resolving…▊"]);

		rerender(<TerminalBlock output={"resolving…\nfetching…\n"} running />);

		// The trailing newline leaves an empty row for the cursor to sit on,
		// exactly where a terminal would put it.
		expect(textOf(container)).toEqual(["resolving…", "fetching…", "▊"]);
	});

	it("drops the trailing blank row once the run is over", () => {
		const { container, rerender } = render(<TerminalBlock output={"building\n"} running />);
		expect(textOf(container)).toHaveLength(2);

		rerender(<TerminalBlock output={"building\n"} running={false} exitCode={0} />);
		expect(textOf(container)).toEqual(["building"]);
	});

	it("colours a segment through the CSS variable for its ANSI code", () => {
		const { container } = render(<TerminalBlock output={`${ESC}[32m✓ ok${ESC}[0m done`} />);

		const spans = rows(container)[0]!.querySelectorAll("span");
		expect(spans[0]!.getAttribute("style")).toContain("var(--ft-terminal-green");
		expect(spans[0]!.textContent).toBe("✓ ok");
		expect(spans[1]!.getAttribute("style")).toBeNull();
		expect(spans[1]!.textContent).toBe(" done");
	});

	it("marks a bold segment without touching its colour", () => {
		const { container } = render(<TerminalBlock output={`${ESC}[1;31mERR!${ESC}[0m`} />);

		const span = rows(container)[0]!.querySelector("span") as HTMLElement;
		expect(span.classList.contains("ft-bold")).toBe(true);
		expect(span.getAttribute("style")).toContain("var(--ft-terminal-red");
	});

	it("joins the segments of a line with no whitespace of its own", () => {
		const { container } = render(
			<TerminalBlock output={`${ESC}[32mA${ESC}[0mB${ESC}[33mC`} />
		);

		expect(rows(container)[0]!.textContent).toBe("ABC");
	});

	it("keeps a colour open across the lines it spans", () => {
		const { container } = render(
			<TerminalBlock output={`${ESC}[33mfirst\nsecond${ESC}[0m`} />
		);

		const [one, two] = rows(container) as [HTMLElement, HTMLElement];
		expect((one.querySelector("span") as HTMLElement).getAttribute("style")).toContain(
			"--ft-terminal-yellow"
		);
		expect((two.querySelector("span") as HTMLElement).getAttribute("style")).toContain(
			"--ft-terminal-yellow"
		);
	});

	it("still strips escapes when ansi is false, but paints nothing", () => {
		const { container } = render(
			<TerminalBlock output={`${ESC}[1;32mpassed${ESC}[0m`} ansi={false} />
		);

		const span = rows(container)[0]!.querySelector("span") as HTMLElement;
		expect(span.textContent).toBe("passed");
		expect(span.getAttribute("style")).toBeNull();
		expect(span.classList.contains("ft-bold")).toBe(false);
	});

	it("shows the block cursor on the last row only while running", () => {
		const { container, rerender } = render(
			<TerminalBlock output={"step one\nstep two"} running />
		);

		expect(container.querySelectorAll(".ft-cursor")).toHaveLength(1);
		expect(rows(container)[1]!.textContent).toBe("step two▊");

		rerender(<TerminalBlock output={"step one\nstep two"} running={false} />);
		expect(container.querySelector(".ft-cursor")).toBeNull();
	});

	it("gives an empty running stream a row for the cursor to sit on", () => {
		const { container } = render(<TerminalBlock output="" command="pnpm test" running />);

		expect(container.querySelectorAll(".ft-cursor")).toHaveLength(1);
	});

	it("shows no footer until an exit code arrives", () => {
		const { container, rerender } = render(<TerminalBlock output="working" running />);
		expect(container.querySelector('[role="status"]')).toBeNull();

		rerender(
			<TerminalBlock output="working" running={false} exitCode={0} durationMs={1240} />
		);

		const footer = container.querySelector('[role="status"]') as HTMLElement;
		expect(footer.textContent).toContain("✓");
		expect(footer.textContent).toContain("exited 0");
		expect(footer.textContent).toContain("1.2s");
		expect(footer.classList.contains("ft-ok")).toBe(true);
	});

	it("marks a non-zero exit as a failure", () => {
		const { container } = render(<TerminalBlock output="boom" exitCode={1} durationMs={340} />);

		const footer = container.querySelector('[role="status"]') as HTMLElement;
		expect(footer.textContent).toContain("✗");
		expect(footer.textContent).toContain("exited 1");
		expect(footer.textContent).toContain("340ms");
		expect(footer.classList.contains("ft-ok")).toBe(false);
	});

	it("leaves the duration out when it is absent or nonsense", () => {
		const { container } = render(
			<TerminalBlock output="x" exitCode={0} durationMs={Number.NaN} />
		);

		expect(container.querySelector(".ft-muted")).toBeNull();
	});

	it("scrolls the output region at the height it was given, as a log", () => {
		const { container } = render(<TerminalBlock output="a" maxHeight="8rem" />);

		expect(log(container).style.maxHeight).toBe("8rem");
		expect(log(container).className).toContain("overflow-y-auto");
	});

	it("renders the header snippet above the output", () => {
		const { container } = render(
			<TerminalBlock output="a" header={<span>build.log</span>} />
		);

		expect(root(container).textContent).toContain("build.log");
		expect(container.querySelector(".ft-rule")).not.toBeNull();
	});

	it("merges custom classes onto the root alongside the base ones", () => {
		const { container } = render(<TerminalBlock output="a" className="my-block" />);

		expect(root(container).className).toContain("my-block");
		expect(root(container).className).toContain("font-mono");
	});

	it.each([
		[59_999, "1m 00s"],
		[119_999, "2m 00s"],
		[3_599_999, "60m 00s"],
	])("carries a rounded %ims into the next minute", (durationMs, expected) => {
		// Rounding each unit on its own produced counts that do not exist: "60.0s",
		// "1m 60s", "59m 60s".
		const { container } = render(<TerminalBlock output="x" exitCode={0} durationMs={durationMs} />);
		expect(container.querySelector(".ft-muted")?.textContent).toContain(expected);
	});

	it("pins an already-running transcript that mounts overflowing", () => {
		// jsdom lays nothing out, so the container has to be told it overflows.
		const original = Object.getOwnPropertyDescriptor(Element.prototype, "scrollHeight");
		Object.defineProperty(Element.prototype, "scrollHeight", { configurable: true, value: 1000 });
		try {
			const { container } = render(<TerminalBlock output={"line\n".repeat(50)} running />);
			expect(log(container).scrollTop).toBe(1000);
		} finally {
			if (original) Object.defineProperty(Element.prototype, "scrollHeight", original);
		}
	});
});
