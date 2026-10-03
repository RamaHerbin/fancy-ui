<!--
	One line of code with a copy button: install commands, import lines,
	links. Long lines scroll inside the field instead of widening the page.
-->
<script lang="ts">
	import { createCopy } from "$lib/fancy-ui/_internals/clipboard.svelte.js";

	interface Props {
		text: string;
		/** Short mono caption before the code ("$", "import"). */
		prefix?: string;
		/** What is being copied, for the button's accessible name. */
		label: string;
	}

	let { text, prefix, label }: Props = $props();

	const clip = createCopy();
	$effect(() => () => clip.destroy());
</script>

<div class="cl">
	{#if prefix}<span class="prefix fx-mono" aria-hidden="true">{prefix}</span>{/if}
	<code class="fx-mono">{text}</code>
	<button type="button" class="copy" aria-label="Copy {label}" onclick={() => clip.copy(text)}>
		{#if clip.copied}
			<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
				<path
					d="m3.5 8.5 3 3 6-7"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		{:else}
			<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
				<rect
					x="5.5"
					y="5.5"
					width="8"
					height="8"
					rx="1.5"
					fill="none"
					stroke="currentColor"
					stroke-width="1.3"
				/>
				<path
					d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5"
					fill="none"
					stroke="currentColor"
					stroke-width="1.3"
				/>
			</svg>
		{/if}
	</button>
	<span class="sr-only" aria-live="polite">{clip.copied ? "Copied" : ""}</span>
</div>

<style>
	.cl {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		height: 38px;
		padding: 0 4px 0 12px;
		border-radius: 9px;
		background: rgb(255 255 255 / 0.025);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
	}

	.prefix {
		flex: none;
		font-size: 12px;
		color: var(--fx-ink-3);
	}

	code {
		flex: 1;
		min-width: 0;
		overflow-x: auto;
		white-space: nowrap;
		font-size: 12.5px;
		color: var(--fx-ink);
		scrollbar-width: none;
	}

	code::-webkit-scrollbar {
		display: none;
	}

	.copy {
		flex: none;
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 7px;
		color: var(--fx-ink-3);
		cursor: pointer;
		transition:
			color 180ms var(--fx-ease),
			background-color 180ms var(--fx-ease);
	}

	.copy:hover {
		color: var(--fx-ink);
		background: rgb(255 255 255 / 0.06);
	}

	@media (pointer: coarse) {
		.cl {
			height: 48px;
		}
		.copy {
			width: 40px;
			height: 40px;
		}
	}
</style>
