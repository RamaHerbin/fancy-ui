<script lang="ts">
	import { onMount } from 'svelte';
	import { createThemeState, toggleTheme } from '$lib/stores/theme.svelte.js';

	const themeState = createThemeState();

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<div class="absolute overflow-hidden w-full h-24 flex items-center justify-center">
	<div
		class="fixed top-8 left-1/2 -translate-x-1/2 z-[999999] bg-background/80 backdrop-blur-sm border border-border/20 rounded-lg w-[500px] max-w-[95vw]"
	>
		<nav
			class="relative w-full min-h-12 py-2 px-4 sm:px-6 md:px-8 lg:px-12 flex items-center justify-between"
			aria-label="Main navigation"
		>
			<!-- Brand / Logo -->
			<button
				onclick={scrollToTop}
				class="font-semibold text-foreground flex items-center justify-center relative select-none transition-transform translate-y-[5px] duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg p-3 min-w-[44px] min-h-[44px]"
				style="font-size: 40px; line-height: 1; top: 2px;"
				aria-label="Rama Herbin - Scroll to top"
			>
				&reg;
			</button>

			<!-- Portfolio Title -->
			<div class="flex-1 flex justify-center">
				<span class="text-sm font-medium text-muted-foreground tracking-wide">
					Portfolio 2k25
				</span>
			</div>

			<!-- Dark Mode Toggle -->
			<button
				onclick={toggleTheme}
				class="p-3 cursor-pointer rounded-lg bg-muted/50 hover:bg-muted transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[44px] min-h-[44px] flex items-center justify-center"
				aria-label={themeState.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if themeState.isDark}
					<!-- Sun icon -->
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path
							d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"
						/>
					</svg>
				{:else}
					<!-- Moon icon -->
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</button>
		</nav>
	</div>
</div>
