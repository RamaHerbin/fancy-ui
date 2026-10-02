export interface AnimatedBeamProps {
	class?: string;
	containerRef: HTMLElement;
	fromRef: HTMLElement;
	toRef: HTMLElement;
	/** Vertical bend of the fibre in px (the quadratic control point sits this far above the start). */
	curvature?: number;
	/** Send the light from `toRef` back to `fromRef` (the bloom then lands on `fromRef`). */
	reverse?: boolean;
	/** Fibre colour. Unset = theme-aware glass (dark on light, pale on dark). */
	pathColor?: string;
	/** Width of the fibre core and of the light packet, in px. */
	pathWidth?: number;
	/** Opacity of the fibre. Unset = 1 for the theme-aware glass, 0.2 when `pathColor` is set. */
	pathOpacity?: number;
	/** Colour of the packet's leading edge (its white-hot head is this colour mixed with white). */
	gradientStartColor?: string;
	/** Colour of the far end of the dispersing tail, and of the arrival bloom. */
	gradientStopColor?: string;
	/** Seconds before the first packet leaves. */
	delay?: number;
	/** Seconds per packet cycle. Unset = derived from `seed` (between 4 and 7). */
	duration?: number;
	startXOffset?: number;
	startYOffset?: number;
	endXOffset?: number;
	endYOffset?: number;
	/** Packets in flight at once, spaced evenly over one cycle. */
	pulses?: number;
	/** Length of the packet's tail as a fraction of the fibre (0.05–0.9). */
	tail?: number;
	/** Strength of the soft glow under the packet and the arrival bloom (0–1). */
	glow?: number;
	/** Seed for the default `duration`, so server and browser agree. */
	seed?: number;
}
