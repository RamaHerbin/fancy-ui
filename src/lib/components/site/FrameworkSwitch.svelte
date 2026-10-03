<!--
	FrameworkSwitch — React / Svelte / Vue as a radio group bound to the
	framework store, so every install line and import on the site follows one
	choice. Roving tabindex: Tab enters on the checked option, arrow keys move
	and select (wrapping), Home/End jump to the ends.

	The store hydrates from localStorage at import; the checked state is read
	after mount so the hydrated markup matches the server's (Svelte, the
	default).
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { createFrameworkState } from "$lib/stores/framework.svelte.js";
	import { FRAMEWORK_LABELS, type Framework } from "$lib/inspiration/types.js";

	interface Props {
		size?: "sm" | "md";
		/** Accessible name of the group. */
		label?: string;
		class?: string;
	}

	let { size = "md", label = "Framework", class: className = "" }: Props = $props();

	const ORDER: Framework[] = ["react", "svelte", "vue"];

	const store = createFrameworkState();
	let mounted = $state(false);
	onMount(() => (mounted = true));
	const current = $derived<Framework>(mounted ? store.framework : "svelte");

	let buttons: HTMLButtonElement[] = $state([]);

	function onKeydown(event: KeyboardEvent, index: number) {
		let next = index;
		if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % ORDER.length;
		else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
			next = (index - 1 + ORDER.length) % ORDER.length;
		else if (event.key === "Home") next = 0;
		else if (event.key === "End") next = ORDER.length - 1;
		else return;
		event.preventDefault();
		store.set(ORDER[next]);
		buttons[next]?.focus();
	}
</script>

<div class="fs fx-mono {className}" data-size={size} role="radiogroup" aria-label={label}>
	{#each ORDER as fw, i (fw)}
		<button
			bind:this={buttons[i]}
			type="button"
			role="radio"
			aria-checked={current === fw}
			tabindex={current === fw ? 0 : -1}
			onclick={() => store.set(fw)}
			onkeydown={(e) => onKeydown(e, i)}>{FRAMEWORK_LABELS[fw]}</button
		>
	{/each}
</div>

<style>
	.fs {
		display: inline-flex;
		gap: 8px;
	}

	button {
		position: relative;
		height: 28px;
		padding: 0 12px;
		border-radius: 8px;
		font-size: 11px;
		letter-spacing: 0.08em;
		color: var(--fx-ink-3, #8f8e89);
		box-shadow: inset 0 0 0 1px var(--fx-hairline, rgba(242, 241, 236, 0.1));
		cursor: pointer;
		transition:
			color 180ms var(--fx-ease, ease),
			background-color 180ms var(--fx-ease, ease);
	}

	.fs[data-size="sm"] {
		gap: 6px;
	}

	.fs[data-size="sm"] button {
		height: 24px;
		padding: 0 9px;
		border-radius: 6px;
		font-size: 10.5px;
	}

	button:hover {
		color: var(--fx-ink-2, #a8a7a1);
	}

	button[aria-checked="true"] {
		color: var(--fx-ink, #f2f1ec);
		background: var(--fx-card-raised, #15151a);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong, rgba(242, 241, 236, 0.18));
	}

	/* Touch: hit areas of at least 40 px tall (sm 24 px, md 28 px visually);
	   the extension is vertical, so neighbours never overlap. */
	@media (pointer: coarse) {
		button::before {
			content: "";
			position: absolute;
			inset: -8px 0;
		}
		.fs[data-size="md"] button::before {
			inset: -6px 0;
		}
	}

	button:focus-visible {
		outline: 1px solid var(--fx-ink, #f2f1ec);
		outline-offset: 2px;
	}
</style>
