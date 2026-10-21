<script lang="ts">
	import ScreenHeader from "$lib/shell/ScreenHeader.svelte";
	import ScreenOutline from "$lib/shell/ScreenOutline.svelte";
</script>

<ScreenHeader screen="apiKeys" />

<ScreenOutline
	sections={[
		{
			title: "Active keys",
			description:
				"Name, scopes, when each key was created and last used. Revoking can be undone for a few seconds.",
			rows: 3,
		},
	]}
/>
