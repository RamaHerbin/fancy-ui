<script setup lang="ts">
const words = ["mount", "unmount", "mount again"];
</script>

<template>
	<div class="space-y-16 pt-16">
		<section class="space-y-4">
			<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
				Client navigation:<FancyFlipWords :words="words" class="text-foreground px-0" />
			</h1>
			<p class="text-muted-foreground max-w-xl text-sm">
				Go back and forth with the links in the header. Each effect should stop when its page leaves
				and start cleanly when it returns: the console stays quiet, the fluid canvas comes back, and
				nothing keeps animating off-screen.
			</p>
		</section>

		<section class="grid gap-6 sm:grid-cols-2">
			<div class="bg-card relative flex h-48 flex-col justify-end overflow-hidden rounded-2xl p-6">
				<p class="text-sm font-medium">Glow border</p>
				<p class="text-muted-foreground text-xs">The silver preset, around a card.</p>
				<FancyGlowBorder preset="silver" :border-radius="16" />
			</div>
			<div
				class="border-border bg-card relative flex h-48 flex-col justify-end overflow-hidden rounded-2xl border p-6"
			>
				<FancyMeteors :count="14" :seed="7" />
				<p class="text-sm font-medium">Meteors</p>
				<p class="text-muted-foreground text-xs">A seeded field, identical on server and client.</p>
			</div>
		</section>

		<section class="space-y-3">
			<h2 class="text-lg font-semibold">Text on arrival</h2>
			<FancyTextGenerateEffect
				words="Each word fades in after hydration, then the sentence stays put."
				class="text-xl"
			/>
			<p class="text-muted-foreground text-sm">
				A number ticker counts up to
				<FancyNumberTicker :value="1482" class="text-foreground font-mono" /> once it is in view.
			</p>
		</section>

		<NuxtLink to="/" class="text-muted-foreground hover:text-foreground text-sm">
			← Back to the overview
		</NuxtLink>
	</div>
</template>
