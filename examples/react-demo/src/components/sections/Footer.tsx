import { BlurReveal } from "fancy-ui-react";
import { c } from "@/content/content";

export function Footer({ version }: { version: string }) {
	return (
		<>
			<footer className="border-border/40 text-muted-foreground bg-background w-full border-t py-8 text-center text-sm">
				<div className="space-y-3">
					<p className="text-muted-foreground/80">
						&copy; {new Date().getFullYear()} <span>{c("shared.footer.copyright")}</span>
					</p>

					{/* The version pill sits where the carbon badge does on the reference site. */}
					<BlurReveal delay={0.15} duration={0.6} className="inline-block">
						<div className="border-border/20 bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] backdrop-blur-md transition">
							<span className="bg-accent-work h-1.5 w-1.5 rounded-full" aria-hidden="true" />
							<span className="text-muted-foreground tracking-tight">
								<span className="whitespace-nowrap">{c("shared.footer.version.label")}</span>{" "}
								<span className="text-foreground font-mono">v{version}</span>
							</span>
							<a
								href={c("shared.footer.version.link.href")}
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground/60 decoration-border/20 hover:text-muted-foreground hover:decoration-border/40 ml-1 whitespace-nowrap underline underline-offset-2 transition"
							>
								{c("shared.footer.version.link.label")}
							</a>
						</div>
					</BlurReveal>
				</div>
			</footer>

			<a
				href={c("shared.footer.made-with.href")}
				target="_blank"
				rel="noopener noreferrer"
				className="border-border/40 bg-background/80 text-muted-foreground/70 hover:text-foreground hover:border-border fixed bottom-4 left-4 z-50 rounded-lg border px-3 py-1.5 text-xs backdrop-blur-sm transition-colors"
			>
				<span>{c("shared.footer.made-with.text")}</span>{" "}
				<span className="text-accent-foreground font-medium">{c("shared.footer.made-with.highlight")}</span>
			</a>
		</>
	);
}
