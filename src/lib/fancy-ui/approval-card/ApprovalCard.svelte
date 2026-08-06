<script lang="ts" module>
	import type { Snippet } from "svelte";

	/** The three states of a human-in-the-loop gate. */
	export type ApprovalState = "pending" | "approved" | "denied";

	/**
	 * Props for ApprovalCard
	 */
	export interface ApprovalCardProps {
		/** What the agent is asking permission for, e.g. "Run database migration". */
		title: string;
		/** Secondary muted line under the title — the consequence, the blast radius. */
		description?: string;
		/** Which side of the gate we are on. Bindable, so the decision is readable from outside. */
		state?: ApprovalState;
		/** Marks the action as irreversible: red approve button and a warning tint on the card. */
		destructive?: boolean;
		/** Label for the approve button. */
		approveLabel?: string;
		/** Label for the deny button. */
		denyLabel?: string;
		/** Called when approve is pressed, after `state` has been written. */
		onApprove?: () => void;
		/** Called when deny is pressed, after `state` has been written. */
		onDeny?: () => void;
		/** The consumer is executing the decision: both buttons go disabled and the card is `aria-busy`. */
		busy?: boolean;
		/** The detail region between the header and the footer — a diff, a command preview. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** The root element */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		title,
		description,
		state = $bindable("pending"),
		destructive = false,
		approveLabel = "Approve",
		denyLabel = "Deny",
		onApprove,
		onDeny,
		busy = false,
		children,
		class: className,
		ref = $bindable(null),
	}: ApprovalCardProps = $props();

	/** Spoken and shown once the gate is behind us. */
	const RESOLVED_LABELS = {
		approved: "Approved",
		denied: "Denied",
	} as const;

	const isPending = $derived(state === "pending");
	const isApproved = $derived(state === "approved");
	const resolvedLabel = $derived(isApproved ? RESOLVED_LABELS.approved : RESOLVED_LABELS.denied);

	/**
	 * The decision is written to `state` before the callback fires, so a consumer
	 * reading the bound value from inside its own handler already sees the answer.
	 * Re-entry is refused rather than re-announced: a gate resolves once.
	 */
	function decide(next: "approved" | "denied") {
		if (busy || state !== "pending") return;
		state = next;
		if (next === "approved") onApprove?.();
		else onDeny?.();
	}
</script>

<div
	bind:this={ref}
	class={cn("ft-approval border-border bg-card/50 w-full rounded-lg border p-4 text-sm", className)}
	class:ft-destructive={destructive}
	role="group"
	aria-label={title}
	aria-busy={busy ? "true" : undefined}
	data-state={state}
>
	<div class="flex items-start gap-2.5">
		<!--
			Decorative: the title carries the ask in words. On a destructive gate the
			shield picks up an alert mark, so "this one is irreversible" is not left
			to the tint alone.
		-->
		<span class="ft-approval-icon mt-0.5 flex-none" aria-hidden="true">
			<svg
				class="size-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
				{#if destructive}
					<path d="M12 8v3.5" />
					<path d="M12 15h.01" />
				{/if}
			</svg>
		</span>

		<div class="min-w-0 flex-1">
			<p class="ft-approval-title text-foreground font-medium">{title}</p>
			{#if description}
				<p class="ft-approval-description text-muted-foreground mt-0.5 text-xs leading-relaxed">
					{description}
				</p>
			{/if}
		</div>
	</div>

	{#if children}
		<div class="ft-approval-detail mt-3 min-w-0">
			{@render children()}
		</div>
	{/if}

	<!--
		One footer element, mounted from the first render, so the live region exists
		before the decision lands in it — a region that appears at the same moment as
		its own text is routinely missed by screen readers.
	-->
	<div class="ft-approval-foot mt-3" aria-live="polite">
		{#if isPending}
			<div class="ft-approval-actions flex flex-wrap items-center justify-end gap-2">
				<button
					type="button"
					class="ft-approval-deny text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-60"
					disabled={busy}
					onclick={() => decide("denied")}
				>
					{denyLabel}
				</button>
				<button
					type="button"
					class="ft-approval-approve bg-foreground text-background hover:bg-foreground/90 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-60"
					class:ft-destructive={destructive}
					disabled={busy}
					onclick={() => decide("approved")}
				>
					{approveLabel}
				</button>
			</div>
		{:else}
			<p
				class="ft-approval-resolved flex items-center gap-1.5 text-xs font-medium"
				class:ft-approved={isApproved}
			>
				<span class="flex-none" aria-hidden="true">
					<svg
						class="size-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						{#if isApproved}
							<path d="m20 6-11 11-5-5" />
						{:else}
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						{/if}
					</svg>
				</span>
				{resolvedLabel}
			</p>
		{/if}
	</div>
</div>

<style>
	/*
	 * Every colour is read at the point of use through two hooks: this card's own
	 * `--ft-approval-*`, then the `--ft-status-*` vocabulary the whole AI family
	 * shares, then the literal. Setting either anywhere up the tree retints the
	 * card without having to win a specificity fight against these scoped rules,
	 * and the shared one recolours every sibling component at once.
	 */
	.ft-approval.ft-destructive {
		background: var(
			--ft-approval-danger-bg,
			color-mix(
				in oklab,
				var(
						--ft-approval-danger,
						var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
					)
					6%,
				transparent
			)
		);
		border-color: var(
			--ft-approval-danger-border,
			color-mix(
				in oklab,
				var(
						--ft-approval-danger,
						var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
					)
					22%,
				transparent
			)
		);
	}

	.ft-approval.ft-destructive .ft-approval-icon {
		color: var(
			--ft-approval-danger,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
	}

	/*
	 * Unlayered scoped rules beat Tailwind's layered utilities, so the destructive
	 * button overrides `bg-foreground` / `text-background` without `!important`.
	 * Its text flips with the scheme because no single ink clears 4.5:1 against a
	 * red that is dark on a light page and light on a dark one.
	 */
	.ft-approval-approve.ft-destructive {
		background: var(
			--ft-approval-danger,
			var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
		);
		color: var(--ft-approval-danger-fg, light-dark(oklch(0.985 0 0), oklch(0.16 0 0)));
	}

	.ft-approval-approve.ft-destructive:hover:not(:disabled) {
		background: color-mix(
			in oklab,
			var(
					--ft-approval-danger,
					var(--ft-status-error, light-dark(oklch(0.5 0.19 25), oklch(0.7 0.18 25)))
				)
				88%,
			transparent
		);
	}

	/* Denied stays deliberately quiet — a refusal is not a failure. */
	.ft-approval-resolved {
		color: var(--ft-approval-denied, color-mix(in oklab, currentColor 65%, transparent));
	}

	.ft-approval-resolved.ft-approved {
		color: var(
			--ft-approval-approved,
			var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)))
		);
	}

	/*
	 * The verdict's fade is the whole animation, and it lives behind the query, so
	 * reduced motion is not a degraded variant to keep in sync: the footer simply
	 * swaps, with the same colours and the same words.
	 *
	 * The footer's height is deliberately left alone. A transition needs the
	 * specified value to change, and `height: auto` never changes — only the
	 * content under it does — so an `interpolate-size` rule here would have been
	 * dead weight rather than a smooth collapse.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.ft-approval-resolved {
			animation: ft-approval-resolve-in 240ms cubic-bezier(0.4, 0, 0.2, 1);
		}
	}

	@keyframes ft-approval-resolve-in {
		from {
			opacity: 0;
			transform: translateY(-3px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
