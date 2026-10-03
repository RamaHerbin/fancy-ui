<!--
	SearchGlow — the working search field of the hero glass, with a rim light
	that wakes on focus.

	A native input rather than the library's SearchInput: SearchInput is a
	rounded pill on the shadcn tokens with no rest-props, and this field needs a
	52 px / radius 14 smoked body, a `name` that a plain GET form submits, and a
	positioned wrapper for the rim. Without JS the form submits to
	/inspiration?q=…; with JS the same URL is reached through `goto`.
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import RimLight from "./RimLight.svelte";

	interface Props {
		value?: string;
		placeholder?: string;
		autofocus?: boolean;
		seed?: number;
		/**
		 * Ask the gallery to read the sentence as filters (`ask=1`): it turns
		 * "a button that glows on hover" into Hover · Glow · Button when the
		 * interpreter is configured, and searches the words otherwise.
		 */
		interpret?: boolean;
		class?: string;
	}

	let {
		value = $bindable(""),
		placeholder = "Describe an interaction…",
		autofocus = false,
		seed = 0,
		interpret = false,
		class: className = "",
	}: Props = $props();

	const uid = $props.id();
	let input: HTMLInputElement | undefined = $state();
	let focused = $state(false);

	onMount(() => {
		if (autofocus) input?.focus();
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const q = value.trim();
		if (!q) return void goto("/inspiration");
		goto(`/inspiration?q=${encodeURIComponent(q)}${interpret ? "&ask=1" : ""}`);
	}
</script>

<form
	role="search"
	action="/inspiration"
	method="get"
	class="sg {className}"
	onsubmit={submit}
	onfocusin={() => (focused = true)}
	onfocusout={(e) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focused = false;
	}}
>
	<label for="sg-{uid}" class="sr-only">Search inspiration</label>
	{#if interpret}<input type="hidden" name="ask" value="1" />{/if}
	<svg class="sg-icon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
		<circle cx="9" cy="9" r="5.75" fill="none" stroke="currentColor" stroke-width="1.5" />
		<path d="m13.5 13.5 3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
	</svg>
	<input
		bind:this={input}
		bind:value
		id="sg-{uid}"
		name="q"
		type="search"
		autocomplete="off"
		enterkeyhint="search"
		{placeholder}
	/>
	<button type="submit" class="sg-submit" aria-label="Search">
		<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
			<path
				d="M3 8h9m-3.5-3.5L12 8l-3.5 3.5"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>
	<RimLight tier="search" {seed} active={focused} />
</form>

<style>
	.sg {
		position: relative;
		/* A stacking context, so the rim's z-index:-1 halo stays with the field
		   instead of sinking under the page canvas. */
		isolation: isolate;
		display: flex;
		align-items: center;
		height: 52px;
		border-radius: 14px;
		background: var(--fx-field, rgba(11, 11, 14, 0.6));
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong, rgba(242, 241, 236, 0.18));
		color: var(--fx-ink-3, #8f8e89);
	}

	.sg-icon {
		flex: none;
		margin-left: 18px;
	}

	input {
		flex: 1;
		min-width: 0;
		height: 100%;
		padding: 0 12px;
		border: 0;
		background: transparent;
		color: var(--fx-ink, #f2f1ec);
		font: inherit;
		font-size: 15px;
		/* The field's ring is drawn by the form (focus-within), so the whole
		   52 px shape carries it, not the bare input. */
		outline: none;
	}

	input:focus-visible {
		outline: none;
	}

	input::placeholder {
		color: var(--fx-ink-3, #8f8e89);
	}

	input::-webkit-search-cancel-button {
		appearance: none;
	}

	.sg:has(input:focus-visible) {
		outline: 1px solid var(--fx-ink, #f2f1ec);
		outline-offset: 2px;
	}

	.sg-submit {
		position: relative;
		z-index: 1;
		flex: none;
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		margin-right: 10px;
		border-radius: 9px;
		color: var(--fx-ink-2, #a8a7a1);
		background: rgb(255 255 255 / 0.04);
		box-shadow: inset 0 0 0 1px var(--fx-hairline, rgba(242, 241, 236, 0.1));
		cursor: pointer;
		transition:
			color 180ms var(--fx-ease, ease),
			background-color 180ms var(--fx-ease, ease);
	}

	.sg-submit:hover {
		color: var(--fx-ink, #f2f1ec);
		background: rgb(255 255 255 / 0.08);
	}
</style>
