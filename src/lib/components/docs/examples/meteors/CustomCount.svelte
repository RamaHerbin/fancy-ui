<script lang="ts">
	import { Meteors } from "$lib/fancy-ui/meteors";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<div class="bg-background relative flex h-48 w-56 items-center justify-center overflow-hidden rounded-xl border p-4">
		<p class="text-foreground z-10 text-center text-xs">5 meteors</p>
		<Meteors count={5} />
	</div>
	<div class="bg-background relative flex h-48 w-56 items-center justify-center overflow-hidden rounded-xl border p-4">
		<p class="text-foreground z-10 text-center text-xs">40 meteors</p>
		<Meteors count={40} />
	</div>
</div>
