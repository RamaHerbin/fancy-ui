import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { ArtifactCard } from "./ArtifactCard.js";
import { sound, resetSoundForTests } from "../../sound/sound.js";

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

function nav(container: HTMLElement, label: string): HTMLButtonElement {
	return container.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
}

function openCue(container: HTMLElement): HTMLButtonElement {
	return container.querySelector(".ft-artifact-open") as HTMLButtonElement;
}

describe("ArtifactCard", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders the title and falls back to a generic kind", () => {
		const { container } = render(<ArtifactCard title="Q3 revenue memo" />);

		expect(container.querySelector(".ft-artifact-title")?.textContent).toBe("Q3 revenue memo");
		expect(container.querySelector(".ft-artifact-kind")?.textContent).toBe("Document");
	});

	it("renders the kind it is given", () => {
		const { container } = render(<ArtifactCard title="migrate.sql" kind="SQL migration" />);

		expect(container.querySelector(".ft-artifact-kind")?.textContent).toBe("SQL migration");
	});

	it("names the status out loud, since the sweep and the tint are silent", () => {
		const { container, rerender } = render(<ArtifactCard title="Draft" status="streaming" />);

		expect(container.querySelector(".sr-only")?.textContent).toBe("Writing");

		rerender(<ArtifactCard title="Draft" status="done" />);
		expect(container.querySelector(".sr-only")?.textContent).toBe("Ready");
	});

	it("shows a bare version badge when there is no count", () => {
		const { container } = render(<ArtifactCard title="Memo" version={3} />);

		expect(container.querySelector(".ft-artifact-version")?.textContent).toBe("v3");
		expect(nav(container, "Previous version")).toBeNull();
	});

	it("shows the count without a navigator when nobody is listening for a change", () => {
		const { container } = render(<ArtifactCard title="Memo" version={3} versionCount={5} />);

		expect(container.querySelector(".ft-artifact-version")?.textContent).toBe("v3/5");
		expect(nav(container, "Next version")).toBeNull();
	});

	it("turns the badge into a navigator once a change handler exists", () => {
		const { container } = render(
			<ArtifactCard title="Memo" version={3} versionCount={5} onVersionChange={vi.fn()} />,
		);

		expect(container.querySelector(".ft-artifact-version")?.textContent).toBe("v3/5");
		expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe(
			"Document versions",
		);
	});

	it("asks for the neighbouring version by 1-based number", () => {
		const onVersionChange = vi.fn();
		const { container } = render(
			<ArtifactCard title="Memo" version={3} versionCount={5} onVersionChange={onVersionChange} />,
		);

		fireEvent.click(nav(container, "Previous version"));
		expect(onVersionChange).toHaveBeenLastCalledWith(2);

		fireEvent.click(nav(container, "Next version"));
		expect(onVersionChange).toHaveBeenLastCalledWith(4);
		expect(onVersionChange).toHaveBeenCalledTimes(2);
	});

	it("disables the arrow that would run off the end", () => {
		const onVersionChange = vi.fn();
		const { container, rerender } = render(
			<ArtifactCard title="Memo" version={1} versionCount={5} onVersionChange={onVersionChange} />,
		);

		expect(nav(container, "Previous version").disabled).toBe(true);
		expect(nav(container, "Next version").disabled).toBe(false);

		rerender(
			<ArtifactCard title="Memo" version={5} versionCount={5} onVersionChange={onVersionChange} />,
		);
		expect(nav(container, "Previous version").disabled).toBe(false);
		expect(nav(container, "Next version").disabled).toBe(true);

		// Nothing escapes past a bound even if the click lands anyway.
		fireEvent.click(nav(container, "Next version"));
		expect(onVersionChange).not.toHaveBeenCalled();
	});

	it("streams the preview, tinting only what just arrived", () => {
		vi.useFakeTimers();
		const { container, rerender } = render(
			<ArtifactCard title="Memo" status="streaming" preview="The quarter" />,
		);

		expect(container.querySelector(".ft-artifact-preview")?.textContent).toContain("The quarter");
		expect(container.querySelector(".ft-fresh")).toBeFalsy();

		rerender(<ArtifactCard title="Memo" status="streaming" preview="The quarter closed" />);
		expect(container.querySelector(".ft-fresh")?.textContent).toBe(" closed");
		expect(container.querySelector(".ft-artifact-preview")?.textContent).toContain(
			"The quarter closed",
		);
	});

	it("trails a cursor only while the document is being written", () => {
		const { container, rerender } = render(
			<ArtifactCard title="Memo" status="streaming" preview="Half a" />,
		);

		expect(container.querySelector(".ft-streaming-cursor")).toBeTruthy();

		rerender(<ArtifactCard title="Memo" status="done" preview="Half a" />);
		expect(container.querySelector(".ft-streaming-cursor")).toBeFalsy();
	});

	it("omits the preview region when nothing has been written yet", () => {
		const { container } = render(<ArtifactCard title="Memo" status="idle" />);

		expect(container.querySelector(".ft-artifact-preview")).toBeNull();
	});

	it("runs the top sweep only while streaming", () => {
		const { container, rerender } = render(<ArtifactCard title="Memo" status="streaming" />);

		expect(container.querySelector(".ft-artifact-sweep")).toBeTruthy();

		rerender(<ArtifactCard title="Memo" status="done" />);
		expect(container.querySelector(".ft-artifact-sweep")).toBeNull();
	});

	it("stays inert until an open handler arrives", () => {
		const { container } = render(<ArtifactCard title="Memo" />);

		expect(root(container).getAttribute("role")).toBeNull();
		expect(root(container).getAttribute("tabindex")).toBeNull();
		expect(container.querySelector(".ft-artifact-open")).toBeNull();
	});

	it("grows a real Open button, named after the document, rather than an ARIA card", () => {
		const onOpen = vi.fn();
		const { container } = render(<ArtifactCard title="Q3 memo" onOpen={onOpen} />);

		// The root stays a plain region: an ARIA button would make its children
		// presentational and erase the navigator, the actions rail and the status.
		expect(root(container).getAttribute("role")).toBeNull();
		expect(root(container).getAttribute("tabindex")).toBeNull();
		expect(root(container).getAttribute("aria-label")).toBeNull();

		const openButton = openCue(container);
		expect(openButton.tagName).toBe("BUTTON");
		expect(openButton.getAttribute("aria-label")).toBe("Open Q3 memo");
		expect(openButton.textContent).toContain("Open");

		fireEvent.click(openButton);
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it("keeps the card-wide click as a pointer shortcut, and only a pointer one", () => {
		const onOpen = vi.fn();
		const { container } = render(<ArtifactCard title="Q3 memo" onOpen={onOpen} />);

		fireEvent.click(container.querySelector(".ft-artifact-title") as HTMLElement);
		expect(onOpen).toHaveBeenCalledTimes(1);

		// Keys on the root do nothing — the button one element over is the keyboard path.
		fireEvent.keyDown(root(container), { key: "Enter" });
		fireEvent.keyDown(root(container), { key: " " });
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it("keeps the status label and the version navigator out of any ARIA button", () => {
		const { container } = render(
			<ArtifactCard
				title="Memo"
				status="streaming"
				version={2}
				versionCount={4}
				onVersionChange={vi.fn()}
				onOpen={vi.fn()}
			/>,
		);

		expect(root(container).getAttribute("role")).toBeNull();
		expect(container.querySelector(".sr-only")?.textContent).toBe("Writing");
		expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe(
			"Document versions",
		);
	});

	it("lets the version arrows do their own job without opening the document", () => {
		const onOpen = vi.fn();
		const onVersionChange = vi.fn();
		const { container } = render(
			<ArtifactCard
				title="Memo"
				version={2}
				versionCount={4}
				onVersionChange={onVersionChange}
				onOpen={onOpen}
			/>,
		);

		fireEvent.click(nav(container, "Next version"));
		expect(onVersionChange).toHaveBeenCalledWith(3);
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("does not open the document from the navigator's own gaps", () => {
		const onOpen = vi.fn();
		const { container } = render(
			<ArtifactCard
				title="Memo"
				version={1}
				versionCount={4}
				onVersionChange={vi.fn()}
				onOpen={onOpen}
			/>,
		);

		// A disabled arrow retargets its click at whatever is underneath, and the
		// space between the arrows belongs to the navigator either way.
		fireEvent.click(container.querySelector(".ft-artifact-versions") as HTMLElement);
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("renders the actions rail, and its buttons do not open the card", () => {
		const onOpen = vi.fn();
		const { container } = render(
			<ArtifactCard
				title="Memo"
				onOpen={onOpen}
				actions={
					<button type="button" className="custom-action">
						Copy
					</button>
				}
			/>,
		);

		const action = container.querySelector(".custom-action") as HTMLButtonElement;
		expect(action).not.toBeNull();
		expect(container.querySelector(".ft-artifact-actions")?.contains(action)).toBe(true);

		fireEvent.click(action);
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("grows a tinted footer when the document failed, and drops it when it did not", () => {
		const { container, rerender } = render(<ArtifactCard title="Memo" status="error" />);

		expect(container.querySelector(".ft-artifact-error")?.textContent).toBe(
			"This document could not be generated.",
		);
		expect(root(container).dataset.status).toBe("error");

		rerender(<ArtifactCard title="Memo" status="done" />);
		expect(container.querySelector(".ft-artifact-error")).toBeNull();
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(<ArtifactCard title="Memo" className="my-card" />);

		expect(root(container).className).toContain("ft-artifact");
		expect(root(container).className).toContain("my-card");
	});

	describe("sound", () => {
		beforeEach(() => {
			resetSoundForTests();
			window.localStorage.clear();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays press exactly once for the card-wide pointer shortcut", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onOpen = vi.fn();
			const { container } = render(<ArtifactCard title="Q3 memo" onOpen={onOpen} sound />);

			fireEvent.click(container.querySelector(".ft-artifact-title") as HTMLElement);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
			expect(onOpen).toHaveBeenCalledTimes(1);
		});

		it("plays press exactly once for the Open button — dropping fromControl() would double it", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onOpen = vi.fn();
			const { container } = render(<ArtifactCard title="Q3 memo" onOpen={onOpen} sound />);

			// The click also bubbles to the card's own handler, which must be sent
			// home by fromControl() rather than playing a second cue.
			fireEvent.click(openCue(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
			expect(onOpen).toHaveBeenCalledTimes(1);
		});

		it("plays select exactly once when stepping to the next version", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onVersionChange = vi.fn();
			const { container } = render(
				<ArtifactCard
					title="Memo"
					version={2}
					versionCount={4}
					onVersionChange={onVersionChange}
					sound
				/>,
			);

			fireEvent.click(nav(container, "Next version"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onOpen = vi.fn();
			const { container } = render(<ArtifactCard title="Q3 memo" onOpen={onOpen} />);

			fireEvent.click(openCue(container));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing from a version arrow clamped at its end, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onVersionChange = vi.fn();
			const { container } = render(
				<ArtifactCard
					title="Memo"
					version={1}
					versionCount={4}
					onVersionChange={onVersionChange}
					sound
				/>,
			);

			// The disabled arrow keeps pointer-events (see the component's own
			// note), so a synthetic dispatch bypasses jsdom's disabled handling to
			// prove the clamp inside step() itself stops the cue too.
			nav(container, "Previous version").dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true }),
			);

			expect(play).not.toHaveBeenCalled();
			expect(onVersionChange).not.toHaveBeenCalled();
		});

		it("plays nothing when a click lands on the version rail's own gaps or the actions rail", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onOpen = vi.fn();
			const { container } = render(
				<ArtifactCard
					title="Memo"
					version={1}
					versionCount={4}
					onVersionChange={vi.fn()}
					onOpen={onOpen}
					sound
					actions={
						<button type="button" className="custom-action">
							Copy
						</button>
					}
				/>,
			);

			fireEvent.click(container.querySelector(".ft-artifact-versions") as HTMLElement);
			fireEvent.click(container.querySelector(".custom-action") as HTMLElement);

			expect(play).not.toHaveBeenCalled();
			expect(onOpen).not.toHaveBeenCalled();
		});
	});
});
