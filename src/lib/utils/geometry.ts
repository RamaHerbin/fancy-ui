/**
 * Geometry Utilities
 *
 * Helpers for calculating positions, angles, distances, and directions.
 * Used for hover effects, spotlights, and direction-aware components.
 */

// =============================================================================
// Types
// =============================================================================

export interface Point {
	x: number;
	y: number;
}

export interface Size {
	width: number;
	height: number;
}

export interface Rect extends Point, Size {}

export type Direction = "top" | "right" | "bottom" | "left";
export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

// =============================================================================
// Point Operations
// =============================================================================

/**
 * Create a point object
 */
export function point(x: number, y: number): Point {
	return { x, y };
}

/**
 * Add two points
 */
export function addPoints(a: Point, b: Point): Point {
	return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Subtract point b from point a
 */
export function subtractPoints(a: Point, b: Point): Point {
	return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Scale a point by a factor
 */
export function scalePoint(p: Point, factor: number): Point {
	return { x: p.x * factor, y: p.y * factor };
}

/**
 * Get the midpoint between two points
 */
export function midpoint(a: Point, b: Point): Point {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// =============================================================================
// Distance & Angle Calculations
// =============================================================================

/**
 * Calculate the distance between two points
 */
export function distance(a: Point, b: Point): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the squared distance between two points (faster, no sqrt)
 */
export function distanceSquared(a: Point, b: Point): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	return dx * dx + dy * dy;
}

/**
 * Calculate the angle between two points in radians
 */
export function angle(from: Point, to: Point): number {
	return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * Calculate the angle between two points in degrees
 */
export function angleDegrees(from: Point, to: Point): number {
	return (angle(from, to) * 180) / Math.PI;
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
	return (radians * 180) / Math.PI;
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

/**
 * Normalize an angle to 0-360 degrees
 */
export function normalizeAngle(degrees: number): number {
	return ((degrees % 360) + 360) % 360;
}

// =============================================================================
// Mouse & Element Positions
// =============================================================================

/**
 * Get mouse position relative to an element
 */
export function getRelativeMousePosition(event: MouseEvent, element: HTMLElement): Point {
	const rect = element.getBoundingClientRect();
	return {
		x: event.clientX - rect.left,
		y: event.clientY - rect.top,
	};
}

/**
 * Get mouse position as a percentage of element dimensions (0-1)
 */
export function getRelativeMousePercent(event: MouseEvent, element: HTMLElement): Point {
	const rect = element.getBoundingClientRect();
	return {
		x: (event.clientX - rect.left) / rect.width,
		y: (event.clientY - rect.top) / rect.height,
	};
}

/**
 * Get mouse position centered on element (-0.5 to 0.5)
 */
export function getRelativeMouseCentered(event: MouseEvent, element: HTMLElement): Point {
	const percent = getRelativeMousePercent(event, element);
	return {
		x: percent.x - 0.5,
		y: percent.y - 0.5,
	};
}

/**
 * Get the center point of an element
 */
export function getElementCenter(element: HTMLElement): Point {
	const rect = element.getBoundingClientRect();
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2,
	};
}

/**
 * Get the center point of an element relative to itself
 */
export function getElementLocalCenter(element: HTMLElement): Point {
	const rect = element.getBoundingClientRect();
	return {
		x: rect.width / 2,
		y: rect.height / 2,
	};
}

// =============================================================================
// Direction Detection
// =============================================================================

/**
 * Determine which direction mouse entered/exited an element
 */
export function getEntryDirection(event: MouseEvent, element: HTMLElement): Direction {
	const rect = element.getBoundingClientRect();
	const x = event.clientX - rect.left - rect.width / 2;
	const y = event.clientY - rect.top - rect.height / 2;

	// Calculate direction based on angle
	const angleRad = Math.atan2(y, x);
	const angleDeg = normalizeAngle((angleRad * 180) / Math.PI);

	if (angleDeg >= 315 || angleDeg < 45) return "right";
	if (angleDeg >= 45 && angleDeg < 135) return "bottom";
	if (angleDeg >= 135 && angleDeg < 225) return "left";
	return "top";
}

/**
 * Get the opposite direction
 */
export function getOppositeDirection(direction: Direction): Direction {
	const opposites: Record<Direction, Direction> = {
		top: "bottom",
		right: "left",
		bottom: "top",
		left: "right",
	};
	return opposites[direction];
}

/**
 * Get the nearest corner to a point within an element
 */
export function getNearestCorner(point: Point, size: Size): Corner {
	const centerX = size.width / 2;
	const centerY = size.height / 2;

	const isTop = point.y < centerY;
	const isLeft = point.x < centerX;

	if (isTop && isLeft) return "top-left";
	if (isTop && !isLeft) return "top-right";
	if (!isTop && isLeft) return "bottom-left";
	return "bottom-right";
}

// =============================================================================
// Rect & Bounds
// =============================================================================

/**
 * Check if a point is inside a rectangle
 */
export function isPointInRect(p: Point, rect: Rect): boolean {
	return (
		p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height
	);
}

/**
 * Get the bounding rect of an element
 */
export function getRect(element: HTMLElement): Rect {
	const rect = element.getBoundingClientRect();
	return {
		x: rect.left,
		y: rect.top,
		width: rect.width,
		height: rect.height,
	};
}

/**
 * Expand a rect by a given amount
 */
export function expandRect(rect: Rect, amount: number): Rect {
	return {
		x: rect.x - amount,
		y: rect.y - amount,
		width: rect.width + amount * 2,
		height: rect.height + amount * 2,
	};
}

// =============================================================================
// Transforms
// =============================================================================

/**
 * Calculate rotation transform based on mouse position
 * Returns rotation values suitable for 3D transforms
 */
export function calculateTiltTransform(
	mousePos: Point,
	elementSize: Size,
	maxRotation: number = 15
): { rotateX: number; rotateY: number } {
	const centerX = elementSize.width / 2;
	const centerY = elementSize.height / 2;

	const percentX = (mousePos.x - centerX) / centerX;
	const percentY = (mousePos.y - centerY) / centerY;

	return {
		rotateX: -percentY * maxRotation,
		rotateY: percentX * maxRotation,
	};
}

/**
 * Calculate spotlight position for gradient effects
 */
export function calculateSpotlightPosition(
	mousePos: Point,
	elementSize: Size
): { x: string; y: string } {
	const percentX = (mousePos.x / elementSize.width) * 100;
	const percentY = (mousePos.y / elementSize.height) * 100;

	return {
		x: `${percentX}%`,
		y: `${percentY}%`,
	};
}
