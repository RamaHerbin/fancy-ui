import type { HTMLAttributes, ReactNode } from "react";
import { BentoFrame } from "./BentoFrame.js";

export interface BentoGridItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
	className?: string;
	header?: ReactNode;
	icon?: ReactNode;
	title?: ReactNode;
	description?: ReactNode;
}

export function BentoGridItem({
	className = "",
	header,
	icon,
	title,
	description,
	...rest
}: BentoGridItemProps) {
	return (
		<BentoFrame
			className={["group/bento row-span-1", className].join(" ")}
			panelClass="justify-between gap-4 p-4"
			{...rest}
		>
			{header}
			<div className="bento-lift relative">
				{(icon || title) && (
					<div className="mb-1.5 flex items-center gap-2.5">
						{icon && <div className="bento-icon size-8 [&_svg]:size-4">{icon}</div>}
						{title && (
							<div className="min-w-0 font-sans text-[15px] font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
								{title}
							</div>
						)}
					</div>
				)}
				{description && (
					<div className="font-sans text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
						{description}
					</div>
				)}
			</div>
		</BentoFrame>
	);
}
