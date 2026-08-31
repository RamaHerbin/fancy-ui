import { cn } from "../../utils.js";
import type { Logo } from "./AnimatedLogoCloud.js";

export interface IconLogoCloudProps {
	/** Additional CSS classes for the grid container */
	className?: string;
	/** Optional title displayed above the logos */
	title?: string;
	/** Array of logos with name and image path */
	logos?: Logo[];
}

export function IconLogoCloud({ className, title, logos = [] }: IconLogoCloudProps) {
	return (
		<div className="w-full py-12">
			<div className="flex w-full flex-col items-center justify-center gap-6 px-4 md:px-8">
				{title ? <div className="text-muted-foreground font-medium">{title}</div> : null}
				<div className={cn("grid grid-cols-3 md:grid-cols-8 lg:grid-cols-8", className)}>
					{logos.map((logo, i) => (
						<img
							key={i}
							src={logo.path}
							alt={logo.name}
							className="h-7 w-12 px-2 brightness-0 dark:invert"
						/>
					))}
				</div>
			</div>
		</div>
	);
}
