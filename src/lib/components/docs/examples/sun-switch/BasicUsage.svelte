<script lang="ts">
	import { SunSwitch } from "$lib/fancy-ui/sun-switch";
	import { createThemeState } from "$lib/stores/theme.svelte";

	// The sun is the site's theme switch: the wave reveals the real page in its new theme.
	const theme = createThemeState();
</script>

<header class="w-full max-w-2xl">
	<div class="border-foreground/15 flex items-end justify-between gap-6 border-b">
		<div class="min-w-0 pb-5">
			<p class="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
				Issue 14 · Late autumn
			</p>
			<h3 class="mt-2 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
				Hours of low light
			</h3>
		</div>
		<SunSwitch
			checked={!theme.isDark}
			onCheckedChange={(day) => theme.setTheme(day ? "light" : "dark")}
			label="Day mode"
			sound
			class="shrink-0"
		/>
	</div>
	<p class="text-muted-foreground mt-4 max-w-prose text-sm leading-relaxed">
		Hover the sun to look at it through the lens. Click it, or focus it and press Space, to change
		the light: the new theme spreads from the sun across the whole page.
	</p>
</header>
