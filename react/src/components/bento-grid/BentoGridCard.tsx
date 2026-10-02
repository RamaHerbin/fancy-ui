import type { HTMLAttributes, ReactNode } from "react";
import { BentoFrame } from "./BentoFrame.js";

export interface BentoGridCardProps extends HTMLAttributes<HTMLDivElement> {
	name: string;
	description: string;
	href: string;
	cta: string;
	className?: string;
	icon?: ReactNode;
	background?: ReactNode;
}

export function BentoGridCard({
	name,
	description: desc,
	href,
	cta,
	className = "",
	icon,
	background,
	...rest
}: BentoGridCardProps) {
	return (
		<BentoFrame
			className={["group col-span-3", className].join(" ")}
			panelClass="justify-end"
			{...rest}
		>
			{/* Not aria-hidden and not inert: the slot can hold real, interactive content, as it always could. */}
			{background && <div className="absolute inset-0 -z-10 overflow-hidden">{background}</div>}

			<div className="bento-lift pointer-events-none relative z-10 flex flex-col gap-1 p-6">
				{icon && <div className="bento-icon mb-3 size-11 [&_svg]:size-5">{icon}</div>}
				<h3 className="text-lg font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
					{name}
				</h3>
				<p className="max-w-lg text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
					{desc}
				</p>
				<a
					href={href}
					className="bento-cta pointer-events-auto mt-3 inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-[var(--bento-accent,#8e9cff)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:text-neutral-100"
				>
					{cta}
					<svg
						aria-hidden="true"
						viewBox="0 0 16 16"
						className="size-3.5 text-[var(--bento-accent,#8e9cff)]"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M3 8h9.5M8.5 4l4 4-4 4" />
					</svg>
				</a>
			</div>
		</BentoFrame>
	);
}
