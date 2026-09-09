/**
 * Fixed progressive-blur band at the bottom of the viewport: content scrolling
 * out fades into a soft backdrop blur. The alpha mask is theme-independent; the
 * tint follows the theme background token.
 */
export function ScrollBlurOverlay() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-24 isolate transform-gpu will-change-transform bg-background/90 backdrop-blur-[4px] transition-colors duration-300 [mask-image:linear-gradient(to_bottom,transparent_0%,black_100%)]"
		/>
	);
}
