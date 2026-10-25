<script setup lang="ts">
const count = ref(0);
const lazyCount = ref(0);
const mounts = useState("index-mounts", () => 0);
onMounted(() => {
	mounts.value++;
});
</script>

<template>
	<main data-testid="index" :data-mounts="mounts">
		<NuxtLink data-testid="to-other" to="/other">Other</NuxtLink>

		<FancyShimmerButton data-testid="counter-btn" @click="count++">Increment</FancyShimmerButton>
		<output data-testid="count">{{ count }}</output>

		<div class="flex gap-4">
			<div data-testid="beam-a" class="relative h-24 w-48 rounded-xl border">
				<FancyBorderBeam :duration="4" color-from="#ff0000" color-to="#ffaa00" />
			</div>
			<div data-testid="beam-b" class="relative h-24 w-48 rounded-xl border">
				<FancyBorderBeam :duration="7" reverse />
			</div>
		</div>

		<!-- Low resolutions: software GL in CI renders the default ones at a few fps. -->
		<div data-testid="fluid" class="relative h-48 w-80 overflow-hidden rounded-lg border">
			<FancyFluidCursor :sim-resolution="32" :dye-resolution="256" :capture-resolution="128" />
		</div>

		<div data-testid="meteors" class="relative h-40 w-80 overflow-hidden rounded-lg border">
			<FancyMeteors :count="12" :seed="42" />
		</div>

		<div data-testid="spacer" style="height: 3000px"></div>

		<div data-testid="lazy-host">
			<LazyFancyShimmerButton hydrate-on-visible data-testid="lazy-btn" @click="lazyCount++">
				Lazy
			</LazyFancyShimmerButton>
			<output data-testid="lazy-count">{{ lazyCount }}</output>
		</div>
	</main>
</template>
