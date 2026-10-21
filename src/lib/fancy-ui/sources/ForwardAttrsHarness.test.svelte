<!-- Test-only rig: the sources trigger carrying a consumer attribute bag inside a real root. -->
<script lang="ts">
	import Sources from "./Sources.svelte";
	import SourcesTrigger from "./SourcesTrigger.svelte";
	import SourcesList from "./SourcesList.svelte";

	let { attrs = {} }: { attrs?: Record<string, unknown> } = $props();

	const sources = [
		{ id: "1", title: "One", url: "https://one.example/a" },
		{ id: "2", title: "Two", url: "https://two.example/b" },
	];
</script>

<Sources {sources}>
	<SourcesTrigger {...attrs} />
	<SourcesList />
</Sources>
