import { cn } from "../../utils.js";
import "./ripple.css";

export interface RippleProps {
	baseCircleSize?: number;
	baseCircleOpacity?: number;
	spaceBetweenCircle?: number;
	circleOpacityDowngradeRatio?: number;
	circleClass?: string;
	waveSpeed?: number;
	numberOfCircles?: number;
	className?: string;
}

export function Ripple({
	baseCircleSize = 210,
	baseCircleOpacity = 0.24,
	spaceBetweenCircle = 70,
	circleOpacityDowngradeRatio = 0.03,
	circleClass = "",
	waveSpeed = 80,
	numberOfCircles = 7,
	className = "",
}: RippleProps) {
	const circles = Array.from({ length: numberOfCircles }, (_, i) => ({
		size: baseCircleSize + i * spaceBetweenCircle,
		opacity: baseCircleOpacity - i * circleOpacityDowngradeRatio,
		delay: i * waveSpeed,
		borderStyle: i === numberOfCircles - 1 ? "dashed" : "solid",
	}));

	return (
		<div className={cn("absolute inset-0", className)} aria-hidden="true">
			{circles.map((circle, i) => (
				<div
					key={i}
					className={cn(
						"animate-ripple-circle absolute rounded-full shadow-xl motion-reduce:animate-none",
						circleClass
					)}
					style={{
						width: `${circle.size}px`,
						height: `${circle.size}px`,
						opacity: circle.opacity,
						animationDelay: `${circle.delay}ms`,
						borderStyle: circle.borderStyle,
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%) scale(1)",
						borderWidth: "1px",
					}}
				/>
			))}
		</div>
	);
}
