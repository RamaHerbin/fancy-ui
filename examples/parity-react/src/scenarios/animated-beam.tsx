// Mirrors src/lib/components/docs/examples/animated-beam/BasicUsage.svelte.
// The five lucide glyphs are inlined (the bench app carries no icon package).
import { useState } from "react";
import type { ReactNode } from "react";
import { AnimatedBeam } from "fancy-ui-react";

const node =
	"relative z-10 rounded-2xl border border-black/[0.08] bg-[#fafafa] p-1 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-[#141416] dark:shadow-none";
const well =
	"flex items-center justify-center rounded-xl border border-black/[0.06] bg-white text-neutral-700 dark:border-white/[0.06] dark:bg-[#0b0b0c] dark:text-neutral-300";

function Icon({ className, sw, children }: { className: string; sw: number; children: ReactNode }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={sw}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			{children}
		</svg>
	);
}

export default function Scenario() {
	const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
	const [docsRef, setDocsRef] = useState<HTMLElement | null>(null);
	const [dataRef, setDataRef] = useState<HTMLElement | null>(null);
	const [chatRef, setChatRef] = useState<HTMLElement | null>(null);
	const [hubRef, setHubRef] = useState<HTMLElement | null>(null);
	const [userRef, setUserRef] = useState<HTMLElement | null>(null);

	const colors = { gradientStartColor: "#f2b880", gradientStopColor: "#a78bfa" };

	return (
		<div className="w-full rounded-[22px] border border-black/[0.08] bg-[#f4f4f5] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]">
			<div
				ref={setContainerRef}
				className="relative flex h-[420px] w-full items-center justify-center overflow-hidden rounded-2xl border border-black/[0.06] bg-[#fafafa] dark:border-white/[0.06] dark:bg-[#111113]"
			>
				{/* faint dot field */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(0,0,0,0.07)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] [background-size:18px_18px] dark:[background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)]"
				></div>

				<div className="flex w-full max-w-xl items-center justify-between px-8 sm:px-12">
					<div className="flex flex-col gap-10">
						<div ref={setDocsRef} className={node}>
							<div className={`${well} size-11`}>
								<Icon className="size-[18px]" sw={1.6}>
									<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
									<path d="M14 2v5a1 1 0 0 0 1 1h5" />
									<path d="M10 9H8" />
									<path d="M16 13H8" />
									<path d="M16 17H8" />
								</Icon>
							</div>
						</div>
						<div ref={setDataRef} className={node}>
							<div className={`${well} size-11`}>
								<Icon className="size-[18px]" sw={1.6}>
									<ellipse cx="12" cy="5" rx="9" ry="3" />
									<path d="M3 5V19A9 3 0 0 0 21 19V5" />
									<path d="M3 12A9 3 0 0 0 21 12" />
								</Icon>
							</div>
						</div>
						<div ref={setChatRef} className={node}>
							<div className={`${well} size-11`}>
								<Icon className="size-[18px]" sw={1.6}>
									<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
								</Icon>
							</div>
						</div>
					</div>

					<div ref={setHubRef} className={`${node} rounded-[22px] p-1.5`}>
						<div className={`${well} size-16 rounded-[16px]`}>
							<Icon className="size-6" sw={1.5}>
								<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
								<path d="M20 2v4" />
								<path d="M22 4h-4" />
								<circle cx="4" cy="20" r="2" />
							</Icon>
						</div>
					</div>

					<div ref={setUserRef} className={node}>
						<div className={`${well} size-11`}>
							<Icon className="size-[18px]" sw={1.6}>
								<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
								<circle cx="12" cy="7" r="4" />
							</Icon>
						</div>
					</div>
				</div>

				{containerRef && hubRef ? (
					<>
						{docsRef ? (
							<AnimatedBeam
								containerRef={containerRef}
								fromRef={docsRef}
								toRef={hubRef}
								curvature={-60}
								endYOffset={-12}
								{...colors}
								seed={3}
							/>
						) : null}
						{dataRef ? (
							<AnimatedBeam
								containerRef={containerRef}
								fromRef={dataRef}
								toRef={hubRef}
								{...colors}
								seed={7}
								delay={0.9}
							/>
						) : null}
						{chatRef ? (
							<AnimatedBeam
								containerRef={containerRef}
								fromRef={chatRef}
								toRef={hubRef}
								curvature={60}
								endYOffset={12}
								{...colors}
								seed={11}
								delay={1.7}
							/>
						) : null}
						{userRef ? (
							<AnimatedBeam
								containerRef={containerRef}
								fromRef={hubRef}
								toRef={userRef}
								{...colors}
								seed={5}
								delay={2.4}
							/>
						) : null}
					</>
				) : null}
			</div>
		</div>
	);
}
