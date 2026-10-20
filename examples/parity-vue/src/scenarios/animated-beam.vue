<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/animated-beam/BasicUsage.svelte.
// The five lucide glyphs are inlined (the bench app carries no icon package).
import { ref } from "vue";
import { AnimatedBeam } from "fancy-ui-vue";

const containerRef = ref<HTMLElement | null>(null);
const docsRef = ref<HTMLElement | null>(null);
const dataRef = ref<HTMLElement | null>(null);
const chatRef = ref<HTMLElement | null>(null);
const hubRef = ref<HTMLElement | null>(null);
const userRef = ref<HTMLElement | null>(null);

const node =
	"relative z-10 rounded-2xl border border-black/[0.08] bg-[#fafafa] p-1 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-[#141416] dark:shadow-none";
const well =
	"flex items-center justify-center rounded-xl border border-black/[0.06] bg-white text-neutral-700 dark:border-white/[0.06] dark:bg-[#0b0b0c] dark:text-neutral-300";
</script>

<template>
	<div
		class="w-full rounded-[22px] border border-black/[0.08] bg-[#f4f4f5] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
	>
		<div
			ref="containerRef"
			class="relative flex h-[420px] w-full items-center justify-center overflow-hidden rounded-2xl border border-black/[0.06] bg-[#fafafa] dark:border-white/[0.06] dark:bg-[#111113]"
		>
			<!-- faint dot field -->
			<div
				aria-hidden="true"
				class="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(0,0,0,0.07)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] [background-size:18px_18px] dark:[background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)]"
			></div>

			<div class="flex w-full max-w-xl items-center justify-between px-8 sm:px-12">
				<div class="flex flex-col gap-10">
					<div ref="docsRef" :class="node">
						<div :class="[well, 'size-11']">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="size-[18px]"
							>
								<path
									d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
								/>
								<path d="M14 2v5a1 1 0 0 0 1 1h5" />
								<path d="M10 9H8" />
								<path d="M16 13H8" />
								<path d="M16 17H8" />
							</svg>
						</div>
					</div>
					<div ref="dataRef" :class="node">
						<div :class="[well, 'size-11']">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="size-[18px]"
							>
								<ellipse cx="12" cy="5" rx="9" ry="3" />
								<path d="M3 5V19A9 3 0 0 0 21 19V5" />
								<path d="M3 12A9 3 0 0 0 21 12" />
							</svg>
						</div>
					</div>
					<div ref="chatRef" :class="node">
						<div :class="[well, 'size-11']">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="size-[18px]"
							>
								<path
									d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
								/>
							</svg>
						</div>
					</div>
				</div>

				<div ref="hubRef" :class="[node, 'rounded-[22px] p-1.5']">
					<div :class="[well, 'size-16 rounded-[16px]']">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="size-6"
						>
							<path
								d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
							/>
							<path d="M20 2v4" />
							<path d="M22 4h-4" />
							<circle cx="4" cy="20" r="2" />
						</svg>
					</div>
				</div>

				<div ref="userRef" :class="node">
					<div :class="[well, 'size-11']">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="size-[18px]"
						>
							<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
							<circle cx="12" cy="7" r="4" />
						</svg>
					</div>
				</div>
			</div>

			<template v-if="containerRef && hubRef">
				<AnimatedBeam
					v-if="docsRef"
					:container-ref="containerRef"
					:from-ref="docsRef"
					:to-ref="hubRef"
					:curvature="-60"
					:end-y-offset="-12"
					gradient-start-color="#f2b880"
					gradient-stop-color="#a78bfa"
					:seed="3"
				/>
				<AnimatedBeam
					v-if="dataRef"
					:container-ref="containerRef"
					:from-ref="dataRef"
					:to-ref="hubRef"
					gradient-start-color="#f2b880"
					gradient-stop-color="#a78bfa"
					:seed="7"
					:delay="0.9"
				/>
				<AnimatedBeam
					v-if="chatRef"
					:container-ref="containerRef"
					:from-ref="chatRef"
					:to-ref="hubRef"
					:curvature="60"
					:end-y-offset="12"
					gradient-start-color="#f2b880"
					gradient-stop-color="#a78bfa"
					:seed="11"
					:delay="1.7"
				/>
				<AnimatedBeam
					v-if="userRef"
					:container-ref="containerRef"
					:from-ref="hubRef"
					:to-ref="userRef"
					gradient-start-color="#f2b880"
					gradient-stop-color="#a78bfa"
					:seed="5"
					:delay="2.4"
				/>
			</template>
		</div>
	</div>
</template>
