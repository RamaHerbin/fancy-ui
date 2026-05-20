<script lang="ts">
	import { DirectionAwareHover } from "$lib/fancy-ui/direction-aware-hover";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<DirectionAwareHover imageUrl="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80" class="h-64 w-64">
		<p class="text-lg font-bold">Nature</p>
		<p class="text-sm font-normal">Sunlit valley</p>
	</DirectionAwareHover>
	<DirectionAwareHover imageUrl="https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&q=80" class="h-64 w-64">
		<p class="text-lg font-bold">Desert</p>
		<p class="text-sm font-normal">Golden dunes</p>
	</DirectionAwareHover>
	<DirectionAwareHover imageUrl="https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&q=80" class="h-64 w-64">
		<p class="text-lg font-bold">Forest</p>
		<p class="text-sm font-normal">Autumn colors</p>
	</DirectionAwareHover>
</div>
