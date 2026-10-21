import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FollowButton } from "./FollowButton.js";
import { sound } from "../../sound/sound.js";

const button = (c: HTMLElement) => c.querySelector("button") as HTMLButtonElement;
const live = (c: HTMLElement) => c.querySelector(".ft-follow__live") as HTMLElement;
const text = (c: HTMLElement) => c.querySelector(".ft-follow__rest")?.textContent;
const preview = (c: HTMLElement) => c.querySelector(".ft-follow__preview") as HTMLElement | null;
const morph = (c: HTMLElement) => c.querySelector(".ft-statusmorph") as HTMLElement | null;
const region = () => document.querySelector('[role="status"]') as HTMLElement | null;
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
const flush = () => advance(0);
const click = (el: Element) => act(async () => void fireEvent.click(el));

function deferred() {
	let resolve!: () => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe("FollowButton", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	describe("semantics", () => {
		it("renders a button with aria-pressed and a stable accessible name", () => {
			const { container } = render(<FollowButton label="Follow Rama" />);
			const el = button(container);
			expect(el.tagName).toBe("BUTTON");
			expect(el.type).toBe("button");
			expect(el.getAttribute("aria-pressed")).toBe("false");
			expect(el.getAttribute("aria-label")).toBe("Follow Rama");
			expect(el.hasAttribute("aria-busy")).toBe(false);
			expect(el.getAttribute("data-state")).toBe("idle");
			expect(text(container)).toBe("Follow");
		});

		it("falls back to the idle label as the accessible name", () => {
			const { container } = render(<FollowButton labels={{ follow: "Subscribe" }} />);
			expect(button(container).getAttribute("aria-label")).toBe("Subscribe");
			expect(text(container)).toBe("Subscribe");
		});

		it("keeps the accessible name when the visible label changes", async () => {
			const { container } = render(<FollowButton label="Follow Rama" />);
			await click(button(container));
			await flush();
			expect(text(container)).toBe("Following");
			expect(button(container).getAttribute("aria-label")).toBe("Follow Rama");
		});

		it("starts pressed when following, with the unfollow preview text beside it", () => {
			const { container } = render(<FollowButton following />);
			expect(button(container).getAttribute("aria-pressed")).toBe("true");
			expect(text(container)).toBe("Following");
			expect(preview(container)?.textContent).toBe("Unfollow");
			expect(preview(container)?.getAttribute("aria-hidden")).toBe("true");
		});

		it("starts pressed from defaultFollowing", () => {
			const { container } = render(<FollowButton defaultFollowing />);
			expect(button(container).getAttribute("aria-pressed")).toBe("true");
		});

		it("renders no preview while not following", () => {
			const { container } = render(<FollowButton />);
			expect(preview(container)).toBeNull();
		});

		it("drops the visible text but keeps the name when iconOnly", () => {
			const { container } = render(<FollowButton iconOnly label="Follow Rama" />);
			expect(button(container).getAttribute("aria-label")).toBe("Follow Rama");
			expect(container.querySelector(".ft-follow__label")).toBeNull();
			expect(button(container).textContent?.trim()).toBe("");
		});

		it("forwards the ref to the button", () => {
			const ref = createRef<HTMLButtonElement>();
			const { container } = render(<FollowButton ref={ref} />);
			expect(ref.current).toBe(button(container));
		});
	});

	describe("synchronous toggle", () => {
		it("commits at once when onToggle returns nothing", async () => {
			const onToggle = vi.fn();
			const onFollowingChange = vi.fn();
			const { container } = render(
				<FollowButton onToggle={onToggle} onFollowingChange={onFollowingChange} />
			);
			await click(button(container));
			expect(onToggle).toHaveBeenCalledWith(true);
			expect(onFollowingChange).toHaveBeenCalledTimes(1);
			expect(onFollowingChange).toHaveBeenCalledWith(true);
			expect(button(container).getAttribute("aria-pressed")).toBe("true");
			expect(button(container).hasAttribute("aria-busy")).toBe(false);
			expect(button(container).getAttribute("data-state")).toBe("idle");
		});

		it("toggles back off and reports false", async () => {
			const onToggle = vi.fn();
			const onFollowingChange = vi.fn();
			const { container } = render(
				<FollowButton following onToggle={onToggle} onFollowingChange={onFollowingChange} />
			);
			await click(button(container));
			expect(onToggle).toHaveBeenCalledWith(false);
			expect(onFollowingChange).toHaveBeenCalledWith(false);
			// A `following` prop the parent leaves alone is the parent's to keep:
			// the port re-syncs on a prop CHANGE only, like Toggle and Slider.
			expect(button(container).getAttribute("aria-pressed")).toBe("false");
		});

		it("works with no callbacks at all", async () => {
			const { container } = render(<FollowButton />);
			await click(button(container));
			expect(button(container).getAttribute("aria-pressed")).toBe("true");
		});

		it("treats a synchronous throw as a rejection", async () => {
			const onFollowingChange = vi.fn();
			const onToggle = vi.fn(() => {
				throw new Error("nope");
			});
			const { container } = render(
				<FollowButton onToggle={onToggle} onFollowingChange={onFollowingChange} />
			);
			await click(button(container));
			await flush();
			expect(onFollowingChange).not.toHaveBeenCalled();
			expect(button(container).getAttribute("aria-pressed")).toBe("false");
			expect(button(container).getAttribute("data-state")).toBe("error");
		});
	});

	describe("async toggle", () => {
		it("shows pending, keeps focus, ignores clicks, then commits on resolve", async () => {
			const d = deferred();
			const onToggle = vi.fn(() => d.promise);
			const onFollowingChange = vi.fn();
			const onClick = vi.fn();
			const { container } = render(
				<FollowButton
					label="Follow Rama"
					onToggle={onToggle}
					onFollowingChange={onFollowingChange}
					onClick={onClick}
				/>
			);
			const el = button(container);
			el.focus();
			await click(el);
			await flush();

			expect(el.getAttribute("data-state")).toBe("pending");
			expect(el.getAttribute("aria-busy")).toBe("true");
			expect(el.getAttribute("aria-pressed")).toBe("true");
			expect(el.disabled).toBe(false);
			expect(document.activeElement).toBe(el);
			expect(morph(container)?.getAttribute("data-state")).toBe("loading");
			expect(onFollowingChange).not.toHaveBeenCalled();

			await click(el);
			await click(el);
			expect(onToggle).toHaveBeenCalledTimes(1);
			expect(onClick).toHaveBeenCalledTimes(1);

			d.resolve();
			await flush();
			expect(el.getAttribute("data-state")).toBe("idle");
			expect(el.hasAttribute("aria-busy")).toBe(false);
			expect(el.getAttribute("aria-pressed")).toBe("true");
			expect(onFollowingChange).toHaveBeenCalledTimes(1);
			expect(onFollowingChange).toHaveBeenCalledWith(true);
			expect(document.activeElement).toBe(el);
		});

		it("rolls back on reject, announces assertively, then returns to idle", async () => {
			const d = deferred();
			const onToggle = vi.fn(() => d.promise);
			const onFollowingChange = vi.fn();
			const { container } = render(
				<FollowButton
					label="Follow Rama"
					onToggle={onToggle}
					onFollowingChange={onFollowingChange}
					resetMs={1500}
				/>
			);
			await click(button(container));
			await flush();
			d.reject(new Error("server"));
			await flush();

			const el = button(container);
			expect(el.getAttribute("aria-pressed")).toBe("false");
			expect(el.getAttribute("data-state")).toBe("error");
			expect(el.hasAttribute("aria-busy")).toBe(false);
			expect(text(container)).toBe("Try again");
			expect(onFollowingChange).not.toHaveBeenCalled();
			expect(region()?.textContent).toBe("Follow Rama: Try again");
			expect(region()?.getAttribute("aria-live")).toBe("assertive");

			await advance(1400);
			expect(el.getAttribute("data-state")).toBe("error");
			await advance(200);
			expect(el.getAttribute("data-state")).toBe("idle");
			expect(text(container)).toBe("Follow");
		});

		it("uses errorLabel for the visible text and the announcement", async () => {
			const onToggle = vi.fn(() => Promise.reject(new Error("x")));
			const { container } = render(
				<FollowButton label="Follow Rama" errorLabel="Offline" onToggle={onToggle} />
			);
			await click(button(container));
			await flush();
			expect(text(container)).toBe("Offline");
			expect(region()?.textContent).toBe("Follow Rama: Offline");
		});

		it("retries on the next click after a failure", async () => {
			const onToggle = vi
				.fn<(next: boolean) => Promise<void>>()
				.mockRejectedValueOnce(new Error("x"))
				.mockResolvedValueOnce(undefined);
			const onFollowingChange = vi.fn();
			const { container } = render(
				<FollowButton onToggle={onToggle} onFollowingChange={onFollowingChange} />
			);
			await click(button(container));
			await flush();
			expect(button(container).getAttribute("data-state")).toBe("error");
			await click(button(container));
			await flush();
			expect(onToggle).toHaveBeenCalledTimes(2);
			expect(onToggle).toHaveBeenLastCalledWith(true);
			expect(button(container).getAttribute("aria-pressed")).toBe("true");
			expect(button(container).getAttribute("data-state")).toBe("idle");
			expect(onFollowingChange).toHaveBeenCalledTimes(1);
			await advance(5000);
			expect(button(container).getAttribute("data-state")).toBe("idle");
		});

		it("lets the parent win when it sets `following` while pending", async () => {
			const d = deferred();
			const onToggle = vi.fn(() => d.promise);
			const onFollowingChange = vi.fn();
			const { container, rerender } = render(
				<FollowButton onToggle={onToggle} onFollowingChange={onFollowingChange} />
			);
			await click(button(container));
			await flush();
			expect(button(container).getAttribute("data-state")).toBe("pending");

			rerender(
				<FollowButton following onToggle={onToggle} onFollowingChange={onFollowingChange} />
			);
			await flush();
			expect(button(container).getAttribute("data-state")).toBe("idle");
			expect(button(container).getAttribute("aria-pressed")).toBe("true");

			d.reject(new Error("late"));
			await flush();
			expect(button(container).getAttribute("data-state")).toBe("idle");
			expect(button(container).getAttribute("aria-pressed")).toBe("true");
			expect(onFollowingChange).not.toHaveBeenCalled();
		});

		it("follows a controlled parent through the whole cycle", async () => {
			const d = deferred();
			const onToggle = vi.fn(() => d.promise);
			const { container, rerender } = render(
				<FollowButton following={false} onToggle={onToggle} onFollowingChange={() => {}} />
			);
			await click(button(container));
			d.resolve();
			await flush();
			rerender(<FollowButton following onToggle={onToggle} onFollowingChange={() => {}} />);
			expect(button(container).getAttribute("aria-pressed")).toBe("true");
			rerender(<FollowButton following={false} onToggle={onToggle} onFollowingChange={() => {}} />);
			expect(button(container).getAttribute("aria-pressed")).toBe("false");
		});

		it("makes no callback and no state write once unmounted", async () => {
			const d = deferred();
			const onToggle = vi.fn(() => d.promise);
			const onFollowingChange = vi.fn();
			const { container, unmount } = render(
				<FollowButton onToggle={onToggle} onFollowingChange={onFollowingChange} />
			);
			await click(button(container));
			await flush();
			unmount();
			d.resolve();
			await flush();
			expect(onFollowingChange).not.toHaveBeenCalled();
		});

		it("does not leave a timer behind after unmount in the error state", async () => {
			const onToggle = vi.fn(() => Promise.reject(new Error("x")));
			const { container, unmount } = render(<FollowButton onToggle={onToggle} />);
			await click(button(container));
			await flush();
			unmount();
			expect(vi.getTimerCount()).toBe(0);
		});
	});

	describe("guards", () => {
		it("does nothing while disabled", async () => {
			const onToggle = vi.fn();
			const onClick = vi.fn();
			const { container } = render(<FollowButton disabled onToggle={onToggle} onClick={onClick} />);
			await click(button(container));
			expect(onToggle).not.toHaveBeenCalled();
			expect(onClick).not.toHaveBeenCalled();
			expect(button(container).getAttribute("aria-pressed")).toBe("false");
		});

		it("calls the consumer click once, after the toggle started", async () => {
			const order: string[] = [];
			const onToggle = vi.fn(() => {
				order.push("toggle");
			});
			const onClick = vi.fn(() => {
				order.push("click");
			});
			const { container } = render(<FollowButton onToggle={onToggle} onClick={onClick} />);
			await click(button(container));
			expect(order).toEqual(["toggle", "click"]);
		});

		it("stays type=button inside a form", async () => {
			const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
			const { container } = render(
				<form onSubmit={onSubmit}>
					<FollowButton {...({ type: "submit" } as Record<string, unknown>)} />
				</form>
			);
			await click(button(container));
			expect(onSubmit).not.toHaveBeenCalled();
		});
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;
		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		it("plays toggle-on after a committed follow, toggle-off after an unfollow", async () => {
			const { container } = render(<FollowButton sound />);
			await click(button(container));
			await flush();
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenLastCalledWith("toggle-on");
			await click(button(container));
			await flush();
			expect(play).toHaveBeenLastCalledWith("toggle-off");
		});

		it("plays the error cue on a rejection and nothing else", async () => {
			const onToggle = vi.fn(() => Promise.reject(new Error("x")));
			const { container } = render(<FollowButton sound onToggle={onToggle} />);
			await click(button(container));
			await flush();
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("error");
		});

		it("is silent by default and does not leak `sound` to the inner Button", async () => {
			const { container } = render(<FollowButton />);
			await click(button(container));
			await flush();
			expect(play).not.toHaveBeenCalled();
			cleanup();
			const again = render(<FollowButton sound />);
			await click(button(again.container));
			await flush();
			expect(play).not.toHaveBeenCalledWith("press");
		});
	});
});
