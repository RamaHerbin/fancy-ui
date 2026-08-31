import { cn } from "../../utils.js";
import "./logo-cloud.css";

export interface Logo {
	name: string;
	path: string;
}

export interface AnimatedLogoCloudProps {
	/** Additional CSS classes for the scrolling container */
	className?: string;
	/** Optional title displayed above the logos */
	title?: string;
	/** Array of logos with name and image path */
	logos?: Logo[];
}

export function AnimatedLogoCloud({ className, title, logos = [] }: AnimatedLogoCloudProps) {
	return (
		<div className="w-full py-12">
			<div className="mx-auto w-full px-4 md:px-8">
				{title ? (
					<div className="text-muted-foreground text-center font-medium">{title}</div>
				) : null}
				<div
					className={cn(
						"logo-cloud-mask group relative mt-6 flex gap-6 overflow-hidden p-2",
						className
					)}
				>
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="logo-cloud-scroll flex shrink-0 flex-row justify-around gap-6">
							{logos.map((logo, j) => (
								<img
									key={j}
									src={logo.path}
									alt={logo.name}
									className="h-10 w-28 px-2 brightness-0 dark:invert"
								/>
							))}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
