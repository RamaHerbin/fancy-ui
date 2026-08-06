import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ArtifactCard from "./ArtifactCard.svelte";

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
		const { container } = render(ArtifactCard, { props: { title: "Q3 revenue memo" } });

		expect(container.querySelector(".ft-artifact-title")?.textContent).toBe("Q3 revenue memo");
		expect(container.querySelector(".ft-artifact-kind")?.textContent).toBe("Document");
	});

	it("renders the kind it is given", () => {
		const { container } = render(ArtifactCard, {
			props: { title: "migrate.sql", kind: "SQL migration" },
		});

		expect(container.querySelector(".ft-artifact-kind")?.textContent).toBe("SQL migration");
	});

	it("names the status out loud, since the sweep and the tint are silent", async () => {
		const { container, rerender } = render(ArtifactCard, {
			props: { title: "Draft", status: "streaming" as const },
		});

		expect(container.querySelector(".sr-only")?.textContent).toBe("Writing");

		await rerender({ status: "done" });
		expect(container.querySelector(".sr-only")?.textContent).toBe("Ready");
	});

	it("shows a bare version badge when there is no count", () => {
		const { container } = render(ArtifactCard, { props: { title: "Memo", version: 3 } });

		expect(container.querySelector(".ft-artifact-version")?.textContent).toBe("v3");
		expect(nav(container, "Previous version")).toBeNull();
	});

	it("shows the count without a navigator when nobody is listening for a change", () => {
		const { container } = render(ArtifactCard, {
			props: { title: "Memo", version: 3, versionCount: 5 },
		});

		expect(container.querySelector(".ft-artifact-version")?.textContent).toBe("v3/5");
		expect(nav(container, "Next version")).toBeNull();
	});

	it("turns the badge into a navigator once a change handler exists", () => {
		const { container } = render(ArtifactCard, {
			props: { title: "Memo", version: 3, versionCount: 5, onVersionChange: vi.fn() },
		});

		expect(container.querySelector(".ft-artifact-version")?.textContent).toBe("v3/5");
		expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe(
			"Document versions"
		);
	});

	it("asks for the neighbouring version by 1-based number", async () => {
		const onVersionChange = vi.fn();
		const { container } = render(ArtifactCard, {
			props: { title: "Memo", version: 3, versionCount: 5, onVersionChange },
		});

		await fireEvent.click(nav(container, "Previous version"));
		expect(onVersionChange).toHaveBeenLastCalledWith(2);

		await fireEvent.click(nav(container, "Next version"));
		expect(onVersionChange).toHaveBeenLastCalledWith(4);
		expect(onVersionChange).toHaveBeenCalledTimes(2);
	});

	it("disables the arrow that would run off the end", async () => {
		const onVersionChange = vi.fn();
		const { container, rerender } = render(ArtifactCard, {
			props: { title: "Memo", version: 1, versionCount: 5, onVersionChange },
		});

		expect(nav(container, "Previous version").disabled).toBe(true);
		expect(nav(container, "Next version").disabled).toBe(false);

		await rerender({ version: 5 });
		expect(nav(container, "Previous version").disabled).toBe(false);
		expect(nav(container, "Next version").disabled).toBe(true);

		// Nothing escapes past a bound even if the click lands anyway.
		await fireEvent.click(nav(container, "Next version"));
		expect(onVersionChange).not.toHaveBeenCalled();
	});

	it("streams the preview, tinting only what just arrived", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(ArtifactCard, {
			props: { title: "Memo", status: "streaming" as const, preview: "The quarter" },
		});

		expect(container.querySelector(".ft-artifact-preview")?.textContent).toContain("The quarter");
		expect(container.querySelector(".ft-fresh")).toBeFalsy();

		await rerender({ preview: "The quarter closed" });
		expect(container.querySelector(".ft-fresh")?.textContent).toBe(" closed");
		expect(container.querySelector(".ft-artifact-preview")?.textContent).toContain(
			"The quarter closed"
		);
	});

	it("trails a cursor only while the document is being written", async () => {
		const { container, rerender } = render(ArtifactCard, {
			props: { title: "Memo", status: "streaming" as const, preview: "Half a" },
		});

		expect(container.querySelector(".ft-streaming-cursor")).toBeTruthy();

		await rerender({ status: "done" });
		expect(container.querySelector(".ft-streaming-cursor")).toBeFalsy();
	});

	it("omits the preview region when nothing has been written yet", () => {
		const { container } = render(ArtifactCard, {
			props: { title: "Memo", status: "idle" as const },
		});

		expect(container.querySelector(".ft-artifact-preview")).toBeNull();
	});

	it("runs the top sweep only while streaming", async () => {
		const { container, rerender } = render(ArtifactCard, {
			props: { title: "Memo", status: "streaming" as const },
		});

		expect(container.querySelector(".ft-artifact-sweep")).toBeTruthy();

		await rerender({ status: "done" });
		expect(container.querySelector(".ft-artifact-sweep")).toBeNull();
	});

	it("stays inert until an open handler arrives", () => {
		const { container } = render(ArtifactCard, { props: { title: "Memo" } });

		expect(root(container).getAttribute("role")).toBeNull();
		expect(root(container).getAttribute("tabindex")).toBeNull();
		expect(container.querySelector(".ft-artifact-open")).toBeNull();
	});

	it("grows a real Open button, named after the document, rather than an ARIA card", async () => {
		const onOpen = vi.fn();
		const { container } = render(ArtifactCard, { props: { title: "Q3 memo", onOpen } });

		// The root stays a plain region: an ARIA button would make its children
		// presentational and erase the navigator, the actions rail and the status.
		expect(root(container).getAttribute("role")).toBeNull();
		expect(root(container).getAttribute("tabindex")).toBeNull();
		expect(root(container).getAttribute("aria-label")).toBeNull();

		const openButton = openCue(container);
		expect(openButton.tagName).toBe("BUTTON");
		expect(openButton.getAttribute("aria-label")).toBe("Open Q3 memo");
		expect(openButton.textContent).toContain("Open");

		await fireEvent.click(openButton);
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it("keeps the card-wide click as a pointer shortcut, and only a pointer one", async () => {
		const onOpen = vi.fn();
		const { container } = render(ArtifactCard, { props: { title: "Q3 memo", onOpen } });

		await fireEvent.click(container.querySelector(".ft-artifact-title") as HTMLElement);
		expect(onOpen).toHaveBeenCalledTimes(1);

		// Keys on the root do nothing — the button one element over is the keyboard path.
		await fireEvent.keyDown(root(container), { key: "Enter" });
		await fireEvent.keyDown(root(container), { key: " " });
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it("keeps the status label and the version navigator out of any ARIA button", () => {
		const { container } = render(ArtifactCard, {
			props: {
				title: "Memo",
				status: "streaming" as const,
				version: 2,
				versionCount: 4,
				onVersionChange: vi.fn(),
				onOpen: vi.fn(),
			},
		});

		expect(root(container).getAttribute("role")).toBeNull();
		expect(container.querySelector(".sr-only")?.textContent).toBe("Writing");
		expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe(
			"Document versions"
		);
	});

	it("lets the version arrows do their own job without opening the document", async () => {
		const onOpen = vi.fn();
		const onVersionChange = vi.fn();
		const { container } = render(ArtifactCard, {
			props: { title: "Memo", version: 2, versionCount: 4, onVersionChange, onOpen },
		});

		await fireEvent.click(nav(container, "Next version"));
		expect(onVersionChange).toHaveBeenCalledWith(3);
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("does not open the document from the navigator's own gaps", async () => {
		const onOpen = vi.fn();
		const { container } = render(ArtifactCard, {
			props: { title: "Memo", version: 1, versionCount: 4, onVersionChange: vi.fn(), onOpen },
		});

		// A disabled arrow retargets its click at whatever is underneath, and the
		// space between the arrows belongs to the navigator either way.
		await fireEvent.click(container.querySelector(".ft-artifact-versions") as HTMLElement);
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("renders the actions rail, and its buttons do not open the card", async () => {
		const onOpen = vi.fn();
		const { container } = render(ArtifactCard, {
			props: {
				title: "Memo",
				onOpen,
				actions: createRawSnippet(() => ({
					render: () => `<button type="button" class="custom-action">Copy</button>`,
				})),
			},
		});

		const action = container.querySelector(".custom-action") as HTMLButtonElement;
		expect(action).not.toBeNull();
		expect(container.querySelector(".ft-artifact-actions")?.contains(action)).toBe(true);

		await fireEvent.click(action);
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("grows a tinted footer when the document failed, and drops it when it did not", async () => {
		const { container, rerender } = render(ArtifactCard, {
			props: { title: "Memo", status: "error" as const },
		});

		expect(container.querySelector(".ft-artifact-error")?.textContent).toBe(
			"This document could not be generated."
		);
		expect(root(container).dataset.status).toBe("error");

		await rerender({ status: "done" });
		expect(container.querySelector(".ft-artifact-error")).toBeNull();
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(ArtifactCard, {
			props: { title: "Memo", class: "my-card" },
		});

		expect(root(container).className).toContain("ft-artifact");
		expect(root(container).className).toContain("my-card");
	});
});
