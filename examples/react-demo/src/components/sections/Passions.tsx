import type { ReactNode } from "react";
import { RainbowButton, SoundToggle } from "fancy-ui-react";
import { Badge, Button, FancyProvider, Switch, brutalSkin, terminalSkin } from "fancy-ui-react/cameleon";
import { c, cList } from "@/content/content";

function SpeakerIcon() {
	return (
		<svg className="text-foreground h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5L6 9H2v6h4l5 4V5z" />
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.5 8.5a5 5 0 010 7M19 5a9 9 0 010 14" />
		</svg>
	);
}

function SwatchIcon() {
	return (
		<svg className="text-foreground h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<rect x="3" y="3" width="8" height="8" rx="1.5" strokeWidth="2" />
			<rect x="13" y="3" width="8" height="8" rx="1.5" strokeWidth="2" />
			<rect x="3" y="13" width="8" height="8" rx="1.5" strokeWidth="2" />
			<rect x="13" y="13" width="8" height="8" rx="1.5" strokeWidth="2" />
		</svg>
	);
}

function GearGroup({ id, icon }: { id: string; icon: ReactNode }) {
	return (
		<div className="space-y-4">
			<h4 className="text-foreground flex items-center text-lg font-semibold">
				{icon}
				<span>{c(`home.passions.gear.${id}.title`)}</span>
			</h4>
			<ul className="text-muted-foreground space-y-2">
				{cList(`home.passions.gear.${id}.items`).map((item) => (
					<li key={item}>
						&#8226; <span className="font-mono text-[0.95em]">{item}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

const SMALL_ICON = "mr-2 h-5 w-5";

export function Passions() {
	return (
		<section id="passions" className="px-6 py-20">
			<div className="mx-auto max-w-6xl">
				<div className="mb-16 text-center">
					<h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
						{c("home.passions.title")}
					</h2>
					<p className="text-muted-foreground mx-auto max-w-2xl text-lg">{c("home.passions.subtitle")}</p>
				</div>

				<div className="mb-16 grid grid-cols-1 gap-12 lg:grid-cols-2">
					{/* Sound — the toggle is the package's; the button stays silent until it is on. */}
					<div className="space-y-6">
						<div className="flex items-center space-x-4">
							<div className="bg-foreground/10 flex h-12 w-12 items-center justify-center rounded-full">
								<SpeakerIcon />
							</div>
							<h3 className="text-foreground text-2xl font-bold">{c("home.passions.sound.title")}</h3>
						</div>

						<p className="text-muted-foreground text-lg leading-relaxed">{c("home.passions.sound.description")}</p>

						<div className="border-border/20 bg-surface-raised flex flex-wrap items-center gap-4 rounded-lg border p-4">
							<SoundToggle size="lg" showLabel />
							<RainbowButton sound className="h-10 px-5 text-sm">
								{c("home.passions.sound.cta")}
							</RainbowButton>
							<span className="text-muted-foreground text-sm">{c("home.passions.sound.hint")}</span>
						</div>

						<div className="flex flex-wrap gap-2">
							{cList("home.passions.sound.tags").map((t) => (
								<span key={t} className="bg-foreground/10 text-foreground rounded-full px-3 py-1 font-mono text-sm">
									{t}
								</span>
							))}
						</div>
					</div>

					{/* Cameleon — two live panels where the photo grid used to be. */}
					<div className="space-y-6">
						<div className="flex items-center space-x-4">
							<div className="bg-foreground/10 flex h-12 w-12 items-center justify-center rounded-full">
								<SwatchIcon />
							</div>
							<h3 className="text-foreground text-2xl font-bold">{c("home.passions.cameleon.title")}</h3>
						</div>

						<p className="text-muted-foreground text-lg leading-relaxed">{c("home.passions.cameleon.description")}</p>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{[
								{ name: c("home.passions.cameleon.panel.brutal"), skin: brutalSkin },
								{ name: c("home.passions.cameleon.panel.terminal"), skin: terminalSkin },
							].map(({ name, skin }) => (
								<div key={name} className="border-border/20 overflow-hidden rounded-lg border">
									<FancyProvider skin={skin} manageColorScheme className="flex h-full flex-col gap-3 p-4">
										<div className="flex items-center justify-between gap-2">
											<Badge>{name}</Badge>
											<Switch aria-label={`${name} skin switch`} />
										</div>
										<Button>{c("home.passions.cameleon.panel.button")}</Button>
									</FancyProvider>
								</div>
							))}
						</div>

						<div className="flex flex-wrap gap-2">
							{cList("home.passions.cameleon.tags").map((t) => (
								<span key={t} className="bg-foreground/10 text-foreground rounded-full px-3 py-1 text-sm">
									{t}
								</span>
							))}
						</div>
					</div>
				</div>

				{/* Under the hood */}
				<div id="gear" className="border-border/20 border-t pt-16">
					<div className="mb-12 text-center">
						<h3 className="text-foreground mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
							{c("home.passions.gear.title")}
						</h3>
						<p className="text-muted-foreground">{c("home.passions.gear.subtitle")}</p>
					</div>

					<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						<GearGroup
							id="entries"
							icon={
								<svg className={SMALL_ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7l8-4 8 4-8 4-8-4z" />
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10l8 4 8-4V7M12 11v10" />
								</svg>
							}
						/>
						<GearGroup
							id="compat"
							icon={
								<svg className={SMALL_ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
								</svg>
							}
						/>
						<GearGroup
							id="a11y"
							icon={
								<svg className={SMALL_ICON} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<circle cx="12" cy="5" r="2" strokeWidth="2" />
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 9h16M12 9v6M12 15l-3 6M12 15l3 6" />
								</svg>
							}
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
