<section
	class="flex flex-col gap-14 border-t border-white/5 bg-[#08080d] px-6 py-16 md:px-10 lg:flex-row lg:items-start lg:px-14"
>
	<!-- Left rail -->
	<div class="flex w-full flex-col gap-4 lg:w-[360px] lg:flex-shrink-0">
		<span class="text-[11px] font-bold tracking-[.14em] text-[#8b7bff] uppercase">Components</span>
		<h2 class="text-[34px] leading-[1.2] font-extrabold tracking-[-0.02em] text-[#e6e9ef]">
			Everything you need, beautifully designed.
		</h2>
		<p class="text-sm leading-[1.65] text-[#9aa3b2]">
			FancyUI comes with a rich set of animated, accessible and customizable components. Built with
			modern web standards.
		</p>
		<a
			href="/docs/components"
			class="mt-2 inline-flex w-fit items-center gap-2 rounded-[10px] border border-white/12 px-[18px] py-2.5 text-[13px] font-medium text-[#e6e9ef] transition-colors hover:border-[#8b7bff]/50"
		>
			Explore all components <span aria-hidden="true">→</span>
		</a>
	</div>

	<!-- Bento grid: static previews of what the components look like, not live/functional instances -->
	<div
		class="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2 lg:flex-1 lg:grid-cols-[1.15fr_1fr_0.85fr]"
	>
		<!-- Glass Card -->
		<div class="flex flex-col gap-3.5 rounded-[14px] border border-white/8 bg-[#0d0d14] p-[18px]">
			<span class="text-xs text-[#9aa3b2]">Glass Card</span>
			<div
				class="flex min-h-[110px] flex-1 items-center justify-center rounded-[10px] border border-white/6 bg-[radial-gradient(ellipse_80%_90%_at_70%_110%,rgba(124,58,237,.35),transparent_60%),#0a0a10]"
			>
				<span class="text-center text-base font-semibold text-[#e6e9ef]"
					>Beautiful<br />by default.</span
				>
			</div>
		</div>

		<!-- Button -->
		<div class="flex flex-col gap-3.5 rounded-[14px] border border-white/8 bg-[#0d0d14] p-[18px]">
			<span class="text-xs text-[#9aa3b2]">Button</span>
			<div class="flex flex-1 items-center justify-center">
				<span
					class="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(100deg,#7c3aed,#3b82f6)] px-[22px] py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_24px_rgba(91,140,255,.4)] transition-shadow hover:shadow-[0_6px_32px_rgba(91,140,255,.6)]"
				>
					Hover me <span aria-hidden="true">→</span>
				</span>
			</div>
		</div>

		<!-- Toggle -->
		<div class="flex flex-col gap-3.5 rounded-[14px] border border-white/8 bg-[#0d0d14] p-[18px]">
			<span class="text-xs text-[#9aa3b2]">Toggle</span>
			<div class="flex flex-1 items-center justify-center">
				<span
					aria-hidden="true"
					class="relative inline-block h-[28px] w-[52px] rounded-full bg-[linear-gradient(100deg,#7c3aed,#3b82f6)] shadow-[0_0_18px_rgba(124,58,237,.4)]"
				>
					<span class="absolute top-[3px] right-[3px] h-[22px] w-[22px] rounded-full bg-white"
					></span>
				</span>
			</div>
		</div>

		<!-- Input -->
		<div
			class="col-span-2 flex flex-col gap-3 rounded-[14px] border border-white/8 bg-[#0d0d14] p-[18px]"
		>
			<span class="text-xs text-[#9aa3b2]">Input</span>
			<div
				class="rounded-[10px] border border-white/10 bg-[#0a0a10] px-3.5 py-[11px] text-[13px] text-[#8b93ab]"
			>
				Type something…
			</div>
		</div>

		<!-- Progress -->
		<div class="flex flex-col gap-3 rounded-[14px] border border-white/8 bg-[#0d0d14] p-[18px]">
			<div class="flex justify-between text-xs">
				<span class="text-[#9aa3b2]">Progress</span>
				<span class="font-mono text-[#e6e9ef]">72%</span>
			</div>
			<div
				aria-hidden="true"
				class="relative my-auto h-2 overflow-hidden rounded-full bg-[#1b1b24]"
			>
				<span
					class="absolute inset-0 w-[72%] rounded-full bg-[linear-gradient(90deg,#7c3aed,#3b82f6)]"
				></span>
			</div>
		</div>
	</div>
</section>
