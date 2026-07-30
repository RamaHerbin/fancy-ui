<script lang="ts">
	let trackEl: HTMLDivElement;

	function scrollByCard(direction: 1 | -1) {
		trackEl?.scrollBy({ left: direction * trackEl.clientWidth * 0.9, behavior: "smooth" });
	}

	const cards = [
		{ title: "Dashboard", subtitle: "Analytics dashboard" },
		{ title: "Portfolio", subtitle: "Modern portfolio site" },
		{ title: "Landing Page", subtitle: "Product marketing" },
	];

	const CARD_CLASS =
		"flex w-[86%] flex-shrink-0 snap-start flex-col rounded-[18px] border border-white/9 bg-[#12111d] px-2.5 pt-2.5 shadow-[0_24px_60px_rgba(0,0,0,.45)] transition-colors hover:border-[rgba(139,123,255,.4)] sm:w-[62%] lg:w-auto lg:flex-shrink";
	const PREVIEW_CLASS = "h-[248px] overflow-hidden rounded-xl border border-white/6 bg-[#07060d]";
	const CAPTION_CLASS = "flex flex-col gap-1 px-2 pt-3.5 pb-4";
</script>

<section
	class="relative border-t border-white/5 bg-[#08080d] px-4 pt-16 pb-[72px] sm:px-8 lg:px-14"
>
	<div class="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:gap-12">
		<!-- Left rail -->
		<div class="flex flex-shrink-0 flex-col gap-[18px] pt-1.5 lg:w-[268px]">
			<span class="text-xs font-bold tracking-[.2em] text-[#a855f7] uppercase">Examples</span>
			<h2 class="m-0 text-[37px] leading-[1.24] font-bold tracking-[-0.02em] text-white">
				See FancyUI<br />in action.
			</h2>
			<p class="m-0 text-sm leading-[1.85] text-[#9aa3b2]">
				Beautiful interfaces, slick animations.<br />Made with FancyUI.
			</p>
			<a
				href="/docs/components"
				class="mt-2 inline-flex w-fit items-center gap-2.5 rounded-[10px] border border-white/12 bg-[rgba(16,15,26,.8)] px-5 py-[11px] text-[13px] font-medium text-[#e6e9ef] transition-colors hover:border-[rgba(139,123,255,.5)]"
			>
				Browse Components <span aria-hidden="true">→</span>
			</a>
		</div>

		<div class="relative min-w-0 flex-1">
			<!--
				The arrows only exist while the track actually scrolls (below lg the
				cards are a snap carousel; at lg they become a static 3-column grid),
				so they are never rendered as controls that do nothing.
			-->
			<div class="mb-3 flex justify-end gap-2.5 lg:hidden">
				<button
					type="button"
					onclick={() => scrollByCard(-1)}
					aria-label="Previous example"
					class="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-[rgba(20,19,31,.92)] text-sm text-[#8b93ab] shadow-[0_6px_18px_rgba(0,0,0,.4)] transition-colors hover:text-[#e6e9ef]"
				>
					<span aria-hidden="true">←</span>
				</button>
				<button
					type="button"
					onclick={() => scrollByCard(1)}
					aria-label="Next example"
					class="flex size-10 items-center justify-center rounded-xl border border-white/16 bg-[rgba(34,32,50,.95)] text-sm text-[#e6e9ef] shadow-[0_6px_18px_rgba(0,0,0,.4)] transition-colors hover:text-white"
				>
					<span aria-hidden="true">→</span>
				</button>
			</div>

			<div
				bind:this={trackEl}
				class="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 lg:mt-3.5 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0"
			>
				<!-- Dashboard -->
				<a href="/docs/components" class={CARD_CLASS}>
					<div class="{PREVIEW_CLASS} flex flex-col" aria-hidden="true">
						<!-- window chrome -->
						<div
							class="flex h-6 flex-shrink-0 items-center justify-between border-b border-white/6 px-[9px]"
						>
							<span class="flex items-center gap-[5px]">
								<span class="size-[9px] rounded-[3px] bg-gradient-to-br from-[#8b5cf6] to-[#3f7df6]"
								></span>
								<span class="h-1 w-[30px] rounded-sm bg-[#232134]"></span>
							</span>
							<span class="flex items-center gap-[5px]">
								<span class="h-[9px] w-9 rounded-[5px] bg-[#17152a]"></span>
								<span class="h-[9px] w-6 rounded-[5px] bg-gradient-to-r from-[#8b5cf6] to-[#3f7df6]"
								></span>
							</span>
						</div>
						<div class="flex min-h-0 flex-1">
							<!-- sidebar -->
							<div
								class="flex w-14 flex-shrink-0 flex-col gap-1.5 border-r border-white/6 px-[7px] py-2"
							>
								<span class="h-2.5 rounded-[3px] bg-[rgba(139,92,246,.5)]"></span>
								<span class="h-2.5 rounded-[3px] bg-[#151324]"></span>
								<span class="h-2.5 rounded-[3px] bg-[#151324]"></span>
								<span class="h-2.5 rounded-[3px] bg-[#151324]"></span>
								<span class="h-2.5 rounded-[3px] bg-[#151324]"></span>
								<span class="mt-auto h-2.5 rounded-[3px] bg-[#151324]"></span>
							</div>
							<div class="flex min-w-0 flex-1 flex-col gap-[7px] p-2">
								<!-- stat tiles -->
								<div class="flex gap-[7px]">
									<div class="flex flex-1 flex-col gap-1 rounded-md bg-[#100f1c] p-1.5">
										<span class="h-1 w-[60%] rounded-sm bg-[#232134]"></span>
										<span class="h-1.5 w-[42%] rounded-sm bg-[#3d3a5c]"></span>
									</div>
									<div class="flex flex-1 flex-col gap-1 rounded-md bg-[#100f1c] p-1.5">
										<span class="h-1 w-[60%] rounded-sm bg-[#232134]"></span>
										<span class="h-1.5 w-[42%] rounded-sm bg-[#34d399] opacity-75"></span>
									</div>
									<div class="flex flex-1 flex-col gap-1 rounded-md bg-[#100f1c] p-1.5">
										<span class="h-1 w-[60%] rounded-sm bg-[#232134]"></span>
										<span class="h-1.5 w-[42%] rounded-sm bg-[#8b5cf6] opacity-80"></span>
									</div>
								</div>
								<!-- donut + chart -->
								<div class="flex min-h-0 flex-1 gap-[7px]">
									<div class="flex w-16 flex-shrink-0 flex-col gap-[7px]">
										<div class="flex flex-1 items-center justify-center rounded-md bg-[#100f1c]">
											<span
												class="flex size-8 items-center justify-center rounded-full bg-[conic-gradient(#34d399_0_62%,#232134_62%_100%)]"
											>
												<span class="size-5 rounded-full bg-[#100f1c]"></span>
											</span>
										</div>
										<div
											class="h-11 rounded-md bg-[linear-gradient(130deg,#7c3aed,#4f7df6_55%,#22d3ee)]"
										></div>
									</div>
									<div class="relative flex-1 overflow-hidden rounded-md bg-[#100f1c]">
										<div class="absolute top-1.5 left-2 flex gap-1">
											<span class="size-[5px] rounded-full bg-[#34d399]"></span>
											<span class="size-[5px] rounded-full bg-[#8b5cf6]"></span>
											<span class="size-[5px] rounded-full bg-[#f43b5e]"></span>
										</div>
										<svg
											viewBox="0 0 120 60"
											preserveAspectRatio="none"
											class="absolute inset-x-0 bottom-0 h-[80%] w-full"
											aria-hidden="true"
										>
											<defs>
												<linearGradient id="fancyui-examples-area" x1="0" y1="0" x2="0" y2="1">
													<stop offset="0" stop-color="#8b5cf6" stop-opacity="0.4" />
													<stop offset="1" stop-color="#8b5cf6" stop-opacity="0" />
												</linearGradient>
											</defs>
											<path
												d="M0,48 L16,42 L32,46 L48,34 L64,39 L80,24 L96,30 L112,15 L120,19 L120,60 L0,60 Z"
												fill="url(#fancyui-examples-area)"
											/>
											<path
												d="M0,48 L16,42 L32,46 L48,34 L64,39 L80,24 L96,30 L112,15 L120,19"
												fill="none"
												stroke="#a78bfa"
												stroke-width="1.8"
											/>
										</svg>
									</div>
								</div>
								<!-- list rows -->
								<div class="flex gap-[7px]">
									<div class="flex flex-1 items-center gap-[5px] rounded-md bg-[#100f1c] p-1.5">
										<span class="size-1.5 rounded-sm bg-[#fb923c]"></span>
										<span class="h-1 flex-1 rounded-sm bg-[#232134]"></span>
									</div>
									<div class="flex flex-1 items-center gap-[5px] rounded-md bg-[#100f1c] p-1.5">
										<span class="size-1.5 rounded-sm bg-[#f43b5e]"></span>
										<span class="h-1 flex-1 rounded-sm bg-[#232134]"></span>
									</div>
									<div class="flex flex-1 items-center gap-[5px] rounded-md bg-[#100f1c] p-1.5">
										<span class="size-1.5 rounded-sm bg-[#34d399]"></span>
										<span class="h-1 flex-1 rounded-sm bg-[#232134]"></span>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div class={CAPTION_CLASS}>
						<span class="text-[15px] font-bold text-white">{cards[0].title}</span>
						<span class="text-[12.5px] text-[#8b93ab]">{cards[0].subtitle}</span>
					</div>
				</a>

				<!-- Portfolio -->
				<a href="/docs/components" class={CARD_CLASS}>
					<div class="{PREVIEW_CLASS} relative" aria-hidden="true">
						<span
							class="absolute top-[38px] right-9 size-[3px] rounded-full bg-[#fb923c] shadow-[0_0_6px_rgba(251,146,60,.9)]"
						></span>
						<span
							class="absolute top-[98px] right-[66px] size-[2px] rounded-full bg-[#e2e8f0] opacity-80"
						></span>
						<span
							class="absolute top-[152px] right-7 size-[3px] rounded-full bg-[#fb923c] shadow-[0_0_6px_rgba(251,146,60,.8)]"
						></span>
						<span
							class="absolute top-[196px] right-[104px] size-[2px] rounded-full bg-[#e2e8f0] opacity-70"
						></span>
						<span
							class="absolute top-[66px] left-[158px] size-[2px] rounded-full bg-[#e2e8f0] opacity-60"
						></span>
						<span
							class="absolute top-[216px] left-[60px] size-[2px] rounded-full bg-[#e2e8f0] opacity-50"
						></span>
						<div class="absolute inset-0 flex flex-col px-4 py-3">
							<div class="flex items-center justify-between">
								<span class="h-[5px] w-[26px] rounded-[3px] bg-[#232134]"></span>
								<span class="flex gap-[5px]">
									<span class="h-1 w-4 rounded-sm bg-[#1a1828]"></span>
									<span class="h-1 w-4 rounded-sm bg-[#1a1828]"></span>
									<span class="h-1 w-4 rounded-sm bg-[#1a1828]"></span>
								</span>
							</div>
							<div class="mt-7 flex gap-[5px]">
								<span
									class="h-2 w-9 rounded-[4px] border border-[rgba(139,92,246,.5)] bg-[rgba(139,92,246,.12)]"
								></span>
								<span class="h-2 w-[26px] rounded-[4px] border border-white/12"></span>
							</div>
							<span
								class="mt-2.5 text-[28px] leading-[1.12] font-extrabold tracking-[-0.01em] text-white"
								>Design<br />Engineer</span
							>
							<div class="mt-3 flex flex-col gap-[5px]">
								<span class="h-1 w-[72%] rounded-sm bg-[#232134]"></span>
								<span class="h-1 w-[54%] rounded-sm bg-[#232134]"></span>
							</div>
							<span class="mt-3.5 h-[15px] w-[58px] rounded-[4px] border border-white/18"></span>
						</div>
					</div>
					<div class={CAPTION_CLASS}>
						<span class="text-[15px] font-bold text-white">{cards[1].title}</span>
						<span class="text-[12.5px] text-[#8b93ab]">{cards[1].subtitle}</span>
					</div>
				</a>

				<!-- Landing Page -->
				<a href="/docs/components" class={CARD_CLASS}>
					<div class="{PREVIEW_CLASS} relative" aria-hidden="true">
						<svg
							viewBox="0 0 300 90"
							preserveAspectRatio="none"
							class="absolute inset-x-0 bottom-0 h-[38%] w-full"
							aria-hidden="true"
						>
							<g stroke="#7c3aed" stroke-opacity="0.45" stroke-width="0.8" fill="none">
								<path d="M14,80 L58,48 L104,66 L152,38 L206,58 L262,26 L292,40" />
								<path d="M58,48 L84,16 M152,38 L178,10 M206,58 L232,78" />
							</g>
							<g fill="#a78bfa">
								<circle cx="14" cy="80" r="2" />
								<circle cx="58" cy="48" r="2.4" />
								<circle cx="84" cy="16" r="1.8" />
								<circle cx="104" cy="66" r="2" />
								<circle cx="152" cy="38" r="2.4" fill="#e9d5ff" />
								<circle cx="178" cy="10" r="1.6" />
								<circle cx="206" cy="58" r="2" />
								<circle cx="232" cy="78" r="1.6" />
								<circle cx="262" cy="26" r="2.2" fill="#e9d5ff" />
								<circle cx="292" cy="40" r="1.6" />
							</g>
						</svg>
						<div class="absolute inset-0 flex flex-col items-center px-4 py-3">
							<div class="flex w-full items-center justify-between">
								<span class="h-[5px] w-[26px] rounded-[3px] bg-[#232134]"></span>
								<span class="flex gap-[5px]">
									<span class="h-1 w-3.5 rounded-sm bg-[#1a1828]"></span>
									<span class="h-1 w-3.5 rounded-sm bg-[#1a1828]"></span>
									<span class="h-1 w-3.5 rounded-sm bg-[#1a1828]"></span>
								</span>
							</div>
							<span
								class="mt-7 text-center text-[21px] leading-[1.3] font-bold tracking-[-0.01em] text-white"
							>
								Ship faster <span class="text-[#a78bfa]">with</span><br />beautiful
								<span class="text-[#5b8cff]">UI</span>
							</span>
							<div class="mt-3 flex w-full flex-col items-center gap-1">
								<span class="h-1 w-[78%] rounded-sm bg-[#1e1c30]"></span>
								<span class="h-1 w-[62%] rounded-sm bg-[#1e1c30]"></span>
							</div>
							<div class="mt-4 flex gap-2">
								<span
									class="h-[17px] w-[58px] rounded-[9px] bg-[linear-gradient(100deg,#6d5df6,#3f7df6)] shadow-[0_3px_12px_rgba(63,125,246,.5)]"
								></span>
								<span class="h-[17px] w-[58px] rounded-[9px] border border-white/12 bg-[#14131f]"
								></span>
							</div>
						</div>
					</div>
					<div class={CAPTION_CLASS}>
						<span class="text-[15px] font-bold text-white">{cards[2].title}</span>
						<span class="text-[12.5px] text-[#8b93ab]">{cards[2].subtitle}</span>
					</div>
				</a>
			</div>
		</div>
	</div>
</section>
