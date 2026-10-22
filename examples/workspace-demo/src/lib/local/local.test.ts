import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import Card from "./Card.svelte";
import EmptyState from "./EmptyState.svelte";
import ErrorState from "./ErrorState.svelte";

afterEach(cleanup);

const text = (value: string) => createRawSnippet(() => ({ render: () => `<span>${value}</span>` }));

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
