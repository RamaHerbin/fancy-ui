import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ApprovalCard from "./ApprovalCard.svelte";
import Harness from "./ApprovalCardHarness.test.svelte";

const TITLE = "Run database migration";

function root(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-approval") as HTMLElement;
}

function approve(container: HTMLElement): HTMLButtonElement {
	return container.querySelector(".ft-approval-approve") as HTMLButtonElement;
}

function deny(container: HTMLElement): HTMLButtonElement {
	return container.querySelector(".ft-approval-deny") as HTMLButtonElement;
}

function resolved(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-approval-resolved");
}

describe("ApprovalCard", () => {
	afterEach(cleanup);

	it("names the gate and groups it under that name", () => {
		const { container } = render(ApprovalCard, { props: { title: TITLE } });

		expect(container.querySelector(".ft-approval-title")?.textContent).toBe(TITLE);
		expect(root(container).getAttribute("role")).toBe("group");
		expect(root(container).getAttribute("aria-label")).toBe(TITLE);
		expect(root(container).dataset.state).toBe("pending");
	});

	it("shows the description only when there is one", () => {
		const withDetail = render(ApprovalCard, {
			props: { title: TITLE, description: "Adds two columns to `invoices`." },
		});
		expect(withDetail.container.querySelector(".ft-approval-description")?.textContent).toContain(
			"Adds two columns"
		);

		cleanup();
		const without = render(ApprovalCard, { props: { title: TITLE } });
		expect(without.container.querySelector(".ft-approval-description")).toBeNull();
	});

	it("offers both decisions while pending, with the labels it was given", () => {
		const { container } = render(ApprovalCard, {
			props: { title: TITLE, approveLabel: "Run it", denyLabel: "Not now" },
		});

		expect(approve(container).textContent?.trim()).toBe("Run it");
		expect(deny(container).textContent?.trim()).toBe("Not now");
		expect(resolved(container)).toBeNull();
	});

	it("defaults the two labels", () => {
		const { container } = render(ApprovalCard, { props: { title: TITLE } });

		expect(approve(container).textContent?.trim()).toBe("Approve");
		expect(deny(container).textContent?.trim()).toBe("Deny");
	});

	it("fires onApprove and resolves the card", async () => {
		const onApprove = vi.fn();
		const onDeny = vi.fn();
		const { container } = render(ApprovalCard, { props: { title: TITLE, onApprove, onDeny } });

		await fireEvent.click(approve(container));

		expect(onApprove).toHaveBeenCalledTimes(1);
		expect(onDeny).not.toHaveBeenCalled();
		expect(root(container).dataset.state).toBe("approved");
	});

	it("fires onDeny and resolves the card", async () => {
		const onApprove = vi.fn();
		const onDeny = vi.fn();
		const { container } = render(ApprovalCard, { props: { title: TITLE, onApprove, onDeny } });

		await fireEvent.click(deny(container));

		expect(onDeny).toHaveBeenCalledTimes(1);
		expect(onApprove).not.toHaveBeenCalled();
		expect(root(container).dataset.state).toBe("denied");
	});

	it("writes the decision back out through the binding", async () => {
		const { container, getByTestId } = render(Harness, { props: { title: TITLE } });
		expect(getByTestId("bound-state").textContent).toBe("pending");

		await fireEvent.click(approve(container));
		expect(getByTestId("bound-state").textContent).toBe("approved");
	});

	it("writes a denial back out through the binding too", async () => {
		const { container, getByTestId } = render(Harness, { props: { title: TITLE } });

		await fireEvent.click(deny(container));
		expect(getByTestId("bound-state").textContent).toBe("denied");
	});

	it("follows a state prop driven from outside", async () => {
		const { container, rerender } = render(ApprovalCard, {
			props: { title: TITLE, state: "pending" as const },
		});
		expect(approve(container)).not.toBeNull();

		await rerender({ title: TITLE, state: "approved" as const });
		expect(approve(container)).toBeNull();
		expect(resolved(container)?.textContent?.trim()).toBe("Approved");
	});

	it("collapses to a quiet approved line, with no buttons left to press", () => {
		const { container } = render(ApprovalCard, {
			props: { title: TITLE, state: "approved" as const },
		});

		expect(resolved(container)?.textContent?.trim()).toBe("Approved");
		expect(resolved(container)?.classList.contains("ft-approved")).toBe(true);
		expect(container.querySelectorAll("button")).toHaveLength(0);
		expect(root(container).dataset.state).toBe("approved");
	});

	it("collapses to a muted denied line, with no buttons left to press", () => {
		const { container } = render(ApprovalCard, {
			props: { title: TITLE, state: "denied" as const },
		});

		expect(resolved(container)?.textContent?.trim()).toBe("Denied");
		expect(resolved(container)?.classList.contains("ft-approved")).toBe(false);
		expect(container.querySelectorAll("button")).toHaveLength(0);
	});

	it("announces the verdict through a live region that was already there", async () => {
		const { container } = render(ApprovalCard, { props: { title: TITLE } });
		const live = container.querySelector('[aria-live="polite"]') as HTMLElement;
		expect(live).not.toBeNull();

		await fireEvent.click(approve(container));

		// Same element, new contents: a region that appears alongside its own text
		// is routinely missed.
		expect(container.querySelector('[aria-live="polite"]')).toBe(live);
		expect(live.textContent).toContain("Approved");
	});

	it("disables both buttons and marks the card busy while the consumer works", () => {
		const { container } = render(ApprovalCard, { props: { title: TITLE, busy: true } });

		expect(approve(container).disabled).toBe(true);
		expect(deny(container).disabled).toBe(true);
		expect(root(container).getAttribute("aria-busy")).toBe("true");
	});

	it("says nothing about busyness when it is not busy", () => {
		const { container } = render(ApprovalCard, { props: { title: TITLE } });

		expect(root(container).getAttribute("aria-busy")).toBeNull();
		expect(approve(container).disabled).toBe(false);
	});

	it("refuses a decision that arrives while busy", async () => {
		const onApprove = vi.fn();
		const { container } = render(ApprovalCard, {
			props: { title: TITLE, busy: true, onApprove },
		});

		await fireEvent.click(approve(container));

		expect(onApprove).not.toHaveBeenCalled();
		expect(root(container).dataset.state).toBe("pending");
	});

	it("marks the approve button and the card destructive", () => {
		const { container } = render(ApprovalCard, { props: { title: TITLE, destructive: true } });

		expect(approve(container).classList.contains("ft-destructive")).toBe(true);
		expect(root(container).classList.contains("ft-destructive")).toBe(true);
		// The tint is not the only signal: the shield picks up an alert mark.
		expect(container.querySelectorAll(".ft-approval-icon path")).toHaveLength(3);
	});

	it("leaves both unmarked when the action is ordinary", () => {
		const { container } = render(ApprovalCard, { props: { title: TITLE } });

		expect(approve(container).classList.contains("ft-destructive")).toBe(false);
		expect(root(container).classList.contains("ft-destructive")).toBe(false);
		expect(container.querySelectorAll(".ft-approval-icon path")).toHaveLength(1);
	});

	it("renders the detail region it is handed", () => {
		const { container } = render(ApprovalCard, {
			props: {
				title: TITLE,
				children: createRawSnippet(() => ({
					render: () => `<pre class="preview">pnpm db:migrate --prod</pre>`,
				})),
			},
		});

		const detail = container.querySelector(".ft-approval-detail") as HTMLElement;
		expect(detail.querySelector(".preview")?.textContent).toBe("pnpm db:migrate --prod");
	});

	it("leaves out the detail region when there is nothing to put in it", () => {
		const { container } = render(ApprovalCard, { props: { title: TITLE } });

		expect(container.querySelector(".ft-approval-detail")).toBeNull();
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(ApprovalCard, { props: { title: TITLE, class: "my-gate" } });

		expect(root(container).className).toContain("my-gate");
		expect(root(container).className).toContain("ft-approval");
	});
});
