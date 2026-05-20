<script lang="ts">
	import { Dock, DockIcon } from "$lib/fancy-ui/dock";
	import type { Direction } from "$lib/fancy-ui/dock";
</script>

<div class="space-y-6">
	{#each ["top", "middle", "bottom"] as dir (dir)}
		<div>
			<p class="text-muted-foreground mb-2 text-center text-sm">direction="{dir}"</p>
			<div class="flex justify-center">
				<Dock direction={dir as Direction} class="h-[80px]">
					<DockIcon>
						<div class="size-full rounded-full bg-gradient-to-br from-pink-500 to-purple-500"></div>
					</DockIcon>
					<DockIcon>
						<div class="size-full rounded-full bg-gradient-to-br from-blue-500 to-cyan-500"></div>
					</DockIcon>
					<DockIcon>
						<div class="size-full rounded-full bg-gradient-to-br from-green-500 to-emerald-500"></div>
					</DockIcon>
				</Dock>
			</div>
		</div>
	{/each}
</div>
