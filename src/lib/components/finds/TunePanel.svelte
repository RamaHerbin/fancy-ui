<!--
	The page-level tune panel: one slide-over that drives whichever card was
	last tuned. The dialog skeleton (backdrop, inert, Escape, focus in and
	back out) mirrors PropsPlayground; the controls are redrawn on the 13a
	tokens rather than shared, because the two panels serve different pages.
-->
<script lang="ts">
	import type { LiveFind, PlaygroundValues } from "$lib/finds/types.js";

	interface Props {
		find: LiveFind | null;
		values: PlaygroundValues;
		open: boolean;
		/** The element to hand focus back to on close (the card's tune button). */
		returnTo?: HTMLElement | null;
		onchange: (key: string, value: string | number | boolean) => void;
		onreset: () => void;
		onclose: () => void;
	}

	let { find, values, open, returnTo = null, onchange, onreset, onclose }: Props = $props();

	let closeButton = $state<HTMLButtonElement | null>(null);

	$effect(() => {
		if (open) closeButton?.focus();
		else returnTo?.focus();
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (open && event.key === "Escape") onclose();
	}}
/>

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-black/50"
		onclick={onclose}
		aria-label="Close tune panel"
	></button>
{/if}

<div
	role="dialog"
	aria-modal={open}
	aria-label="Tune {find?.title ?? 'find'}"
	inert={!open}
	class="finds-tune lp-line fixed top-0 right-0 z-50 flex h-full w-[320px] max-w-full flex-col border-l transition-transform duration-300 {open
		? 'translate-x-0'
		: 'translate-x-full'}"
>
	<div class="lp-panel-head">
		<span class="flex min-w-0 items-center px-4" style="color:var(--lp-grey-1)"
			><span class="truncate">TUNE — {find?.title.toUpperCase() ?? ""}</span></span
		>
		<span class="flex-1"></span>
		<button type="button" class="lp-link lp-line border-l px-3" onclick={onreset}>RESET</button>
		<button
			type="button"
			bind:this={closeButton}
			class="lp-link lp-line border-l px-3"
			onclick={onclose}
			aria-label="Close">✕</button
		>
	</div>

	<div class="flex-1 space-y-5 overflow-y-auto px-4 py-5">
		{#if find}
			{#each find.knobs ?? [] as def (def.key)}
				{@const id = `tune-${find.id}-${def.key}`}
				<div class="flex flex-col gap-2">
					{#if def.type === "range" || def.type === "number"}
						<div class="finds-tune-row">
							<label class="lp-mono finds-tune-label" for={id}>{def.label.toUpperCase()}</label>
							<span class="lp-mono finds-tune-value">{values[def.key]}</span>
						</div>
						<input
							{id}
							type={def.type === "range" ? "range" : "number"}
							min={def.min}
							max={def.max}
							step={def.step ?? 1}
							value={values[def.key] as number}
							oninput={(event) => onchange(def.key, Number(event.currentTarget.value))}
							class={def.type === "range" ? "finds-range w-full" : "finds-field"}
						/>
					{:else if def.type === "color"}
						<div class="finds-tune-row">
							<label class="lp-mono finds-tune-label" for={id}>{def.label.toUpperCase()}</label>
							<span class="lp-mono finds-tune-value">{values[def.key]}</span>
						</div>
						<input
							{id}
							type="color"
							value={values[def.key] as string}
							oninput={(event) => onchange(def.key, event.currentTarget.value)}
							class="finds-field h-9 cursor-pointer p-1"
						/>
					{:else if def.type === "text"}
						<label class="lp-mono finds-tune-label" for={id}>{def.label.toUpperCase()}</label>
						<input
							{id}
							type="text"
							value={values[def.key] as string}
							oninput={(event) => onchange(def.key, event.currentTarget.value)}
							class="finds-field"
						/>
					{:else if def.type === "boolean"}
						<div class="finds-tune-row">
							<label class="lp-mono finds-tune-label" for={id}>{def.label.toUpperCase()}</label>
							<button
								{id}
								type="button"
								role="switch"
								aria-checked={values[def.key] as boolean}
								aria-label={def.label}
								onclick={() => onchange(def.key, !values[def.key])}
								class="finds-switch"
							>
								<span class="finds-switch-thumb"></span>
							</button>
						</div>
					{:else if def.type === "select"}
						<label class="lp-mono finds-tune-label" for={id}>{def.label.toUpperCase()}</label>
						<select
							{id}
							value={values[def.key] as string}
							onchange={(event) => onchange(def.key, event.currentTarget.value)}
							class="finds-field"
						>
							{#each def.options as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	<div class="lp-panel-foot">
		<span>KNOBS — {find?.knobs?.length ?? 0}</span>
		<span>ESC TO CLOSE</span>
	</div>
</div>

<style>
	.finds-tune {
		background: var(--lp-bg);
		color: var(--lp-ink);
		font-family: var(--lp-font-sans);
	}

	.finds-tune-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.finds-tune-label {
		font-size: 10.5px;
		letter-spacing: 0.12em;
		color: var(--lp-grey-2);
	}

	.finds-tune-value {
		font-size: 11px;
		color: var(--lp-grey-3);
		font-variant-numeric: tabular-nums;
	}

	.finds-field {
		width: 100%;
		height: 34px;
		padding: 0 10px;
		border: 1px solid var(--lp-line-strong);
		border-radius: 2px;
		background: var(--lp-panel);
		color: var(--lp-ink);
		font-size: 13px;
	}

	.finds-field:focus-visible {
		outline: none;
		border-color: var(--lp-accent);
	}

	.finds-range {
		accent-color: var(--lp-accent);
	}

	.finds-switch {
		position: relative;
		width: 38px;
		height: 22px;
		border: 1px solid var(--lp-line-strong);
		border-radius: 999px;
		background: var(--lp-panel);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.finds-switch[aria-checked="true"] {
		background: var(--lp-accent);
		border-color: var(--lp-accent);
	}

	.finds-switch-thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 14px;
		height: 14px;
		border-radius: 999px;
		background: var(--lp-ink);
		transition: transform 0.15s ease;
	}

	.finds-switch[aria-checked="true"] .finds-switch-thumb {
		background: var(--lp-bg);
		transform: translateX(16px);
	}
</style>
