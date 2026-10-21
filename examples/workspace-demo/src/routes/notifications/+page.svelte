<script lang="ts">
	import ScreenHeader from "$lib/shell/ScreenHeader.svelte";
	import ScreenOutline from "$lib/shell/ScreenOutline.svelte";
</script>

<ScreenHeader screen="notifications" />

<ScreenOutline
	sections={[
		{
			title: "Inbox",
			description: "Unread first. Mark one or all as read, and undo the whole batch.",
			rows: 4,
		},
	]}
/>
