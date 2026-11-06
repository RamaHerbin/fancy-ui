// Mirrors src/lib/components/docs/examples/magnetic-field/BasicUsage.svelte.
// The two lucide glyphs are inlined (the bench app carries no icon package).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MagneticField, MagneticItem, MagnetPuck, type MagneticPoint } from "fancy-ui-react";

function Icon({
	name,
	children,
	className,
}: {
	name: string;
	children: ReactNode;
	className: string;
}) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={24}
			height={24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={`lucide-icon lucide lucide-${name} ${className}`}
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}

// Light things jump, heavy things barely move.
const chips = [
	{ label: "Springs", mass: 0.6, current: false },
	{ label: "Falloff", mass: 0.75, current: false },
	{ label: "Polarity", mass: 0.7, current: false },
	{ label: "Mass", mass: 0.85, current: true },
];

// The puck's tray, top left of the field.
const HOME: MagneticPoint = { x: 44, y: 40 };

export default function Scenario() {
	const [position, setPosition] = useState<MagneticPoint>({ ...HOME });
	const wrapRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);

	// Amplitude follows the field's width (Svelte: bind:clientWidth).
	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;
		const measure = () => setWidth(el.clientWidth);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const maxTranslate = width > 0 ? Math.round(Math.min(32, Math.max(16, width * 0.05))) : 32;
	const radius = width > 0 && width < 480 ? 200 : 260;

	return (
		<div ref={wrapRef} className="mx-auto w-full max-w-2xl">
			<MagneticField
				radius={radius}
				maxTranslate={maxTranslate}
				maxRotate={6}
				className="bg-muted/60 dark:bg-muted/30 w-full rounded-2xl px-3 pt-20 pb-10 sm:px-16"
			>
				<p className="text-muted-foreground absolute top-7 left-20 pr-4 text-xs leading-snug">
					Drag the magnet toward the card, or bring your pointer close.
				</p>

				<article className="mx-auto w-full max-w-[400px] rounded-[28px] bg-[#111112] p-6 text-[#f7f7f5] shadow-[0_24px_60px_-28px_rgb(0_0_0/0.6)] ring-1 ring-white/10 sm:p-10 dark:bg-[#19191b] dark:ring-white/15">
					<header className="flex items-center justify-between">
						<MagneticItem mass={1}>
							<span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
								<span className="size-3 rounded-full bg-[#f7f7f5]"></span>
								Lodestone
							</span>
						</MagneticItem>
						<MagneticItem mass={0.7}>
							<span className="rounded-full bg-[#1d2442] px-3 py-1 text-xs font-medium text-[#9db0ff]">
								Field kit
							</span>
						</MagneticItem>
					</header>

					<div className="mt-8 flex flex-wrap gap-2">
						{chips.map((chip) => (
							<MagneticItem key={chip.label} inline mass={chip.mass}>
								<span
									className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
										chip.current ? "bg-[#41463c] text-white" : "bg-[#252528] text-[#d9d9d6]"
									}`}
								>
									{chip.label}
								</span>
							</MagneticItem>
						))}
					</div>

					<MagneticItem mass={0.6} className="mt-8 w-fit">
						<span className="flex size-11 items-center justify-center rounded-[12px] bg-[#38363a] text-[#c9c9c4]">
							<Icon name="magnet" className="size-5">
								<path d="m12 15 4 4" />
								<path d="M2.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.029-6.029a1 1 0 1 1 3 3l-6.029 6.029a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.365-6.367A1 1 0 0 0 8.716 4.282z" />
								<path d="m5 8 4 4" />
							</Icon>
						</span>
					</MagneticItem>

					<MagneticItem mass={1.2} className="mt-4 w-fit">
						<p className="text-[30px] leading-[1.05] font-bold tracking-tight text-balance sm:text-[34px]">
							Pull, then let go
						</p>
					</MagneticItem>

					<MagneticItem mass={2.5}>
						<p className="mt-4 text-[13.5px] leading-5 text-[#b9b9b4]">
							Every block on this card has its own weight. Bring the magnet close and the light ones
							jump first, the heading follows, and this paragraph, the heaviest of all, barely moves
							before everything settles back home.
						</p>
					</MagneticItem>

					<div className="mt-8 flex flex-wrap items-center justify-between gap-3">
						<MagneticItem mass={1}>
							<button
								type="button"
								className="rounded-full bg-[#3c3936] px-3.5 py-2 text-[13px] font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9db0ff] sm:px-4"
							>
								Preview
							</button>
						</MagneticItem>
						<MagneticItem mass={1.1}>
							<button
								type="button"
								className="flex items-center gap-2 rounded-full bg-[#232120] px-3.5 py-2 text-[13px] font-medium whitespace-nowrap ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9db0ff] sm:px-4"
							>
								<Icon name="copy" className="size-3.5">
									<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
									<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
								</Icon>
								Copy install
							</button>
						</MagneticItem>
					</div>
				</article>

				<MagnetPuck
					position={position}
					onPositionChange={setPosition}
					size={48}
					label="Magnet: drag it toward the card"
					onHeldChange={(held) => {
						if (!held) setPosition({ ...HOME });
					}}
					className="motion-safe:[&:not([data-held])]:transition-transform motion-safe:[&:not([data-held])]:duration-500 motion-safe:[&:not([data-held])]:ease-out"
				/>
			</MagneticField>
		</div>
	);
}
