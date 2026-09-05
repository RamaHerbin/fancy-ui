<script lang="ts">
	import { ConfettiButton } from "$lib/fancy-ui/confetti";
</script>

<div class="flex items-center gap-4">
	<ConfettiButton sound options={{ particleCount: 200, spread: 100 }}>
		<span
			class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700"
		>
			Big burst
		</span>
	</ConfettiButton>
	<ConfettiButton sound options={{ particleCount: 50, colors: ["#ff0000", "#00ff00", "#0000ff"] }}>
		<span
			class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-700"
		>
			RGB confetti
		</span>
	</ConfettiButton>
</div>
