<script lang="ts">
	import StoryThread, { type StoryThreadProps } from "./StoryThread.svelte";
	import StoryNode from "./StoryNode.svelte";

	let props: Omit<StoryThreadProps, "children"> = $props();
</script>

<StoryThread {...props}>
	<section>
		<p>One</p>
		<StoryNode id="one" />
	</section>
	<section>
		<p>Two</p>
		<StoryNode id="two" variant="ring" style="top: 40%" />
	</section>
</StoryThread>
