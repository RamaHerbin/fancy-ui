<script lang="ts">
	import { onMount } from "svelte";
	import { ImageTrailCursor } from "$lib/fancy-ui/image-trail-cursor/index.js";

	let isMobile = $state(false);
	let creativeSection: HTMLDivElement | undefined = $state();
	let isVisible = $state(false);

	const images = [
		"/portfolio/IMG_0318.jpg",
		"/portfolio/dsc9566-2.jpg",
		"/portfolio/20160624.jpg",
		"/portfolio/profile-rama.jpg",
	];

	function checkMobile() {
		if (typeof window !== "undefined") {
			isMobile =
				window.innerWidth < 768 ||
				/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		}
	}

	onMount(() => {
		checkMobile();

		const handleResize = () => checkMobile();
		window.addEventListener("resize", handleResize);

		let observer: IntersectionObserver | undefined;

		// IntersectionObserver for perf
		if (creativeSection) {
			observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						isVisible = entry.isIntersecting;
					});
				},
				{ threshold: 0.1, rootMargin: "50px 0px" }
			);
			observer.observe(creativeSection);
		}

		return () => {
			window.removeEventListener("resize", handleResize);
			observer?.disconnect();
		};
	});
</script>

{#if !isMobile}
	<div bind:this={creativeSection} class="flex min-h-96 w-full flex-col gap-2">
		<div
			class="relative mx-auto mt-4 flex h-96 w-full max-w-4xl items-center justify-center rounded-lg border border-white/10 p-4"
		>
			<span
				class="absolute inset-0 flex items-center justify-center text-4xl text-white/40 select-none"
			>
				Hover Here
			</span>

			{#if isVisible}
				<ImageTrailCursor {images} variant="type2" />
			{/if}
		</div>
	</div>
{/if}
