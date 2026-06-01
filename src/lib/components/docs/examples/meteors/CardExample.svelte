<script lang="ts">
	import { Meteors } from "$lib/fancy-ui/meteors";
</script>

<div
	class="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl"
>
	<Meteors count={15} />
	<div class="relative z-10">
		<h3 class="mb-2 text-lg font-bold text-white">Shooting Stars</h3>
		<p class="text-sm text-zinc-400">
			A beautiful meteor shower effect for dark-themed cards and hero sections.
		</p>
	</div>
</div>
