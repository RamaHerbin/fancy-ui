<script lang="ts">
	// Renders the real root layout around a probe screen, the way SvelteKit
	// nests a page in it. Used only by src/routes/layout.test.ts.
	import Layout from "../../routes/+layout.svelte";
	import ApiProbe, { type ProbeEntry } from "./ApiProbe.svelte";

	let { record }: { record: (entry: ProbeEntry) => void } = $props();
</script>

<Layout>
	<ApiProbe {record} />
</Layout>
