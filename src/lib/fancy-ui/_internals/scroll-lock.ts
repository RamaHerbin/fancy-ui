// Locks the page's own scroll while one or more overlays are open.
//
// Reference-counted: `lockScroll()` can be called any number of times while
// overlays nest (a Popover opened from inside a Dialog acquires its own
// lock on top of the Dialog's), and the page only unlocks once every caller
// has released. The body's scroll-affecting styles are only ever touched by
// the FIRST acquire and the LAST release — every acquire in between is a
// free ride on the lock already in place, and every release before the last
// is a no-op on the DOM.
//
// Technique: `position: fixed` on `<body>`, offset by the current scroll
// position, rather than plain `overflow: hidden`. Plain `overflow: hidden`
// does not reliably stop touch-driven scrolling on iOS Safari — the body
// can still rubber-band under a finger even though its scrollbar is gone.
// Pinning the body in place with `position: fixed` blocks that too, but it
// also means the page's scroll position is lost the instant `position`
// leaves `static` (the viewport jumps to its top-left), so the position has
// to be captured before locking and restored by hand after unlocking — the
// cost of choosing this technique over the simpler one.
//
// Scrollbar compensation: removing the scrollbar reflows the page — content
// widens by however many pixels the scrollbar used to occupy, and
// everything shifts sideways. Padding the body by that same width keeps the
// layout still. Measured as `window.innerWidth - document.documentElement
// .clientWidth`; on a platform with overlay scrollbars (macOS by default,
// most mobile browsers) that measures zero, so the padding write is skipped
// entirely rather than adding a stray `padding-right: 0px`.

interface LockedState {
	scrollY: number;
	bodyPosition: string;
	bodyTop: string;
	bodyLeft: string;
	bodyRight: string;
	bodyWidth: string;
	bodyOverflow: string;
	bodyPaddingRight: string;
}

let lockCount = 0;
let saved: LockedState | null = null;

/**
 * Acquires the scroll lock and returns a function that releases this
 * specific acquisition. Safe to call from SSR (returns a no-op release).
 * The returned function is idempotent — calling it more than once only
 * decrements the shared count on its first call.
 */
export function lockScroll(): () => void {
	if (typeof document === "undefined") {
		return () => {};
	}

	if (lockCount === 0) {
		const body = document.body;
		const root = document.documentElement;
		const scrollbarGutter = window.innerWidth - root.clientWidth;
		const currentPaddingRight = parseFloat(getComputedStyle(body).paddingRight) || 0;

		saved = {
			scrollY: window.scrollY,
			bodyPosition: body.style.position,
			bodyTop: body.style.top,
			bodyLeft: body.style.left,
			bodyRight: body.style.right,
			bodyWidth: body.style.width,
			bodyOverflow: body.style.overflow,
			bodyPaddingRight: body.style.paddingRight,
		};

		body.style.position = "fixed";
		body.style.top = `-${saved.scrollY}px`;
		body.style.left = "0";
		body.style.right = "0";
		body.style.width = "100%";
		body.style.overflow = "hidden";
		// Overlay-scrollbar platforms measure a zero gutter — leaving
		// padding-right untouched there instead of writing "0px" over
		// whatever the page's own styles already set.
		if (scrollbarGutter > 0) {
			body.style.paddingRight = `${currentPaddingRight + scrollbarGutter}px`;
		}
	}

	lockCount += 1;
	let released = false;

	return function release() {
		if (released) return;
		released = true;
		lockCount -= 1;
		if (lockCount > 0) return;

		const body = document.body;
		const state = saved;
		saved = null;
		if (!state) return;

		body.style.position = state.bodyPosition;
		body.style.top = state.bodyTop;
		body.style.left = state.bodyLeft;
		body.style.right = state.bodyRight;
		body.style.width = state.bodyWidth;
		body.style.overflow = state.bodyOverflow;
		body.style.paddingRight = state.bodyPaddingRight;
		window.scrollTo(0, state.scrollY);
	};
}
