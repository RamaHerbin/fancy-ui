import { render, cleanup } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect } from "vitest";
import TerminalBlock from "./TerminalBlock.svelte";

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
		const { container } = render(TerminalBlock, {
			props: { output: "", command: "pnpm build", prompt: ">" },
		});

		const commandLine = log(container).querySelector(".flex") as HTMLElement;
		expect(commandLine.textContent).toContain(">");
		expect(commandLine.textContent).toContain("pnpm build");
		expect(commandLine.querySelector(".ft-prompt")?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders no command line at all when no command is given", () => {
		const { container } = render(TerminalBlock, { props: { output: "done" } });
		expect(log(container).querySelector(".ft-prompt")).toBeNull();
	});

	it("renders one row per line of output", () => {
		const { container } = render(TerminalBlock, {
			props: { output: "added 214 packages\naudited 215 packages\nfound 0 vulnerabilities" },
		});

		expect(textOf(container)).toEqual([
			"added 214 packages",
			"audited 215 packages",
			"found 0 vulnerabilities",
		]);
	});

	it("appends rows as the output grows, keeping the ones already there", async () => {
		const { container, rerender } = render(TerminalBlock, {
			props: { output: "resolving…", running: true },
		});
		expect(textOf(container)).toEqual(["resolving…▊"]);

		await rerender({ output: "resolving…\nfetching…\n", running: true });

		// The trailing newline leaves an empty row for the cursor to sit on,
		// exactly where a terminal would put it.
		expect(textOf(container)).toEqual(["resolving…", "fetching…", "▊"]);
	});

	it("drops the trailing blank row once the run is over", async () => {
		const { container, rerender } = render(TerminalBlock, {
			props: { output: "building\n", running: true },
		});
		expect(textOf(container)).toHaveLength(2);

		await rerender({ output: "building\n", running: false, exitCode: 0 });
		expect(textOf(container)).toEqual(["building"]);
	});

	it("colours a segment through the CSS variable for its ANSI code", () => {
		const { container } = render(TerminalBlock, {
			props: { output: `${ESC}[32m✓ ok${ESC}[0m done` },
		});

		const spans = rows(container)[0].querySelectorAll("span");
		expect(spans[0].getAttribute("style")).toContain("var(--ft-terminal-green");
		expect(spans[0].textContent).toBe("✓ ok");
		expect(spans[1].getAttribute("style")).toBeNull();
		expect(spans[1].textContent).toBe(" done");
	});

	it("marks a bold segment without touching its colour", () => {
		const { container } = render(TerminalBlock, {
			props: { output: `${ESC}[1;31mERR!${ESC}[0m` },
		});

		const span = rows(container)[0].querySelector("span") as HTMLElement;
		expect(span.classList.contains("ft-bold")).toBe(true);
		expect(span.getAttribute("style")).toContain("var(--ft-terminal-red");
	});

	it("joins the segments of a line with no whitespace of its own", () => {
		const { container } = render(TerminalBlock, {
			props: { output: `${ESC}[32mA${ESC}[0mB${ESC}[33mC` },
		});

		expect(rows(container)[0].textContent).toBe("ABC");
	});

	it("keeps a colour open across the lines it spans", () => {
		const { container } = render(TerminalBlock, {
			props: { output: `${ESC}[33mfirst\nsecond${ESC}[0m` },
		});

		const [one, two] = rows(container);
		expect((one.querySelector("span") as HTMLElement).getAttribute("style")).toContain(
			"--ft-terminal-yellow"
		);
		expect((two.querySelector("span") as HTMLElement).getAttribute("style")).toContain(
			"--ft-terminal-yellow"
		);
	});

	it("still strips escapes when ansi is false, but paints nothing", () => {
		const { container } = render(TerminalBlock, {
			props: { output: `${ESC}[1;32mpassed${ESC}[0m`, ansi: false },
		});

		const span = rows(container)[0].querySelector("span") as HTMLElement;
		expect(span.textContent).toBe("passed");
		expect(span.getAttribute("style")).toBeNull();
		expect(span.classList.contains("ft-bold")).toBe(false);
	});

	it("shows the block cursor on the last row only while running", async () => {
		const { container, rerender } = render(TerminalBlock, {
			props: { output: "step one\nstep two", running: true },
		});

		expect(container.querySelectorAll(".ft-cursor")).toHaveLength(1);
		expect(rows(container)[1].textContent).toBe("step two▊");

		await rerender({ output: "step one\nstep two", running: false });
		expect(container.querySelector(".ft-cursor")).toBeNull();
	});

	it("gives an empty running stream a row for the cursor to sit on", () => {
		const { container } = render(TerminalBlock, {
			props: { output: "", command: "pnpm test", running: true },
		});

		expect(container.querySelectorAll(".ft-cursor")).toHaveLength(1);
	});

	it("shows no footer until an exit code arrives", async () => {
		const { container, rerender } = render(TerminalBlock, {
			props: { output: "working", running: true },
		});
		expect(container.querySelector('[role="status"]')).toBeNull();

		await rerender({ output: "working", running: false, exitCode: 0, durationMs: 1240 });

		const footer = container.querySelector('[role="status"]') as HTMLElement;
		expect(footer.textContent).toContain("✓");
		expect(footer.textContent).toContain("exited 0");
		expect(footer.textContent).toContain("1.2s");
		expect(footer.classList.contains("ft-ok")).toBe(true);
	});

	it("marks a non-zero exit as a failure", () => {
		const { container } = render(TerminalBlock, {
			props: { output: "boom", exitCode: 1, durationMs: 340 },
		});

		const footer = container.querySelector('[role="status"]') as HTMLElement;
		expect(footer.textContent).toContain("✗");
		expect(footer.textContent).toContain("exited 1");
		expect(footer.textContent).toContain("340ms");
		expect(footer.classList.contains("ft-ok")).toBe(false);
	});

	it("leaves the duration out when it is absent or nonsense", () => {
		const { container } = render(TerminalBlock, {
			props: { output: "x", exitCode: 0, durationMs: Number.NaN },
		});

		expect(container.querySelector(".ft-muted")).toBeNull();
	});

	it("scrolls the output region at the height it was given, as a log", () => {
		const { container } = render(TerminalBlock, {
			props: { output: "a", maxHeight: "8rem" },
		});

		expect(log(container).style.maxHeight).toBe("8rem");
		expect(log(container).className).toContain("overflow-y-auto");
	});

	it("renders the header snippet above the output", () => {
		const { container } = render(TerminalBlock, {
			props: {
				output: "a",
				header: createRawSnippet(() => ({ render: () => "<span>build.log</span>" })),
			},
		});

		expect(root(container).textContent).toContain("build.log");
		expect(container.querySelector(".ft-rule")).not.toBeNull();
	});

	it("merges custom classes onto the root alongside the base ones", () => {
		const { container } = render(TerminalBlock, {
			props: { output: "a", class: "my-block" },
		});

		expect(root(container).className).toContain("my-block");
		expect(root(container).className).toContain("font-mono");
	});
});
