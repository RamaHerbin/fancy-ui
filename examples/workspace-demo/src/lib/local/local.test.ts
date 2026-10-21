import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import Avatar from "./Avatar.svelte";
import Badge from "./Badge.svelte";
import Card from "./Card.svelte";
import EmptyState from "./EmptyState.svelte";
import ErrorState from "./ErrorState.svelte";

afterEach(cleanup);

const text = (value: string) => createRawSnippet(() => ({ render: () => `<span>${value}</span>` }));

describe("Avatar", () => {
	it("is a named image when given a name", () => {
		render(Avatar, { initials: "MO", name: "Maya Okafor" });
		const avatar = screen.getByRole("img", { name: "Maya Okafor" });
		expect(avatar).toHaveTextContent("MO");
	});

	it("is decorative without a name, so a neighbouring name is not read twice", () => {
		const { container } = render(Avatar, { initials: "MO" });
		expect(screen.queryByRole("img")).toBeNull();
		expect(container.querySelector("[aria-hidden='true']")).toHaveTextContent("MO");
	});

	it("keeps at most two letters", () => {
		render(Avatar, { initials: "abc", name: "x" });
		expect(screen.getByRole("img")).toHaveTextContent("AB");
	});

	it("exposes its size", () => {
		render(Avatar, { initials: "MO", name: "x", size: "lg" });
		expect(screen.getByRole("img")).toHaveAttribute("data-size", "lg");
	});
});

describe("Badge", () => {
	it("renders its content with the neutral tone by default", () => {
		render(Badge, { children: text("3 unread") });
		const badge = screen.getByText("3 unread").parentElement!;
		expect(badge).toHaveAttribute("data-tone", "neutral");
	});

	it.each(["success", "warning", "danger", "info"] as const)("accepts the %s tone", (tone) => {
		render(Badge, { tone, children: text("x") });
		expect(screen.getByText("x").parentElement).toHaveAttribute("data-tone", tone);
	});
});

describe("Card", () => {
	it("is a region named by its heading", () => {
		render(Card, { title: "About", children: text("body") });
		const region = screen.getByRole("region", { name: "About" });
		expect(region).toHaveTextContent("body");
		expect(screen.getByRole("heading", { name: "About", level: 2 })).toBeInTheDocument();
	});

	it("honours the heading level and shows the description", () => {
		render(Card, { title: "T", description: "Because", headingLevel: 3 });
		expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
		expect(screen.getByText("Because")).toBeInTheDocument();
	});

	it("renders an actions slot beside the heading", () => {
		render(Card, { title: "T", actions: text("act") });
		expect(screen.getByText("act")).toBeInTheDocument();
	});
});

describe("EmptyState", () => {
	it("says what is missing and offers the one action that fixes it", () => {
		render(EmptyState, { title: "No keys yet", description: "Create one.", children: text("go") });
		expect(screen.getByRole("heading", { name: "No keys yet" })).toBeInTheDocument();
		expect(screen.getByText("Create one.")).toBeInTheDocument();
		expect(screen.getByText("go")).toBeInTheDocument();
	});

	it("is not an alert: nothing went wrong", () => {
		render(EmptyState, { title: "t" });
		expect(screen.queryByRole("alert")).toBeNull();
	});
});

describe("ErrorState", () => {
	it("announces the failure as an alert", () => {
		render(ErrorState, { title: "Nope", description: "Service down", onretry: () => {} });
		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent("Nope");
		expect(alert).toHaveTextContent("Service down");
	});

	it("calls onretry from a button named by retryLabel", async () => {
		const onretry = vi.fn();
		render(ErrorState, { title: "Nope", retryLabel: "Again", onretry });
		await fireEvent.click(screen.getByRole("button", { name: "Again" }));
		expect(onretry).toHaveBeenCalledTimes(1);
	});

	it("shows no retry button when the failure is not retryable", () => {
		render(ErrorState, { title: "Gone", retryable: false, onretry: () => {} });
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("disables retry while a retry is running", () => {
		render(ErrorState, { title: "x", retryLabel: "Again", retrying: true, onretry: () => {} });
		expect(screen.getByRole("button", { name: "Again" })).toHaveAttribute("aria-busy", "true");
	});
});
