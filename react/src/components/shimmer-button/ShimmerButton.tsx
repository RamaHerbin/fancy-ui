import { forwardRef } from "react";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cn } from "../../utils.js";
import "./shimmer-button.css";

type BaseProps = {
	/** Shimmer highlight color */
	shimmerColor?: string;
	/** Thickness of the shimmer border */
	shimmerSize?: string;
	/** Button border radius */
	borderRadius?: string;
	/** Duration of the shimmer animation cycle */
	shimmerDuration?: string;
	/** Button background color */
	background?: string;
	/** Custom CSS class */
	className?: string;
	/** Button content */
	children?: ReactNode;
};

export type ShimmerButtonProps = BaseProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>;

export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
	(
		{
			className,
			shimmerColor = "#ffffff",
			shimmerSize = "0.05em",
			borderRadius = "100px",
			shimmerDuration = "3s",
			background = "rgba(0, 0, 0, 1)",
			children,
			...restProps
		},
		ref
	) => {
		const styleVars = {
			"--spread": "90deg",
			"--shimmer-color": shimmerColor,
			"--radius": borderRadius,
			"--speed": shimmerDuration,
			"--cut": shimmerSize,
			"--bg": background,
		} as CSSProperties;

		return (
			<button
				ref={ref}
				className={cn(
					"shimmer-button group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden [border-radius:var(--radius)] border border-white/10 px-6 py-3 whitespace-nowrap text-white [background:var(--bg)]",
					"transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
					className
				)}
				style={styleVars}
				{...restProps}
			>
				{/* Shimmer layer */}
				<div className="[container-type:size] absolute inset-0 -z-30 overflow-visible blur-[2px]">
					<div className="shimmer-slide absolute inset-0 [aspect-ratio:1] h-[100cqh] [border-radius:0] [mask:none]">
						<div className="spin-around absolute -inset-full w-auto [translate:0_0] rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]" />
					</div>
				</div>

				{/* Content */}
				{children}

				{/* Inner shadow overlay */}
				<div
					className={cn(
						"insert-0 absolute size-full",
						"rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]",
						"transform-gpu transition-all duration-300 ease-in-out",
						"group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",
						"group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"
					)}
				/>

				{/* Background fill */}
				<div className="absolute [inset:var(--cut)] -z-20 [border-radius:var(--radius)] [background:var(--bg)]" />
			</button>
		);
	}
);

ShimmerButton.displayName = "ShimmerButton";
