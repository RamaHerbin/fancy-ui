"use client";

import { useState } from "react";
import { AnimatedTooltip, Dialog, Marquee } from "fancy-ui-react";
import { QuoteCard } from "@/components/QuoteCard";
import { c, cSeries } from "@/content/content";
import { initialsDataUri } from "@/lib/avatar";

interface Quote {
	id: number;
	file: string;
	code: string;
	section: string;
	reference: string;
	href: string;
	excerpt: string;
	body: string[];
	image: string;
}

const QUOTE_IDS = [1, 2, 3, 4];

// Module-level: content is static, and the data URIs must be identical between
// the server render and hydration.
const QUOTES: Quote[] = QUOTE_IDS.map((id) => {
	const file = c(`testimonials.${id}.file`);
	const code = c(`testimonials.${id}.code`);
	const section = c(`testimonials.${id}.section`);
	return {
		id,
		file,
		code,
		section,
		reference: c(`testimonials.${id}.ref`),
		href: c(`testimonials.${id}.href`),
		excerpt: c(`testimonials.${id}.excerpt`),
		body: cSeries(`testimonials.${id}.body`),
		image: initialsDataUri(code, `${file}#${section}`),
	};
});

const TOOLTIP_ITEMS = QUOTES.map((q) => ({
	id: q.id,
	name: q.file,
	designation: q.section,
	image: q.image,
}));

/** Only offer "Read more" when there is genuinely more to read than the excerpt. */
function hasMore(q: Quote): boolean {
	return q.body.length > 1 || q.body[0] !== q.excerpt;
}

export function Testimonials() {
	// A single dialog reused by every card, rather than one per card inside the
	// marquee (which duplicates its children).
	const [active, setActive] = useState<Quote | null>(null);

	return (
		<section id="testimonials" className="px-6 py-20">
			<div className="mx-auto max-w-6xl">
				<div className="mb-16 text-center">
					<h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
						{c("home.testimonials.title")}
					</h2>
					<p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">{c("home.testimonials.subtitle")}</p>
				</div>

				{/* File avatars — hover/focus shows which file and section a quote comes from. */}
				<div className="flex w-full flex-row items-center justify-center [&_img]:border-background">
					<AnimatedTooltip items={TOOLTIP_ITEMS} />
				</div>

				<div className="bg-background relative flex h-[400px] w-full flex-col items-center justify-center overflow-hidden rounded-lg md:shadow-xl">
					<Marquee pauseOnHover className="[--duration:60s] py-1 [--gap:1rem]">
						{QUOTES.map((q) => (
							<QuoteCard
								key={q.id}
								img={q.image}
								file={q.file}
								section={q.section}
								excerpt={q.excerpt}
								reference={q.reference}
								href={q.href}
								onOpen={() => setActive(q)}
								showReadMore={hasMore(q)}
							/>
						))}
					</Marquee>

					{/* Fades the carousel into the page, so they must BE the page colour */}
					<div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r" />
					<div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l" />
				</div>
			</div>

			{/* The full passage. The package Dialog brings the portal, focus trap,
			    scroll lock and Escape/outside-click dismissal. */}
			<Dialog
				open={active !== null}
				onOpenChange={(open) => {
					if (!open) setActive(null);
				}}
				title={active?.file ?? ""}
				description={active ? `${active.section} · ${active.reference}` : undefined}
				footer={
					active ? (
						<div className="flex w-full items-center justify-between">
							<a
								href={active.href}
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-2 transition-colors"
							>
								View on GitHub
							</a>
							<button
								type="button"
								className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
								onClick={() => setActive(null)}
							>
								Close
							</button>
						</div>
					) : undefined
				}
			>
				{active && (
					<div className="space-y-3">
						{active.body.map((paragraph, i) => (
							<p key={i} className="text-sm leading-relaxed">
								{paragraph}
							</p>
						))}
					</div>
				)}
			</Dialog>
		</section>
	);
}
