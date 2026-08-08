<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface StepProps {
		/**
		 * The step's primary label. Required: with `children` also omitted, a
		 * clickable step's only accessible text is its `sr-only` status span —
		 * every upcoming step in the same `Stepper` would then read as the
		 * identical "not started, button" with nothing to tell them apart.
		 */
		label: string;
		/** Optional secondary line shown under the label. */
		description?: string;
		/** Overrides the bullet's default content (checkmark / number / outline). */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLLIElement | null;
	}
</script>

<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { STEPPER_KEY, type StepperContext } from "./types.js";

	let {
		label,
		description,
		children,
		class: className,
		ref = $bindable(null),
	}: StepProps = $props();

	// Undefined outside a Stepper: the step then has no shared index or
	// status to derive, and renders as a plain, always-"upcoming",
	// never-clickable item rather than throwing.
	const stepper = getContext<StepperContext | undefined>(STEPPER_KEY);

	// `$props.id()` rather than `_internals/id.ts`'s `uid()`: this needs to
	// be stable and available immediately, including during SSR, and
	// `uid()` is client-only by design (see its own doc comment).
	const id = $props.id();

	// Registers on mount, unregisters on destroy — see Stepper.svelte's
	// `register` for why the whole thing has to happen through `untrack`.
	$effect(() => {
		if (!stepper) return;
		return stepper.register(id);
	});

	const index = $derived(stepper ? stepper.indexOf(id) : -1);

	type StepStatus = "done" | "current" | "upcoming";
	const status = $derived.by((): StepStatus => {
		if (!stepper || index === -1) return "upcoming";
		if (index < stepper.current) return "done";
		if (index === stepper.current) return "current";
		return "upcoming";
	});

	const orientation = $derived(stepper?.orientation ?? "horizontal");
	const clickable = $derived(stepper?.clickable ?? false);
	const isFirst = $derived(index === 0);
	const isLast = $derived(stepper ? index === stepper.count - 1 : true);

	// The segment connecting this step back to the previous one is "done"
	// exactly when that previous step is done — i.e. this step's own index
	// is at or before the active one.
	const connectorDone = $derived(stepper ? index <= stepper.current : false);

	function handleClick() {
		if (!stepper || !clickable || index === -1) return;
		stepper.select(index);
	}

	const STATUS_TEXT: Record<StepStatus, string> = {
		done: "completed",
		current: "current step",
		upcoming: "not started",
	};

	const bulletClasses = $derived(
		cn(
			"ft-step-bullet relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
			status === "done" && "ft-step-bullet-done",
			status === "current" && "ft-step-bullet-current",
			status === "upcoming" && "border-border text-muted-foreground border-[1.5px] bg-transparent"
		)
	);
</script>

{#snippet bulletContent()}
	<span class={bulletClasses} data-status={status}>
		{#if children}
			{@render children()}
		{:else if status === "done"}
			<svg
				class="size-3.5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M20 6 9 17l-5-5" />
			</svg>
		{:else}
			<span aria-hidden="true">{index + 1}</span>
		{/if}
		<span class="sr-only"> {STATUS_TEXT[status]}</span>
	</span>
{/snippet}

{#snippet textContent()}
	<span
		class="flex flex-col"
		class:items-center={orientation === "horizontal"}
		class:text-center={orientation === "horizontal"}
	>
		{#if label}
			<span
				class={cn(
					"text-xs",
					status === "current" ? "text-foreground font-medium" : "text-muted-foreground"
				)}
			>
				{label}
			</span>
		{/if}
		{#if description}
			<span class="text-muted-foreground text-xs">{description}</span>
		{/if}
	</span>
{/snippet}

<li
	bind:this={ref}
	class={cn(
		"ft-step flex",
		orientation === "vertical"
			? cn("flex-row items-stretch gap-3", isLast ? "pb-0" : "pb-6")
			: cn("flex-col items-center", isFirst ? "flex-none" : "flex-1"),
		className
	)}
	data-status={status}
	data-orientation={orientation}
	aria-current={status === "current" ? "step" : undefined}
>
	{#if orientation === "horizontal"}
		<div class="flex w-full items-center">
			{#if !isFirst}
				<span
					class={cn(
						"ft-step-connector mt-[13px] h-0.5 flex-1",
						connectorDone ? "ft-step-connector-done" : "bg-border"
					)}
					aria-hidden="true"
				></span>
			{/if}
			{#if clickable}
				<button
					type="button"
					class="ft-step-trigger flex shrink-0 cursor-pointer flex-col items-center gap-1.5 px-1 focus-visible:outline-none"
					onclick={handleClick}
				>
					{@render bulletContent()}
					{@render textContent()}
				</button>
			{:else}
				<div class="ft-step-trigger flex shrink-0 flex-col items-center gap-1.5 px-1">
					{@render bulletContent()}
					{@render textContent()}
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex flex-col items-center self-stretch">
			{@render bulletContent()}
			{#if !isLast}
				<span
					class={cn(
						"ft-step-connector my-1 w-0.5 flex-1",
						connectorDone ? "ft-step-connector-done" : "bg-border"
					)}
					aria-hidden="true"
				></span>
			{/if}
		</div>
		{#if clickable}
			<button
				type="button"
				class="ft-step-trigger flex cursor-pointer flex-col gap-0.5 pt-0.5 text-left focus-visible:outline-none"
				onclick={handleClick}
			>
				{@render textContent()}
			</button>
		{:else}
			<div class="ft-step-trigger flex flex-col gap-0.5 pt-0.5 text-left">
				{@render textContent()}
			</div>
		{/if}
	{/if}
</li>

<style>
	/*
	 * The only place this component reaches for the brand purple — the
	 * current bullet's fill/halo and a done segment's connector. No
	 * semantic token owns it, so it's declared locally with a light-dark()
	 * fallback, retintable from higher up the tree via `--ft-accent`.
	 * Mirrors ToggleGroupItem's identical `--ft-toggle-group-accent`
	 * pattern. Never redeclare `--ft-accent` itself: that would shadow
	 * whatever an ancestor set, the exact bug an earlier wave shipped in
	 * `Link`.
	 */
	.ft-step {
		--ft-nav-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}

	.ft-step-bullet-done {
		background: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)));
		color: light-dark(oklch(1 0 0), oklch(0.15 0 0));
	}

	.ft-step-bullet-current {
		background: var(--ft-nav-accent);
		color: light-dark(oklch(1 0 0), oklch(0.15 0 0));
		box-shadow: 0 0 0 4px color-mix(in oklab, var(--ft-nav-accent) 20%, transparent);
	}

	.ft-step-connector-done {
		background: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)));
	}

	.ft-step-trigger:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-nav-accent) 35%, transparent);
		border-radius: 0.375rem;
	}
</style>
