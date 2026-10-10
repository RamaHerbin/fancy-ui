<!--
	A result set with nothing in it: say so plainly and offer the way back.
	The content is passed in, so the gallery can repeat its active filters and
	the saved page can link to the gallery.
-->
<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		title: string;
		body?: string;
		children?: Snippet;
	}

	let { title, body, children }: Props = $props();
</script>

<div class="es" role="status">
	<p class="title">{title}</p>
	{#if body}<p class="body">{body}</p>{/if}
	{#if children}<div class="actions">{@render children()}</div>{/if}
</div>

<style>
	.es {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 72px 24px;
		border-radius: 16px;
		text-align: center;
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
	}

	.title {
		font-size: 17px;
		font-weight: 600;
		color: var(--fx-ink);
	}

	.body {
		max-width: 420px;
		font-size: 14px;
		line-height: 1.5;
		color: var(--fx-ink-2);
	}

	.actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		margin-top: 10px;
	}
</style>
