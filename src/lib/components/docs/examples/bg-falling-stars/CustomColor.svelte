<script lang="ts">
	import { FallingStarsBg } from "$lib/fancy-ui/bg-falling-stars";
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
	<div class="relative h-[250px] overflow-hidden rounded-lg border bg-black">
		<FallingStarsBg color="#60a5fa" />
		<div class="relative z-10 flex h-full items-center justify-center">
			<p class="text-blue-300">color="#60a5fa"</p>
		</div>
	</div>
	<div class="relative h-[250px] overflow-hidden rounded-lg border bg-black">
		<FallingStarsBg color="#f472b6" />
		<div class="relative z-10 flex h-full items-center justify-center">
			<p class="text-pink-300">color="#f472b6"</p>
		</div>
	</div>
</div>
