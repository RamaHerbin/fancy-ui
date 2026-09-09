import { Dialog, InteractiveGridPattern, LineHoverLink } from "fancy-ui-react";
import { c, cList } from "@/content/content";
import { MediaFrame } from "@/components/work/MediaFrame";
import { SectionLabel } from "@/components/work/SectionLabel";
import { Tag } from "@/components/work/Tag";

const CARD =
	"border-border/50 hover:bg-foreground/[0.02] grid grid-cols-1 items-center gap-12 border-t py-10 transition-colors lg:[grid-template-columns:minmax(0,7fr)_minmax(0,5fr)]";

const SCRIM =
	"pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-[oklch(0.1_0_0_/_0.85)] to-transparent px-5 pt-10 pb-3.5 font-mono text-[10px] tracking-[0.1em] text-white/75";

function Eyebrow({ block }: { block: string }) {
	return (
		<div className="flex items-baseline gap-3.5 font-mono text-[11px] tracking-[0.12em]">
			<span className="text-accent-work">{c(`home.projects.${block}.index`)}</span>
			<span className="text-muted-foreground">{c(`home.projects.${block}.eyebrow`)}</span>
		</div>
	);
}

function Title({ block }: { block: string }) {
	return (
		<h3 className="text-foreground mt-3.5 text-[clamp(28px,4vw,40px)] leading-[1.05] font-bold tracking-[-0.025em]">
			{c(`home.projects.${block}.title`)}
		</h3>
	);
}

function Tags({ block, className }: { block: string; className?: string }) {
	return (
		<div className={className ?? "mt-[18px] flex flex-wrap gap-2"}>
			{cList(`home.projects.${block}.tags`).map((t) => (
				<Tag key={t} label={t} />
			))}
		</div>
	);
}

export function Projects() {
	return (
		<section id="projects" className="px-6 py-20">
			<div className="mx-auto max-w-6xl">
				<SectionLabel label={c("home.projects.label")} counter={c("home.projects.counter")} className="mb-6" />

				<div className="mb-16 grid grid-cols-1 items-end gap-12 lg:[grid-template-columns:minmax(0,7fr)_minmax(0,5fr)]">
					<h2 className="text-foreground text-[clamp(40px,7vw,56px)] leading-none font-[750] tracking-[-0.03em]">
						{c("home.projects.title")}
					</h2>
					<p className="text-muted-foreground text-[17px] leading-[1.6] text-pretty">{c("home.projects.intro")}</p>
				</div>

				{/* 01 · Motion — the media IS a live component; the whole card is clickable
				    via a stretched link, the scribble CTA is the keyboard/SR link. */}
				<div className={`group/card relative ${CARD}`}>
					<a
						href={c("home.projects.motion.href")}
						target="_blank"
						rel="noopener noreferrer"
						aria-hidden="true"
						tabIndex={-1}
						className="absolute inset-0 z-[1]"
					/>

					<MediaFrame
						aspect="16 / 10"
						glow={false}
						className="transition-shadow duration-300 group-hover/card:shadow-[0_0_60px_oklch(0.32_0.015_80_/_0.3)]"
					>
						{/* z-[2] lifts the live pattern above the stretched link so hover reaches it. */}
						<div className="absolute inset-0 z-[2]">
							<InteractiveGridPattern squares={[16, 10]} width={40} height={40} className="h-full w-full" />
						</div>
						<div className={SCRIM}>
							<span>{c("home.projects.motion.caption")}</span>
							<span className="flex items-center gap-1.5">
								<span className="bg-accent-work h-1.5 w-1.5 rounded-full" aria-hidden="true" />
								<span>{c("home.projects.motion.case-label")}</span>
							</span>
						</div>
					</MediaFrame>

					<div>
						<Eyebrow block="motion" />
						<Title block="motion" />
						<p className="text-muted-foreground mt-4 text-base leading-[1.65] text-pretty">
							{c("home.projects.motion.description")}
						</p>
						<Tags block="motion" />
						<LineHoverLink
							href={c("home.projects.motion.href")}
							target="_blank"
							rel="noopener noreferrer"
							variant="scribble"
							className="text-foreground relative z-10 mt-6 inline-flex items-center text-[15px] font-semibold"
						>
							<span>{c("home.projects.motion.cta")}</span>
							<span className="text-accent-work ml-2" aria-hidden="true">
								&rarr;
							</span>
						</LineHoverLink>
					</div>
				</div>

				{/* 02 · Overlays — body first, media second; the Dialog is the demo. */}
				<div className={CARD}>
					<div>
						<Eyebrow block="overlays" />
						<Title block="overlays" />
						<p className="text-muted-foreground mt-4 text-base leading-[1.65] text-pretty">
							{c("home.projects.overlays.description")}
						</p>
						<Tags block="overlays" />
						<div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
							<Dialog
								title={c("home.projects.overlays.dialog.title")}
								description={c("home.projects.overlays.dialog.description")}
								trigger={
									<button
										type="button"
										className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-10 cursor-pointer items-center justify-center rounded-md px-5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
									>
										{c("home.projects.overlays.try")}
									</button>
								}
							>
								<p className="text-muted-foreground text-sm leading-relaxed">{c("home.projects.overlays.dialog.body")}</p>
							</Dialog>
							<LineHoverLink
								href={c("home.projects.overlays.href")}
								target="_blank"
								rel="noopener noreferrer"
								variant="scribble"
								className="text-foreground relative z-10 inline-flex items-center text-[15px] font-semibold"
							>
								<span>{c("home.projects.overlays.cta")}</span>
								<span className="text-accent-work ml-2" aria-hidden="true">
									&rarr;
								</span>
							</LineHoverLink>
						</div>
					</div>

					<MediaFrame aspect="16 / 10">
						<img
							src="/tiles/overlays.svg"
							alt=""
							className="absolute inset-0 h-full w-full object-cover"
							loading="lazy"
						/>
						<div className={SCRIM}>
							<span>{c("home.projects.overlays.caption")}</span>
							<span className="flex items-center gap-1.5">
								<span className="bg-accent-work h-1.5 w-1.5 rounded-full" aria-hidden="true" />
								<span>{c("home.projects.overlays.case-label")}</span>
							</span>
						</div>
					</MediaFrame>
				</div>

				{/* 03 · Cameleon — the whole card is a link */}
				<a
					href={c("home.projects.skins.href")}
					target="_blank"
					rel="noopener noreferrer"
					className={`group border-b ${CARD}`}
				>
					<div>
						<Eyebrow block="skins" />
						<Title block="skins" />
						<p className="text-muted-foreground mt-4 text-base leading-[1.65] text-pretty">
							{c("home.projects.skins.description")}
						</p>
					</div>

					<div className="flex items-center justify-end gap-6">
						<Tags block="skins" className="flex flex-wrap justify-end gap-2" />
						<span
							className="border-border/70 text-foreground flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border transition-transform group-hover:translate-x-1"
							aria-hidden="true"
						>
							<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
							</svg>
						</span>
					</div>
				</a>

				<div className="mt-12 text-center">
					<p className="text-muted-foreground mx-auto max-w-2xl text-sm">{c("home.projects.footnote")}</p>
				</div>
			</div>
		</section>
	);
}
