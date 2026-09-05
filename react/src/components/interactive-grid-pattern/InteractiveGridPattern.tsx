import { memo, useCallback, useState } from "react";
import { cn } from "../../utils.js";
import "./interactive-grid-pattern.css";

export interface InteractiveGridPatternProps {
	/** Additional CSS classes for the SVG container */
	className?: string;
	/** Additional CSS classes for individual squares */
	squaresClassName?: string;
	/** Additional CSS classes controlling the square outline color */
	strokeClassName?: string;
	/** Width of each square in pixels */
	width?: number;
	/** Height of each square in pixels */
	height?: number;
	/** Grid dimensions [columns, rows] */
	squares?: [number, number];
	/** Whether squares respond to hover. When false, renders a static graph-paper grid with no listeners */
	interactive?: boolean;
}

interface SquareProps {
	index: number;
	x: number;
	y: number;
	width: number;
	height: number;
	hovered: boolean;
	strokeClassName?: string;
	squaresClassName?: string;
	onEnter?: (index: number) => void;
	onLeave?: () => void;
}

/**
 * One grid cell. Memoised so a pointer move re-renders only the squares whose fill
 * actually flipped instead of the whole grid (cols * rows rects on every event).
 */
const Square = memo(function Square({
	index,
	x,
	y,
	width,
	height,
	hovered,
	strokeClassName,
	squaresClassName,
	onEnter,
	onLeave,
}: SquareProps) {
	return (
		<rect
			x={x}
			y={y}
			width={width}
			height={height}
			className={cn(
				"interactive-grid-square transition-all duration-100 ease-in-out",
				strokeClassName,
				hovered ? "fill-gray-300/30" : "fill-transparent",
				squaresClassName
			)}
			onMouseEnter={onEnter ? () => onEnter(index) : undefined}
			onMouseLeave={onLeave}
		/>
	);
});

export function InteractiveGridPattern({
	className,
	squaresClassName,
	strokeClassName = "stroke-gray-400/30",
	width = 40,
	height = 40,
	squares = [24, 24],
	interactive = true,
}: InteractiveGridPatternProps) {
	const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);

	const cols = squares[0];
	const rows = squares[1];
	const totalSquares = cols * rows;
	const gridWidth = width * cols;
	const gridHeight = height * rows;

	function getX(index: number) {
		return (index % cols) * width;
	}

	function getY(index: number) {
		return Math.floor(index / cols) * height;
	}

	const handleEnter = useCallback((index: number) => setHoveredSquare(index), []);
	const handleLeave = useCallback(() => setHoveredSquare(null), []);

	return (
		<svg
			width={gridWidth}
			height={gridHeight}
			className={cn(
				"interactive-grid-pattern absolute inset-0 h-full w-full border border-gray-400/30",
				className
			)}
		>
			{Array.from({ length: totalSquares }, (_, index) => (
				<Square
					key={index}
					index={index}
					x={getX(index)}
					y={getY(index)}
					width={width}
					height={height}
					hovered={hoveredSquare === index}
					strokeClassName={strokeClassName}
					squaresClassName={squaresClassName}
					onEnter={interactive ? handleEnter : undefined}
					onLeave={interactive ? handleLeave : undefined}
				/>
			))}
		</svg>
	);
}
