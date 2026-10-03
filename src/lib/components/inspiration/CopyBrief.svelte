<!--
	"Copy brief": puts the reference's brief (see brief.ts) on the clipboard.
	When the clipboard refuses (permissions, insecure context), the brief is
	shown in a read-only field, selected, so it can be copied by hand.
-->
<script lang="ts">
	import { tick } from "svelte";
	import { createCopy } from "$lib/fancy-ui/_internals/clipboard.svelte.js";

	interface Props {
		/** Built lazily: the brief follows the framework chosen at click time. */
		getBrief: () => string;
		class?: string;
	}

	let { getBrief, class: className = "" }: Props = $props();

	const clip = createCopy();
	$effect(() => () => clip.destroy());

	let fallback = $state<string | null>(null);
	let field: HTMLTextAreaElement | undefined = $state();

	async function copy() {
		const text = getBrief();
		const ok = await clip.copy(text);
		if (ok) {
			fallback = null;
			return;
		}
		fallback = text;
		await tick();
		field?.focus();
		field?.select();
	}
</script>

<button type="button" class="cb {className}" onclick={copy}>
	<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
		<path
			d="M4 1.75h5.5L12.5 4.75v9.5h-8.5z M9.25 1.75v3.25h3.25 M6.25 8h4 M6.25 10.75h4"
			fill="none"
			stroke="currentColor"
			stroke-width="1.3"
			stroke-linejoin="round"
		/>
	</svg>
	<span aria-live="polite">{clip.copied ? "Copied" : "Copy brief"}</span>
</button>

{#if fallback !== null}
	<div class="fallback">
		<label for="brief-fallback" class="hint">Select and copy manually</label>
		<textarea id="brief-fallback" bind:this={field} readonly rows="8" value={fallback}></textarea>
	</div>
{/if}

<style>
	.cb {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 14px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 500;
		color: var(--fx-ink);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
		cursor: pointer;
		transition: box-shadow 180ms var(--fx-ease);
	}

	.cb:hover {
		box-shadow: inset 0 0 0 1px rgb(242 241 236 / 0.32);
	}

	.fallback {
		flex-basis: 100%;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.hint {
		font-size: 12.5px;
		color: var(--fx-ink-2);
	}

	textarea {
		width: 100%;
		padding: 10px 12px;
		border-radius: 9px;
		font-family: var(--fx-font-mono);
		font-size: 12px;
		line-height: 1.55;
		color: var(--fx-ink);
		background: rgb(255 255 255 / 0.025);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
		resize: vertical;
	}
</style>
