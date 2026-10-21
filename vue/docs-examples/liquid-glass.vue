<script setup lang="ts">
import { LiquidGlass } from "fancy-ui-vue";
</script>

<template>
	<div
		class="relative flex h-[400px] w-full items-center justify-center overflow-hidden rounded-lg border"
	>
		<div
			class="absolute top-1/4 left-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/30 blur-3xl"
		/>
		<div class="absolute right-1/4 bottom-1/3 h-64 w-64 rounded-full bg-cyan-500/30 blur-3xl" />
		<div
			class="absolute bottom-1/4 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-rose-500/25 blur-3xl"
		/>

		<div class="relative z-10">
			<LiquidGlass :radius="20" :frost="0.05">
				<div
					class="text-foreground flex min-h-16 w-full items-center justify-center px-12 py-4 text-base font-medium"
				>
					Liquid Glass
				</div>
			</LiquidGlass>
		</div>
	</div>
</template>
