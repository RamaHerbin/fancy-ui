<script lang="ts">
	import ScreenHeader from "$lib/shell/ScreenHeader.svelte";
	import ScreenOutline from "$lib/shell/ScreenOutline.svelte";
</script>

<ScreenHeader screen="settings" />

<ScreenOutline
	sections={[
		{ title: "General", description: "Workspace name, language and display density.", rows: 2 },
		{ title: "Notifications", description: "Email digest, mentions and product updates.", rows: 2 },
		{ title: "Privacy", description: "Profile visibility and usage data.", rows: 1 },
		{ title: "Security", description: "Two-step sign-in and session timeout.", rows: 1 },
	]}
/>
