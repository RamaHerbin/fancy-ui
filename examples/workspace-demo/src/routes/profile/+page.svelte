<script lang="ts">
	import ScreenHeader from "$lib/shell/ScreenHeader.svelte";
	import ScreenOutline from "$lib/shell/ScreenOutline.svelte";
</script>

<ScreenHeader screen="profile" />

<ScreenOutline
	sections={[
		{
			title: "Identity",
			description: "Avatar, name, handle and role: what appears next to everything you post.",
			rows: 1,
		},
		{
			title: "About",
			description: "A short bio, your location and the time zone teammates see.",
			rows: 2,
		},
	]}
/>
