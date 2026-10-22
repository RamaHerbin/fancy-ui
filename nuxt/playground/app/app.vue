<script setup lang="ts">
// Auto-imported by the module (`composables: true`).
const soundOn = useSoundEnabled();
</script>

<template>
	<div class="bg-background text-foreground min-h-screen antialiased">
		<header class="border-border/60 sticky top-0 z-20 border-b backdrop-blur">
			<div class="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 sm:px-6">
				<span class="text-sm font-semibold tracking-tight">fancy-ui-nuxt</span>
				<nav class="text-muted-foreground flex gap-4 text-sm">
					<NuxtLink to="/" class="hover:text-foreground" active-class="text-foreground">
						Overview
					</NuxtLink>
					<NuxtLink to="/second" class="hover:text-foreground" active-class="text-foreground">
						Second page
					</NuxtLink>
				</nav>
				<div class="ml-auto flex items-center gap-3">
					<span class="text-muted-foreground hidden text-xs sm:inline" data-testid="sound-state">
						sound {{ soundOn ? "on" : "off" }}
					</span>
					<FancySoundToggle size="sm" />
				</div>
			</div>
		</header>
		<main class="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
			<NuxtPage />
		</main>
	</div>
</template>
