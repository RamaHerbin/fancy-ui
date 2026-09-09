import { c } from "@/content/content";

const PILL =
	"ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground group inline-flex h-11 items-center justify-center rounded-md border px-8 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

export function Contact() {
	return (
		<footer id="contact" className="border-border/40 border-t px-6 py-16">
			<div className="mx-auto max-w-4xl">
				<div className="flex flex-col items-center justify-center space-y-8 text-center">
					<div className="space-y-4">
						<h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
							{c("home.contact.title")}
						</h2>
						<p className="text-muted-foreground max-w-2xl text-lg">{c("home.contact.subtitle")}</p>
					</div>

					<div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
						<a href={c("home.contact.npm.href")} target="_blank" rel="noopener noreferrer" className={PILL}>
							<svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7l8-4 8 4-8 4-8-4z" />
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10l8 4 8-4V7M12 11v10" />
							</svg>
							<span>{c("home.contact.npm.label")}</span>
						</a>

						<a href={c("home.contact.github.href")} target="_blank" rel="noopener noreferrer" className={PILL}>
							<svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
							</svg>
							<span>{c("home.contact.github.label")}</span>
						</a>

						<a href={c("home.contact.docs.href")} target="_blank" rel="noopener noreferrer" className={PILL}>
							<svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.5A3.5 3.5 0 008.5 3H3v15h6a3 3 0 013 3m0-14.5A3.5 3.5 0 0115.5 3H21v15h-6a3 3 0 00-3 3m0-14.5V21" />
							</svg>
							<span>{c("home.contact.docs.label")}</span>
						</a>
					</div>

					<div className="text-muted-foreground">
						<code className="bg-muted text-foreground rounded-md px-3 py-1.5 font-mono text-sm">{c("home.contact.install")}</code>
					</div>
				</div>
			</div>
		</footer>
	);
}
