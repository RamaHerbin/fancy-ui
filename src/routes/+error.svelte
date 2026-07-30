<script lang="ts">
	import { page } from "$app/state";

	const isNotFound = $derived(page.status === 404);
	const message = $derived(
		isNotFound
			? "This page doesn't exist."
			: (page.error?.message ?? "Something went wrong.")
	);
</script>

<svelte:head>
	<title>{page.status} — FancyUI</title>
</svelte:head>

<div
	class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050508] px-4 text-[#f8fafc]"
>
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(91,140,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(91,140,255,.04)_1px,transparent_1px)] [background-size:64px_64px]"
	></div>
	<div
		aria-hidden="true"
		class="pointer-events-none absolute top-1/2 left-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(124,58,237,.3),rgba(59,130,246,.12)_55%,transparent_75%)] blur-[60px]"
	></div>

	<div class="relative flex flex-col items-center gap-5 text-center">
		<span
			class="bg-[linear-gradient(100deg,#a78bfa,#5b8cff)] bg-clip-text text-7xl font-extrabold tracking-[-0.025em] text-transparent sm:text-8xl"
		>
			{page.status}
		</span>

		<h1 class="max-w-md text-2xl font-bold tracking-tight text-balance sm:text-3xl">
			{message}
		</h1>

		<p class="max-w-[420px] text-[15px] leading-[1.65] text-[#9aa3b2]">
			{isNotFound
				? "The page you're looking for may have been moved or no longer exists."
				: "Try refreshing the page, or head back to somewhere familiar."}
		</p>

		<div class="mt-2.5 flex flex-col gap-3.5 sm:flex-row">
			<a
				href="/"
				class="inline-flex items-center gap-2.5 rounded-xl bg-[linear-gradient(100deg,#7c3aed,#3b82f6)] px-[26px] py-[13px] text-sm font-semibold text-white shadow-[0_8px_30px_rgba(91,140,255,0.4)] transition-opacity hover:opacity-90"
			>
				Back home
			</a>
			<a
				href="/docs/components"
				class="inline-flex items-center rounded-xl border border-white/12 bg-[rgba(19,19,26,.7)] px-[26px] py-[13px] text-sm font-medium text-[#e6e9ef] transition-colors hover:border-white/25"
			>
				Browse components
			</a>
		</div>
	</div>
</div>
