<script lang="ts">
	import { Magnetic } from "$lib/fancy-ui/magnetic";
	import { Button } from "$lib/fancy-ui/button";
</script>

<div class="flex flex-wrap items-center justify-center gap-20 p-10">
	<div class="flex flex-col items-center gap-3">
		<Magnetic strength={0.15}>
			<Button variant="outline">Subtle</Button>
		</Magnetic>
		<span class="text-muted-foreground text-xs">strength 0.15</span>
	</div>
	<div class="flex flex-col items-center gap-3">
		<Magnetic strength={0.35}>
			<Button variant="outline">Default</Button>
		</Magnetic>
		<span class="text-muted-foreground text-xs">strength 0.35 (default)</span>
	</div>
	<div class="flex flex-col items-center gap-3">
		<Magnetic strength={0.55}>
			<Button variant="outline">Strong</Button>
		</Magnetic>
		<span class="text-muted-foreground text-xs">strength 0.55</span>
	</div>
</div>
