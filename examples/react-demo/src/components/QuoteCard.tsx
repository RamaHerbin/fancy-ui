import { cn } from "fancy-ui-react";

interface Props {
	img: string;
	file: string;
	section: string;
	excerpt: string;
	reference: string;
	href: string;
	/** opens the full quote (clicking the card, or the "Read more" button) */
	onOpen?: () => void;
	/** show the "Read more" button (only when there's more than the excerpt) */
	showReadMore?: boolean;
	className?: string;
}

/** One quoted passage: file avatar, file name, section, the excerpt. */
export function QuoteCard({ img, file, section, excerpt, reference, href, onOpen, showReadMore = false, className }: Props) {
	return (
		<figure
			onClick={onOpen}
			className={cn(
				"relative block w-95 overflow-hidden rounded-xl border p-4 transition-all duration-300",
				// A wash of the theme's ink over the page: the two alphas genuinely
				// differ (1% reads on white, 10% is needed on near-black).
				"border-border bg-foreground/[.01] hover:bg-foreground/[.05]",
				"dark:bg-foreground/[.10] dark:hover:bg-foreground/[.15]",
				onOpen && "cursor-pointer",
				className
			)}
		>
			<div className="flex flex-row items-center gap-2">
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(e) => e.stopPropagation()}
					className="shrink-0 cursor-pointer"
					aria-label={`Open ${file} on GitHub`}
				>
					<img src={img} alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
				</a>
				<div className="flex flex-col">
					<div className="text-foreground text-sm font-medium">{file}</div>
					<p className="text-muted-foreground text-xs font-medium">{section}</p>
				</div>
				<span className="text-muted-foreground ml-auto font-mono text-xs">{reference}</span>
			</div>
			<blockquote className="mt-2 text-sm">{excerpt}</blockquote>

			{showReadMore && (
				<button
					type="button"
					className="text-muted-foreground hover:text-foreground mt-3 cursor-pointer text-xs font-medium underline underline-offset-2 transition-colors"
					onClick={(e) => {
						e.stopPropagation();
						onOpen?.();
					}}
				>
					Read more
				</button>
			)}

			<figcaption className="sr-only">
				Quote from {file}, {section}
			</figcaption>
		</figure>
	);
}
