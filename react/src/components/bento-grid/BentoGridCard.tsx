import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";

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
		<div
			className={cn(
				"group relative col-span-3 flex flex-col justify-end overflow-hidden rounded-xl",
				"bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
				"transform-gpu dark:bg-black dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
				className
			)}
			{...rest}
		>
			{background}

			<div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
				<div className="size-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75">
					{icon}
				</div>
				<h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">{name}</h3>
				<p className="max-w-lg text-neutral-400">{desc}</p>
			</div>

			<div className="pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
				<a
					href={href}
					className="pointer-events-auto inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
				>
					{cta} &rarr;
				</a>
			</div>
			<div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
		</div>
	);
}
