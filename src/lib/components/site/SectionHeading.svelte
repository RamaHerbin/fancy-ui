<!--
	SectionHeading — the 44 px strip that opens a section: mono index, title,
	and an optional trailing link ("01 — PREVIEWS ······ View all →").
-->
<script lang="ts">
	interface Props {
		/** Two-digit index, e.g. "01". */
		index: string;
		title: string;
		/** Heading id, for `aria-labelledby` on the section. */
		id?: string;
		level?: 2 | 3;
		href?: string;
		linkLabel?: string;
		class?: string;
	}

	let {
		index,
		title,
		id,
		level = 2,
		href,
		linkLabel = "View all",
		class: className = "",
	}: Props = $props();
</script>

<div class="shd {className}">
	<svelte:element this={`h${level}`} {id} class="fx-mono title">
		<span class="index">{index}</span> — {title}
	</svelte:element>
	{#if href}
		<a {href} class="link">{linkLabel} <span aria-hidden="true">→</span></a>
	{/if}
</div>

<style>
	.shd {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		height: 44px;
		box-shadow: inset 0 -1px 0 var(--fx-hairline, rgba(242, 241, 236, 0.1));
	}

	.title {
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--fx-ink-2, #a8a7a1);
	}

	.index {
		color: var(--fx-ink, #f2f1ec);
	}

	.link {
		font-size: 13px;
		color: var(--fx-ink-2, #a8a7a1);
		transition: color 180ms var(--fx-ease, ease);
	}

	.link:hover {
		color: var(--fx-ink, #f2f1ec);
	}
</style>
