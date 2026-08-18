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

export type InteractiveHoverButtonProps = BaseProps &
	Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>;

export const InteractiveHoverButton = forwardRef<HTMLButtonElement, InteractiveHoverButtonProps>(
	({ text = "Button", className, children, ...restProps }, ref) => {
		const label = children ?? text;

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
					<div className="bg-primary size-2 rounded-lg transition-all duration-300 group-hover:scale-[100.8]" />
					<span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
						{label}
					</span>
				</div>

				<div className="text-primary-foreground absolute top-0 z-10 flex size-full translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:-translate-x-5 group-hover:opacity-100">
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
