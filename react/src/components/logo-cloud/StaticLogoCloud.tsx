import type { CSSProperties } from "react";
import { cn } from "../../utils.js";
import type { Logo } from "./AnimatedLogoCloud.js";

export interface Wordmark {
	/** The brand/wordmark text */
	name: string;
	/** Font size in pixels */
	size: number;
	/** Font weight */
	weight: 400 | 700 | 900;
	/** Letter-spacing in pixels */
	tracking?: number;
	/** Render in italic */
	italic?: boolean;
	/** Use a serif font stack instead of the default */
	serif?: boolean;
	/** CSS text-transform */
	transform?: "uppercase" | "lowercase";
}

export interface StaticLogoCloudProps {
	/** Additional CSS classes for the grid container */
	className?: string;
	/** Optional title displayed above the logos */
	title?: string;
	/** Array of logos with name and image path */
	logos?: Logo[];
	/** When provided, renders a static typographic row of wordmarks instead of image logos */
	wordmarks?: Wordmark[];
}

export function StaticLogoCloud({
	className,
	title,
	logos = [],
	wordmarks,
}: StaticLogoCloudProps) {
	return (
		<div className="w-full py-12">
			<div className="flex w-full flex-col items-center justify-center gap-4 px-4 md:px-8">
				{title ? (
					<div className="text-muted-foreground font-medium uppercase">{title}</div>
				) : null}
				{wordmarks ? (
					<div
						className={cn(
							"flex flex-wrap items-center justify-around gap-x-9 gap-y-5",
							className
						)}
					>
						{wordmarks.map((mark, i) => {
							const style: CSSProperties = {
								fontSize: `${mark.size}px`,
								fontWeight: mark.weight,
								letterSpacing: mark.tracking !== undefined ? `${mark.tracking}px` : undefined,
								fontStyle: mark.italic ? "italic" : undefined,
								fontFamily: mark.serif ? 'Georgia, "Times New Roman", serif' : undefined,
								textTransform: mark.transform,
								opacity: 0.85,
							};
							return (
								<span key={i} style={style}>
									{mark.name}
								</span>
							);
						})}
					</div>
				) : (
					<div className={cn("grid grid-cols-3 gap-x-4 md:grid-cols-5 lg:grid-cols-8", className)}>
						{logos.map((logo, i) => (
							<img
								key={i}
								src={logo.path}
								alt={logo.name}
								className="h-10 w-28 px-2 brightness-0 dark:invert"
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
