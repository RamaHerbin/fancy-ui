<!--
	PortName — the React or Vue name of a Svelte prop, snippet or event, shown
	next to the Svelte name in the API tables. Renders nothing for Svelte or
	when the name is the same; a name the rules cannot derive shows a marker
	pointing at the written list of differences.
-->
<script lang="ts">
	import { t } from "$lib/stores";
	import { FRAMEWORK_LABELS, type Framework } from "$lib/inspiration/types.js";

	interface Props {
		framework: Framework;
		/** The Svelte name, to skip the arrow when nothing changes. */
		name: string;
		/** The derived name, or null when the rules cannot say. */
		port: string | null;
	}

	let { framework, name, port }: Props = $props();

	const label = $derived(t("table.portName").replace("{framework}", FRAMEWORK_LABELS[framework]));
</script>

{#if framework !== "svelte" && port !== name}
	<span class="text-muted-foreground mx-1" aria-hidden="true">→</span>
	<span class="sr-only">{label}:</span>
	{#if port === null}
		<span
			class="text-muted-foreground font-mono text-xs"
			title={t("table.portNameUnknown")}
			data-port-name-unknown>?<span class="sr-only">{t("table.portNameUnknown")}</span></span
		>
	{:else}
		<code
			class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs font-medium text-sky-600 dark:text-sky-400"
			title={label}
			data-port-name={framework}>{port}</code
		>
	{/if}
{/if}
