<!--
	The detail page's tune panel: a slide-over with the demo's knobs. Modal
	while open (backdrop, `inert` when closed, Escape), focus moves to the close
	button on open and back to the trigger on close. Same dialog skeleton as
	the gallery panel it replaces, redrawn on the site tokens.
-->
<script lang="ts">
	import type { ControlDef, PlaygroundValues } from "$lib/inspiration/types.js";

	interface Props {
		title: string;
		knobs: ControlDef[];
		values: PlaygroundValues;
		open: boolean;
		/** Where focus goes back on close (the Tune button). */
		returnTo?: HTMLElement | null;
		onchange: (key: string, value: string | number | boolean) => void;
		onreset: () => void;
		onclose: () => void;
	}

	let { title, knobs, values, open, returnTo = null, onchange, onreset, onclose }: Props = $props();

	const uid = $props.id();
	let closeButton = $state<HTMLButtonElement | null>(null);
	let wasOpen = false;

	$effect(() => {
		if (open) {
			wasOpen = true;
			closeButton?.focus();
		} else if (wasOpen) {
			wasOpen = false;
			returnTo?.focus();
		}
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (open && event.key === "Escape") onclose();
	}}
/>

{#if open}
	<button type="button" class="backdrop" onclick={onclose} aria-label="Close tune panel"></button>
{/if}

<div
	role="dialog"
	aria-modal={open}
	aria-labelledby="tp-{uid}"
	inert={!open}
	class="tp"
	data-open={open || undefined}
>
	<div class="head">
		<h2 id="tp-{uid}">Tune <span class="sr-only">{title}</span></h2>
		<span class="spacer"></span>
		<button type="button" class="ghost" onclick={onreset}>Reset</button>
		<button
			type="button"
			bind:this={closeButton}
			class="ghost icon"
			onclick={onclose}
			aria-label="Close"
		>
			<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
				<path
					d="m3 3 6 6M9 3 3 9"
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linecap="round"
				/>
			</svg>
		</button>
	</div>

	<div class="body">
		{#each knobs as def (def.key)}
			{@const id = `tp-${uid}-${def.key}`}
			<div class="field">
				{#if def.type === "range" || def.type === "number"}
					<div class="row">
						<label class="label" for={id}>{def.label}</label>
						<span class="value fx-mono">{values[def.key]}</span>
					</div>
					<input
						{id}
						type={def.type}
						min={def.min}
						max={def.max}
						step={def.step ?? 1}
						value={values[def.key] as number}
						oninput={(event) => onchange(def.key, Number(event.currentTarget.value))}
						class={def.type === "range" ? "range" : "input"}
					/>
				{:else if def.type === "color"}
					<div class="row">
						<label class="label" for={id}>{def.label}</label>
						<span class="value fx-mono">{values[def.key]}</span>
					</div>
					<input
						{id}
						type="color"
						value={values[def.key] as string}
						oninput={(event) => onchange(def.key, event.currentTarget.value)}
						class="input color"
					/>
				{:else if def.type === "text"}
					<label class="label" for={id}>{def.label}</label>
					<input
						{id}
						type="text"
						value={values[def.key] as string}
						oninput={(event) => onchange(def.key, event.currentTarget.value)}
						class="input"
					/>
				{:else if def.type === "boolean"}
					<div class="row">
						<span class="label" id="{id}-label">{def.label}</span>
						<button
							{id}
							type="button"
							role="switch"
							aria-checked={values[def.key] as boolean}
							aria-labelledby="{id}-label"
							onclick={() => onchange(def.key, !values[def.key])}
							class="switch"
						>
							<span class="thumb"></span>
						</button>
					</div>
				{:else if def.type === "select"}
					<label class="label" for={id}>{def.label}</label>
					<select
						{id}
						value={values[def.key] as string}
						onchange={(event) => onchange(def.key, event.currentTarget.value)}
						class="input"
					>
						{#each def.options as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				{/if}
			</div>
		{/each}
	</div>

	<p class="foot fx-mono">Esc to close</p>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgb(0 0 0 / 0.5);
	}

	.tp {
		position: fixed;
		top: 0;
		right: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		width: 320px;
		max-width: 100%;
		height: 100%;
		background: var(--fx-panel-solid, #111116);
		box-shadow: inset 1px 0 0 var(--fx-hairline);
		color: var(--fx-ink);
		transform: translateX(100%);
		visibility: hidden;
		transition:
			transform 280ms var(--fx-ease),
			visibility 0s linear 280ms;
	}

	.tp[data-open] {
		transform: none;
		visibility: visible;
		transition: transform 280ms var(--fx-ease);
	}

	.head {
		display: flex;
		align-items: center;
		gap: 4px;
		height: 56px;
		padding: 0 10px 0 20px;
		box-shadow: inset 0 -1px 0 var(--fx-hairline);
	}

	h2 {
		font-size: 15px;
		font-weight: 600;
	}

	.spacer {
		flex: 1;
	}

	.ghost {
		height: 32px;
		padding: 0 10px;
		border-radius: 8px;
		font-size: 13px;
		color: var(--fx-ink-2);
		cursor: pointer;
	}

	.ghost:hover {
		color: var(--fx-ink);
		background: rgb(255 255 255 / 0.05);
	}

	.icon {
		display: grid;
		place-items: center;
		width: 32px;
		padding: 0;
	}

	.body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 20px;
		overflow-y: auto;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.label {
		font-size: 13px;
		color: var(--fx-ink-2);
	}

	.value {
		font-size: 11.5px;
		color: var(--fx-ink-3);
		font-variant-numeric: tabular-nums;
	}

	.input {
		width: 100%;
		height: 36px;
		padding: 0 10px;
		border-radius: 8px;
		font-size: 13px;
		color: var(--fx-ink);
		background: var(--fx-field, rgba(11, 11, 14, 0.6));
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
	}

	.color {
		padding: 4px;
		cursor: pointer;
	}

	.range {
		width: 100%;
		accent-color: var(--fx-ink);
	}

	.switch {
		position: relative;
		width: 38px;
		height: 22px;
		border-radius: 999px;
		background: var(--fx-field, rgba(11, 11, 14, 0.6));
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
		cursor: pointer;
		transition: background-color 150ms ease;
	}

	.switch[aria-checked="true"] {
		background: var(--fx-ink);
	}

	.thumb {
		position: absolute;
		top: 4px;
		left: 4px;
		width: 14px;
		height: 14px;
		border-radius: 999px;
		background: var(--fx-ink);
		transition: transform 150ms ease;
	}

	.switch[aria-checked="true"] .thumb {
		background: var(--fx-canvas);
		transform: translateX(16px);
	}

	.foot {
		padding: 14px 20px;
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
		box-shadow: inset 0 1px 0 var(--fx-hairline);
	}

	@media (pointer: coarse) {
		.ghost {
			min-height: 40px;
		}
		.icon {
			min-width: 40px;
		}
	}
</style>
