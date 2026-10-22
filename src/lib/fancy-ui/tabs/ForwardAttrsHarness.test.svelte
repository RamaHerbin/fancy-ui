<!-- Test-only rig: a trigger carrying a consumer attribute bag inside a real Tabs root. -->
<script lang="ts">
	import Tabs from "./Tabs.svelte";
	import TabsList from "./TabsList.svelte";
	import TabsTrigger from "./TabsTrigger.svelte";
	import TabsContent from "./TabsContent.svelte";

	interface Props {
		attrs?: Record<string, unknown>;
		disabled?: boolean;
		standalone?: boolean;
	}

	let { attrs = {}, disabled = false, standalone = false }: Props = $props();
</script>

{#if standalone}
	<TabsTrigger value="a" {...attrs}>Alpha</TabsTrigger>
{:else}
	<Tabs value="a">
		<TabsList>
			<TabsTrigger value="a" {disabled} {...attrs}>Alpha</TabsTrigger>
			<TabsTrigger value="b">Beta</TabsTrigger>
		</TabsList>
		<TabsContent value="a">Panel A</TabsContent>
		<TabsContent value="b">Panel B</TabsContent>
	</Tabs>
{/if}
