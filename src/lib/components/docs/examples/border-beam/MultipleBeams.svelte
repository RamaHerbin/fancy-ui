<script lang="ts">
	import { BorderBeam } from "$lib/fancy-ui/border-beam";
</script>

<!-- Two comets on the same rail: one clockwise, one counter-clockwise, half a lap apart. -->
<div
	class="relative mx-auto flex h-40 w-full max-w-md items-center justify-center overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] p-6 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
>
	<p class="text-sm text-neutral-500">Two comets, passing</p>
	<BorderBeam colorFrom="#8ec5ff" colorTo="#c084fc" duration={10} />
	<BorderBeam colorFrom="#fcd9a8" colorTo="#f472b6" duration={10} delay={5} reverse />
</div>
