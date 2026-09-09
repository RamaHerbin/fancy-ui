import { NumberTicker } from "fancy-ui-react";
import { c, cList } from "@/content/content";

export function About() {
	return (
		<section id="about" className="px-6 py-20">
			<div className="mx-auto max-w-4xl">
				<div className="mb-16 text-center">
					<h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
						{c("home.about.title")}
					</h2>
				</div>

				<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
					<div className="space-y-6">
						<p className="text-muted-foreground text-lg leading-relaxed sm:text-xl">
							<span>{c("home.about.intro")}</span>{" "}
							<a
								href={c("home.hero.sibling.href")}
								target="_blank"
								rel="noopener noreferrer"
								className="text-foreground font-semibold underline-offset-4 hover:underline"
								aria-label={`Open ${c("home.hero.sibling.label")} on npm in a new tab`}
							>
								{c("home.hero.sibling.label")}
							</a>
							<span>{c("home.about.sibling-tail")}</span>{" "}
							<code className="text-foreground rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
								{c("home.about.subpath")}
							</code>{" "}
							<span>{c("home.about.subpath-tail")}</span>
						</p>

						<p className="text-muted-foreground text-lg leading-relaxed sm:text-xl">{c("home.about.paragraph-2")}</p>

						<p className="text-muted-foreground text-lg leading-relaxed sm:text-xl">{c("home.about.paragraph-3")}</p>
					</div>

					{/* The portrait slot becomes a spec card: the component count ticks up
					    when it scrolls into view. */}
					<div className="flex justify-center lg:justify-end">
						<div className="border-muted-foreground/20 bg-surface-raised flex h-96 w-80 flex-col justify-between overflow-hidden rounded-lg border-2 border-dashed p-8 shadow-lg">
							<div>
								<NumberTicker value={144} className="text-foreground text-7xl font-bold tracking-tight" />
								<p className="text-muted-foreground mt-1 font-mono text-xs tracking-[0.14em] uppercase">
									{c("home.about.card.label")}
								</p>
							</div>
							<ul className="text-muted-foreground space-y-2 text-sm">
								{cList("home.about.card.items").map((item) => (
									<li key={item} className="flex items-center gap-2">
										<span className="bg-accent-work h-1.5 w-1.5 rounded-full" aria-hidden="true" />
										{item}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
