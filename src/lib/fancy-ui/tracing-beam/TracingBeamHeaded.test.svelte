<script lang="ts">
	import TracingBeam from "./TracingBeam.svelte";

	let { markers = true }: { markers?: boolean } = $props();
</script>

<TracingBeam {markers}>
	<h2 data-heading="a">First</h2>
	<p>Some text.</p>
	<h2 data-heading="b">Second</h2>
	<p>More text.</p>
</TracingBeam>
