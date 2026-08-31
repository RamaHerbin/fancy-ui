import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";

type BaseProps = {
	/** Button label text */
	text?: string;
	/** Custom CSS class */
	className?: string;
	/** Button content (overrides text prop) */
	children?: ReactNode;
};

export interface InteractiveHoverButtonProps
	extends BaseProps,
		Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> {}

export const InteractiveHoverButton = forwardRef<HTMLButtonElement, InteractiveHoverButtonProps>(
	({ text = "Button", className, children, ...restProps }, ref) => {
		const label = children ?? text;

		/*
		 * Every `transition-*` utility below is prefixed `motion-safe:`, which Tailwind
		 * compiles to `@media (prefers-reduced-motion: no-preference)`. The
		 * `group-hover:` transforms are deliberately left unprefixed: a visitor who
		 * asked for less motion still gets the whole hover state, it simply arrives
		 * instead of travelling. Gating the transforms too would leave the button
		 * looking broken on hover rather than calm.
		 */
		return (
			<button
				ref={ref}
				className={cn(
					"group bg-background relative w-auto cursor-pointer overflow-hidden rounded-full border p-2 px-6 text-center font-semibold",
					className
				)}
				{...restProps}
			>
				<div className="flex items-center gap-2">
					<div className="bg-primary size-2 rounded-lg group-hover:scale-[100.8] motion-safe:transition-all motion-safe:duration-300" />
					<span className="inline-block group-hover:translate-x-12 group-hover:opacity-0 motion-safe:transition-all motion-safe:duration-300">
						{label}
					</span>
				</div>

				<div className="text-primary-foreground absolute top-0 z-10 flex size-full translate-x-12 items-center justify-center gap-2 opacity-0 group-hover:-translate-x-5 group-hover:opacity-100 motion-safe:transition-all motion-safe:duration-300">
					<span>{label}</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M5 12h14" />
						<path d="m12 5 7 7-7 7" />
					</svg>
				</div>
			</button>
		);
	}
);

InteractiveHoverButton.displayName = "InteractiveHoverButton";
