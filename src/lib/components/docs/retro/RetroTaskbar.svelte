<script lang="ts">
	// Retro OS taskbar — Start button (pixel logo), status tagline, live clock.
	// Rendered only when the retro-os skin is active (gated by the caller). All of
	// its styling lives in docs-skin.css under .docs-skin[data-skin="retro-os"].
	import { t } from "$lib/stores";

	let now = $state(new Date());

	$effect(() => {
		const id = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(id);
	});

	const time = $derived(
		now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
	);
	const date = $derived(
		now.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
	);
</script>

<div class="retro-taskbar" role="presentation">
	<button type="button" class="retro-taskbar-start retro-press">
		<span class="retro-pixel-logo retro-pixel-logo-sm" aria-hidden="true">
			<span></span><span></span><span></span><span></span>
		</span>
		{t("retro.start")}
	</button>

	<span class="retro-taskbar-status">
		<span class="retro-taskbar-led" aria-hidden="true"></span>
		{t("retro.tagline")}
	</span>

	<span class="retro-taskbar-clock">
		{time}<br />{date}
	</span>
</div>
