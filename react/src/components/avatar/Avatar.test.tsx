import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Avatar } from "./Avatar.js";
import { AVATAR_TONES } from "./avatar-core.js";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

function image(container: HTMLElement): HTMLImageElement | null {
	return container.querySelector("img");
}

function skeleton(container: HTMLElement): HTMLElement | null {
	return container.querySelector("[data-slot='skeleton']");
}

function toneOf(el: HTMLElement): string | undefined {
	return AVATAR_TONES.find((tone) => tone.split(" ").every((c) => el.classList.contains(c)));
}

describe("Avatar initials fallback", () => {
	it("shows the initials of a name and is a named image", () => {
		const { container } = render(<Avatar name="Maya Okafor" />);
		const el = screen.getByRole("img", { name: "Maya Okafor" });
		expect(el).toBe(root(container));
		expect(el).toHaveTextContent("MO");
		expect(el).toHaveAttribute("data-status", "fallback");
	});

	it.each([
		["Maya Okafor", "MO"],
		["Cher", "C"],
		["jean luc picard", "JP"],
		["  ada   lovelace ", "AL"],
	])("derives %s -> %s", (name, initials) => {
		render(<Avatar name={name} />);
		expect(screen.getByRole("img")).toHaveTextContent(new RegExp(`^${initials}$`));
	});

	it("draws a silhouette instead of text when the name has no letter", () => {
		const { container } = render(<Avatar name="•••" alt="Unknown user" />);
		expect(screen.getByRole("img", { name: "Unknown user" })).toHaveTextContent("");
		expect(container.querySelector("svg")).not.toBeNull();
	});

	it("draws a silhouette when there is neither a name nor an image", () => {
		const { container } = render(<Avatar />);
		expect(container.querySelector("svg")).not.toBeNull();
		expect(root(container)).toHaveAttribute("data-status", "fallback");
	});
});

describe("Avatar colour from the name", () => {
	it("gives the same name the same tone on every render", () => {
		const first = render(<Avatar name="Maya Okafor" />);
		const a = toneOf(root(first.container));
		first.unmount();
		const second = render(<Avatar name="  maya OKAFOR " />);
		const b = toneOf(root(second.container));
		expect(a).toBeDefined();
		expect(b).toBe(a);
	});

	it("spreads different names over several tones", () => {
		const tones = new Set<string | undefined>();
		for (const name of [
			"Maya Okafor",
			"Lena Fischer",
			"Tomás Rivera",
			"Aiko Tanaka",
			"Sam Patel",
		]) {
			const { container, unmount } = render(<Avatar name={name} />);
			tones.add(toneOf(root(container)));
			unmount();
		}
		expect(tones.has(undefined)).toBe(false);
		expect(tones.size).toBeGreaterThanOrEqual(3);
	});

	it("stays neutral with no name", () => {
		const { container } = render(<Avatar />);
		expect(toneOf(root(container))).toBeUndefined();
		expect(root(container)).toHaveClass("bg-muted", "text-muted-foreground");
	});
});

describe("Avatar image states", () => {
	it("renders a decorative image inside a root named by alt, with a skeleton until it loads", () => {
		const { container } = render(<Avatar src="/me.png" alt="Maya Okafor" />);
		const el = screen.getByRole("img", { name: "Maya Okafor" });
		expect(el).toBe(root(container));
		expect(el).toHaveAttribute("data-status", "loading");
		const img = image(container)!;
		expect(img).toHaveAttribute("src", "/me.png");
		expect(img).toHaveAttribute("alt", "");
		expect(img).toHaveClass("opacity-0");
		expect(skeleton(container)).not.toBeNull();
		expect(skeleton(container)).toHaveAttribute("aria-hidden", "true");
	});

	it("reveals the image and drops the skeleton on load", () => {
		const { container } = render(<Avatar src="/me.png" alt="Maya Okafor" />);
		fireEvent.load(image(container)!);
		expect(root(container)).toHaveAttribute("data-status", "loaded");
		expect(image(container)).toHaveClass("opacity-100");
		expect(skeleton(container)).toBeNull();
	});

	it("falls back to the initials when the image errors, and removes the image", () => {
		const { container } = render(
			<Avatar src="/missing.png" alt="Maya Okafor" name="Maya Okafor" />
		);
		fireEvent.error(image(container)!);
		expect(root(container)).toHaveAttribute("data-status", "fallback");
		expect(image(container)).toBeNull();
		expect(skeleton(container)).toBeNull();
		expect(root(container)).toHaveTextContent("MO");
		expect(screen.getByRole("img", { name: "Maya Okafor" })).toBeInTheDocument();
	});

	it("falls back to the silhouette on error when there is no name", () => {
		const { container } = render(<Avatar src="/missing.png" alt="A user" />);
		fireEvent.error(image(container)!);
		expect(container.querySelector("svg")).not.toBeNull();
		expect(root(container)).toHaveAttribute("data-status", "fallback");
	});

	it("starts loading again when src changes after an error", () => {
		const { container, rerender } = render(
			<Avatar src="/missing.png" alt="x" name="Maya Okafor" />
		);
		fireEvent.error(image(container)!);
		expect(image(container)).toBeNull();
		rerender(<Avatar src="/other.png" alt="x" name="Maya Okafor" />);
		expect(root(container)).toHaveAttribute("data-status", "loading");
		expect(image(container)).toHaveAttribute("src", "/other.png");
		expect(skeleton(container)).not.toBeNull();
	});

	it("shows the skeleton again for a new src after a load", () => {
		const { container, rerender } = render(<Avatar src="/a.png" alt="x" />);
		fireEvent.load(image(container)!);
		rerender(<Avatar src="/b.png" alt="x" />);
		expect(root(container)).toHaveAttribute("data-status", "loading");
		expect(skeleton(container)).not.toBeNull();
	});

	it("goes to the fallback when src is removed", () => {
		const { container, rerender } = render(<Avatar src="/a.png" alt="x" name="Maya Okafor" />);
		fireEvent.load(image(container)!);
		rerender(<Avatar alt="x" name="Maya Okafor" />);
		expect(root(container)).toHaveAttribute("data-status", "fallback");
		expect(image(container)).toBeNull();
	});

	it("picks up an image that finished loading before the component mounted", () => {
		vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
		vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(96);
		const { container } = render(<Avatar src="/cached.png" alt="x" />);
		expect(root(container)).toHaveAttribute("data-status", "loaded");
		expect(skeleton(container)).toBeNull();
	});

	it("picks up an image that had already failed before the component mounted", () => {
		vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
		vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0);
		const { container } = render(<Avatar src="/broken.png" alt="x" name="Maya Okafor" />);
		expect(root(container)).toHaveAttribute("data-status", "fallback");
		expect(root(container)).toHaveTextContent("MO");
	});

	it("gates the pulse behind motion-safe so reduced motion shows a still skeleton", () => {
		const { container } = render(<Avatar src="/me.png" alt="x" />);
		const bone = skeleton(container)!;
		expect(bone).toHaveClass("motion-safe:animate-pulse");
		expect(bone).not.toHaveClass("animate-pulse");
	});
});

describe("Avatar alt rules", () => {
	it("names the image by alt, which wins over name", () => {
		render(<Avatar src="/me.png" alt="Profile photo" name="Maya Okafor" />);
		expect(screen.getByRole("img", { name: "Profile photo" })).toBeInTheDocument();
	});

	it("falls back to name when alt is not given", () => {
		render(<Avatar src="/me.png" name="Maya Okafor" />);
		expect(screen.getByRole("img", { name: "Maya Okafor" })).toBeInTheDocument();
	});

	it('is decorative when alt="", even with a name and an image', () => {
		const { container } = render(<Avatar src="/me.png" alt="" name="Maya Okafor" />);
		expect(screen.queryByRole("img")).toBeNull();
		expect(root(container)).toHaveAttribute("aria-hidden", "true");
		expect(root(container)).not.toHaveAttribute("role");
		expect(root(container)).not.toHaveAttribute("aria-label");
	});

	it("is decorative when it has nothing to be named by", () => {
		const { container } = render(<Avatar src="/me.png" />);
		expect(root(container)).toHaveAttribute("aria-hidden", "true");
		expect(screen.queryByRole("img")).toBeNull();
	});

	it("never exposes the initials or the skeleton to assistive technology", () => {
		const { container } = render(<Avatar name="Maya Okafor" />);
		const initials = container.querySelector("[data-slot='initials']")!;
		expect(initials).toHaveAttribute("aria-hidden", "true");
	});
});

describe("Avatar size and shape", () => {
	it("defaults to a medium circle", () => {
		const { container } = render(<Avatar name="Maya" />);
		expect(root(container)).toHaveAttribute("data-size", "md");
		expect(root(container)).toHaveAttribute("data-shape", "circle");
		expect(root(container)).toHaveClass("size-9", "rounded-full");
	});

	it.each([
		["sm", "size-7"],
		["md", "size-9"],
		["lg", "size-16"],
	] as const)("renders the %s size", (size, cls) => {
		const { container } = render(<Avatar name="Maya" size={size} />);
		expect(root(container)).toHaveAttribute("data-size", size);
		expect(root(container)).toHaveClass(cls);
	});

	it("rounds a square avatar by corner instead of fully", () => {
		const { container } = render(<Avatar name="Maya" shape="square" />);
		expect(root(container)).toHaveAttribute("data-shape", "square");
		expect(root(container)).toHaveClass("rounded-lg");
		expect(root(container)).not.toHaveClass("rounded-full");
	});

	it("merges a caller class over the base classes", () => {
		const { container } = render(<Avatar name="Maya" className="size-12 ring-2" />);
		expect(root(container)).toHaveClass("size-12", "ring-2");
		expect(root(container)).not.toHaveClass("size-9");
	});
});
