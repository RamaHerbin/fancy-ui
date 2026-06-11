<script lang="ts">
	import { LineShadowText } from "$lib/fancy-ui/line-shadow-text";
	import { createThemeState } from "$lib/stores/theme.svelte";

	const themeState = createThemeState();
	const shadowColor = $derived(themeState.isDark ? "white" : "black");
</script>

<p class="text-6xl leading-none font-bold">
	Shadow <LineShadowText text="Text" class="italic" {shadowColor} />
</p>
