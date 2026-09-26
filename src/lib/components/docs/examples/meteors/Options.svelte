<script lang="ts">
	import { Meteors } from "$lib/fancy-ui/meteors";
</script>

<div class="grid w-full gap-4 sm:grid-cols-3">
	<div class="relative h-48 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
		<Meteors count={18} color="#fcd34d" />
		<p class="relative z-10 p-4 text-xs text-zinc-400">color="#fcd34d"</p>
	</div>
	<div class="relative h-48 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
		<Meteors count={18} angle={235} color="#a5b4fc" />
		<p class="relative z-10 p-4 text-xs text-zinc-400">angle=&#123;235&#125;</p>
	</div>
	<div class="relative h-48 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
		<Meteors count={30} speed={2} seed={7} />
		<p class="relative z-10 p-4 text-xs text-zinc-400">speed=&#123;2&#125; seed=&#123;7&#125;</p>
	</div>
</div>
