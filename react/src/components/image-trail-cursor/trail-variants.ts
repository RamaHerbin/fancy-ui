import { gsap } from "gsap";

// =============================================================================
// Types
// =============================================================================

export type VariantType =
	| "type1"
	| "type2"
	| "type3"
	| "type4"
	| "type5"
	| "type6"
	| "type7"
	| "type8"
	| "pixelated";

export interface ImageTrailVariant {
	destroy(): void;
}

// =============================================================================
// Helpers
// =============================================================================

function lerp(a: number, b: number, n: number): number {
	return (1 - n) * a + n * b;
}

function getLocalPointerPos(e: MouseEvent | TouchEvent, rect: DOMRect): { x: number; y: number } {
	let clientX = 0;
	let clientY = 0;
	if ("touches" in e && e.touches.length > 0) {
		const touch = e.touches[0]!;
		clientX = touch.clientX;
		clientY = touch.clientY;
	} else if ("clientX" in e) {
		clientX = e.clientX;
		clientY = e.clientY;
	}
	return {
		x: clientX - rect.left,
		y: clientY - rect.top,
	};
}

function getMouseDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
	const dx = p1.x - p2.x;
	const dy = p1.y - p2.y;
	return Math.hypot(dx, dy);
}

function getNewPosition(position: number, offset: number, arr: ImageItem[]) {
	const realOffset = Math.abs(offset) % arr.length;
	if (position - realOffset >= 0) {
		return position - realOffset;
	} else {
		return arr.length - (realOffset - position);
	}
}

// =============================================================================
// ImageItem
// =============================================================================

export class ImageItem {
	public DOM: { el: HTMLDivElement; inner: HTMLDivElement | null } = {
		el: null as unknown as HTMLDivElement,
		inner: null,
	};
	// Port divergence: `private` where the Svelte source says `public`. gsap declares
	// `TweenVars` inside a GLOBAL `namespace gsap` with no module-level export, so a
	// public `gsap.TweenVars` member emits a bare `gsap.` reference into the shipped
	// .d.ts while tsc drops the value-only `import { gsap }` — consumers then hit
	// TS2503 "Cannot find namespace 'gsap'". A private member emits no type at all.
	// Read only by initEvents() below, so nothing outside this class loses access.
	private defaultStyle: gsap.TweenVars = { scale: 1, x: 0, y: 0, opacity: 0 };
	public rect: DOMRect | null = null;
	private resizeHandler: (() => void) | null = null;

	constructor(DOM_el: HTMLDivElement) {
		this.DOM.el = DOM_el;
		this.DOM.inner = this.DOM.el.querySelector(".content__img-inner");
		this.getRect();
		this.initEvents();
	}

	private initEvents() {
		this.resizeHandler = () => {
			gsap.set(this.DOM.el, this.defaultStyle);
			this.getRect();
		};
		window.addEventListener("resize", this.resizeHandler);
	}

	private getRect() {
		this.rect = this.DOM.el.getBoundingClientRect();
	}

	destroy() {
		if (this.resizeHandler) {
			window.removeEventListener("resize", this.resizeHandler);
			this.resizeHandler = null;
		}
	}
}

// =============================================================================
// Base class for shared variant logic
// =============================================================================

abstract class BaseVariant implements ImageTrailVariant {
	protected container: HTMLDivElement;
	protected DOM: { el: HTMLDivElement };
	protected images: ImageItem[];
	protected imagesTotal: number;
	protected imgPosition: number;
	protected zIndexVal: number;
	protected activeImagesCount: number;
	protected isIdle: boolean;
	protected mousePos: { x: number; y: number };
	protected lastMousePos: { x: number; y: number };
	protected cacheMousePos: { x: number; y: number };

	protected touchActive = false;
	private positionHistory: { x: number; y: number; t: number }[] = [];
	private static readonly HISTORY_MAX_AGE = 100; // ms
	private static readonly HISTORY_MAX_LEN = 5;

	private rafId: number | null = null;
	private rafStarted = false;
	private destroyed = false;
	private handlePointerMove: ((ev: MouseEvent | TouchEvent) => void) | null = null;
	private initRender: ((ev: MouseEvent | TouchEvent) => void) | null = null;
	private handleTouchStart: ((ev: TouchEvent) => void) | null = null;
	private handleTouchEnd: ((ev: TouchEvent) => void) | null = null;

	constructor(container: HTMLDivElement) {
		this.container = container;
		this.DOM = { el: container };
		this.images = [...container.querySelectorAll(".content__img")].map(
			(img) => new ImageItem(img as HTMLDivElement)
		);
		this.imagesTotal = this.images.length;
		this.imgPosition = 0;
		this.zIndexVal = 1;
		this.activeImagesCount = 0;
		this.isIdle = true;
		this.mousePos = { x: 0, y: 0 };
		this.lastMousePos = { x: 0, y: 0 };
		this.cacheMousePos = { x: 0, y: 0 };

		this.handlePointerMove = (ev: MouseEvent | TouchEvent) => {
			if ("touches" in ev) ev.preventDefault();
			const rect = this.container.getBoundingClientRect();
			this.mousePos = getLocalPointerPos(ev, rect);
			if (this.touchActive) {
				this.pushPositionHistory(this.mousePos.x, this.mousePos.y);
			}
		};
		container.addEventListener("mousemove", this.handlePointerMove);
		container.addEventListener("touchmove", this.handlePointerMove, { passive: false });

		this.initRender = (ev: MouseEvent | TouchEvent) => {
			if ("touches" in ev) ev.preventDefault();
			const rect = this.container.getBoundingClientRect();
			this.mousePos = getLocalPointerPos(ev, rect);
			this.cacheMousePos = { ...this.mousePos };
			this.startRafLoop();
			container.removeEventListener("mousemove", this.initRender as EventListener);
			container.removeEventListener("touchmove", this.initRender as EventListener);
		};
		container.addEventListener("mousemove", this.initRender as EventListener);
		container.addEventListener("touchmove", this.initRender as EventListener, { passive: false });

		// Touch lifecycle handlers
		this.handleTouchStart = (ev: TouchEvent) => {
			ev.preventDefault();
			this.touchActive = true;
			const rect = this.container.getBoundingClientRect();
			const pos = getLocalPointerPos(ev, rect);
			this.mousePos = pos;
			this.cacheMousePos = { ...pos };
			this.lastMousePos = { ...pos };
			this.positionHistory = [];
			this.pushPositionHistory(pos.x, pos.y);
			this.startRafLoop();
		};
		container.addEventListener("touchstart", this.handleTouchStart, { passive: false });

		this.handleTouchEnd = () => {
			this.touchActive = false;
			this.lastMousePos = { ...this.mousePos };
			this.cacheMousePos = { ...this.mousePos };
			this.positionHistory = [];
		};
		container.addEventListener("touchend", this.handleTouchEnd);
		container.addEventListener("touchcancel", this.handleTouchEnd);
	}

	private startRafLoop() {
		if (this.rafStarted) return;
		// Nothing to animate when the container holds no trail elements: leaving the
		// loop unstarted keeps `showNextImage` from indexing an empty image list every
		// frame (`images` defaults to `[]`, so this is a reachable state).
		if (this.imagesTotal === 0) return;
		this.rafStarted = true;
		// Remove initRender listeners since we're starting the loop
		if (this.initRender) {
			this.container.removeEventListener("mousemove", this.initRender as EventListener);
			this.container.removeEventListener("touchmove", this.initRender as EventListener);
		}
		this.rafId = requestAnimationFrame(() => this.render());
	}

	private pushPositionHistory(x: number, y: number) {
		const now = performance.now();
		this.positionHistory.push({ x, y, t: now });
		// Trim by age and length
		const cutoff = now - BaseVariant.HISTORY_MAX_AGE;
		while (
			this.positionHistory.length > BaseVariant.HISTORY_MAX_LEN ||
			(this.positionHistory.length > 1 && this.positionHistory[0]!.t < cutoff)
		) {
			this.positionHistory.shift();
		}
	}

	protected getTouchVelocity(): { dx: number; dy: number } {
		if (!this.touchActive || this.positionHistory.length < 2) {
			// Mouse fallback: same as original behavior
			return {
				dx: this.mousePos.x - this.cacheMousePos.x,
				dy: this.mousePos.y - this.cacheMousePos.y,
			};
		}
		// Cumulative displacement over the buffer
		let dx = 0;
		let dy = 0;
		for (let i = 1; i < this.positionHistory.length; i++) {
			dx += this.positionHistory[i]!.x - this.positionHistory[i - 1]!.x;
			dy += this.positionHistory[i]!.y - this.positionHistory[i - 1]!.y;
		}
		return { dx, dy };
	}

	protected get threshold(): number {
		return this.touchActive ? 40 : 80;
	}

	protected render() {
		if (this.destroyed) return;
		const distance = getMouseDistance(this.mousePos, this.lastMousePos);
		this.updateCache();

		if (distance > this.threshold) {
			this.showNextImage();
			this.lastMousePos = { ...this.mousePos };
		}
		if (this.isIdle && this.zIndexVal !== 1) {
			this.zIndexVal = 1;
		}
		this.rafId = requestAnimationFrame(() => this.render());
	}

	protected updateCache() {
		this.cacheMousePos.x = lerp(this.cacheMousePos.x, this.mousePos.x, 0.1);
		this.cacheMousePos.y = lerp(this.cacheMousePos.y, this.mousePos.y, 0.1);
	}

	protected abstract showNextImage(): void;

	protected onImageActivated() {
		this.activeImagesCount++;
		this.isIdle = false;
	}

	protected onImageDeactivated() {
		this.activeImagesCount--;
		if (this.activeImagesCount === 0) {
			this.isIdle = true;
		}
	}

	destroy() {
		this.destroyed = true;

		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}

		if (this.handlePointerMove) {
			this.container.removeEventListener("mousemove", this.handlePointerMove);
			this.container.removeEventListener("touchmove", this.handlePointerMove);
		}
		if (this.initRender) {
			this.container.removeEventListener("mousemove", this.initRender as EventListener);
			this.container.removeEventListener("touchmove", this.initRender as EventListener);
		}
		if (this.handleTouchStart) {
			this.container.removeEventListener("touchstart", this.handleTouchStart);
		}
		if (this.handleTouchEnd) {
			this.container.removeEventListener("touchend", this.handleTouchEnd);
			this.container.removeEventListener("touchcancel", this.handleTouchEnd);
		}
		this.positionHistory = [];

		for (const img of this.images) {
			gsap.killTweensOf(img.DOM.el);
			if (img.DOM.inner) gsap.killTweensOf(img.DOM.inner);
			img.destroy();
		}
	}
}

// =============================================================================
// Variant 1 — Basic fade & scale trail
// =============================================================================

export class ImageTrailVariant1 extends BaseVariant {
	protected showNextImage() {
		++this.zIndexVal;
		this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
		const img = this.images[this.imgPosition];
		if (!img) return;

		gsap.killTweensOf(img.DOM.el);
		gsap
			.timeline({
				onStart: () => this.onImageActivated(),
				onComplete: () => this.onImageDeactivated(),
			})
			.fromTo(
				img.DOM.el,
				{
					opacity: 1,
					scale: 1,
					zIndex: this.zIndexVal,
					x: this.cacheMousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.cacheMousePos.y - (img.rect?.height ?? 0) / 2,
				},
				{
					duration: 0.4,
					ease: "power1",
					x: this.mousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.mousePos.y - (img.rect?.height ?? 0) / 2,
				},
				0
			)
			.to(
				img.DOM.el,
				{
					duration: 0.4,
					ease: "power3",
					opacity: 0,
					scale: 0.2,
				},
				0.4
			);
	}
}

// =============================================================================
// Variant 2 — Scale-up with brightness burst
// =============================================================================

export class ImageTrailVariant2 extends BaseVariant {
	protected showNextImage() {
		++this.zIndexVal;
		this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
		const img = this.images[this.imgPosition];
		if (!img) return;

		gsap.killTweensOf(img.DOM.el);
		gsap
			.timeline({
				onStart: () => this.onImageActivated(),
				onComplete: () => this.onImageDeactivated(),
			})
			.fromTo(
				img.DOM.el,
				{
					opacity: 1,
					scale: 0,
					zIndex: this.zIndexVal,
					x: this.cacheMousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.cacheMousePos.y - (img.rect?.height ?? 0) / 2,
				},
				{
					duration: 0.4,
					ease: "power1",
					scale: 1,
					x: this.mousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.mousePos.y - (img.rect?.height ?? 0) / 2,
				},
				0
			)
			.fromTo(
				img.DOM.inner,
				{ scale: 2.8, filter: "brightness(250%)" },
				{
					duration: 0.4,
					ease: "power1",
					scale: 1,
					filter: "brightness(100%)",
				},
				0
			)
			.to(
				img.DOM.el,
				{
					duration: 0.4,
					ease: "power2",
					opacity: 0,
					scale: 0.2,
				},
				0.45
			);
	}
}

// =============================================================================
// Variant 3 — Float-up exit with random x drift
// =============================================================================

export class ImageTrailVariant3 extends BaseVariant {
	protected showNextImage() {
		++this.zIndexVal;
		this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
		const img = this.images[this.imgPosition];
		if (!img) return;

		gsap.killTweensOf(img.DOM.el);
		gsap
			.timeline({
				onStart: () => this.onImageActivated(),
				onComplete: () => this.onImageDeactivated(),
			})
			.fromTo(
				img.DOM.el,
				{
					opacity: 1,
					scale: 0,
					zIndex: this.zIndexVal,
					xPercent: 0,
					yPercent: 0,
					x: this.cacheMousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.cacheMousePos.y - (img.rect?.height ?? 0) / 2,
				},
				{
					duration: 0.4,
					ease: "power1",
					scale: 1,
					x: this.mousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.mousePos.y - (img.rect?.height ?? 0) / 2,
				},
				0
			)
			.fromTo(
				img.DOM.inner,
				{ scale: 1.2 },
				{
					duration: 0.4,
					ease: "power1",
					scale: 1,
				},
				0
			)
			.to(
				img.DOM.el,
				{
					duration: 0.6,
					ease: "power2",
					opacity: 0,
					scale: 0.2,
					xPercent: () => gsap.utils.random(-30, 30),
					yPercent: -200,
				},
				0.6
			);
	}
}

// =============================================================================
// Variant 4 — Momentum-based drift with brightness/contrast
// =============================================================================

export class ImageTrailVariant4 extends BaseVariant {
	protected showNextImage() {
		++this.zIndexVal;
		this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
		const img = this.images[this.imgPosition];
		if (!img) return;
		gsap.killTweensOf(img.DOM.el);

		const vel = this.getTouchVelocity();
		let dx = vel.dx;
		let dy = vel.dy;
		const distance = Math.sqrt(dx * dx + dy * dy);
		if (distance !== 0) {
			dx /= distance;
			dy /= distance;
		}
		dx *= distance / 100;
		dy *= distance / 100;

		gsap
			.timeline({
				onStart: () => this.onImageActivated(),
				onComplete: () => this.onImageDeactivated(),
			})
			.fromTo(
				img.DOM.el,
				{
					opacity: 1,
					scale: 0,
					zIndex: this.zIndexVal,
					x: this.cacheMousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.cacheMousePos.y - (img.rect?.height ?? 0) / 2,
				},
				{
					duration: 0.4,
					ease: "power1",
					scale: 1,
					x: this.mousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.mousePos.y - (img.rect?.height ?? 0) / 2,
				},
				0
			)
			.fromTo(
				img.DOM.inner,
				{
					scale: 2,
					filter: `brightness(${Math.max((400 * distance) / 100, 100)}%) contrast(${Math.max(
						(400 * distance) / 100,
						100
					)}%)`,
				},
				{
					duration: 0.4,
					ease: "power1",
					scale: 1,
					filter: "brightness(100%) contrast(100%)",
				},
				0
			)
			.to(
				img.DOM.el,
				{
					duration: 0.4,
					ease: "power3",
					opacity: 0,
				},
				0.4
			)
			.to(
				img.DOM.el,
				{
					duration: 1.5,
					ease: "power4",
					x: `+=${dx * 110}`,
					y: `+=${dy * 110}`,
				},
				0.05
			);
	}
}

// =============================================================================
// Variant 5 — Rotation + momentum fling
// =============================================================================

export class ImageTrailVariant5 extends BaseVariant {
	private lastAngle = 0;

	protected showNextImage() {
		const vel = this.getTouchVelocity();
		let dx = vel.dx;
		let dy = vel.dy;
		let angle = Math.atan2(dy, dx) * (180 / Math.PI);
		if (angle < 0) angle += 360;
		if (angle > 90 && angle <= 270) angle += 180;
		const isMovingClockwise = angle >= this.lastAngle;
		this.lastAngle = angle;
		const startAngle = isMovingClockwise ? angle - 10 : angle + 10;
		const distance = Math.sqrt(dx * dx + dy * dy);
		if (distance !== 0) {
			dx /= distance;
			dy /= distance;
		}
		dx *= distance / 150;
		dy *= distance / 150;

		++this.zIndexVal;
		this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
		const img = this.images[this.imgPosition];
		if (!img) return;
		gsap.killTweensOf(img.DOM.el);

		gsap
			.timeline({
				onStart: () => this.onImageActivated(),
				onComplete: () => this.onImageDeactivated(),
			})
			.fromTo(
				img.DOM.el,
				{
					opacity: 1,
					filter: "brightness(80%)",
					scale: 0.1,
					zIndex: this.zIndexVal,
					x: this.cacheMousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.cacheMousePos.y - (img.rect?.height ?? 0) / 2,
					rotation: startAngle,
				},
				{
					duration: 1,
					ease: "power2",
					scale: 1,
					filter: "brightness(100%)",
					x: this.mousePos.x - (img.rect?.width ?? 0) / 2 + dx * 70,
					y: this.mousePos.y - (img.rect?.height ?? 0) / 2 + dy * 70,
					rotation: this.lastAngle,
				},
				0
			)
			.to(
				img.DOM.el,
				{
					duration: 0.4,
					ease: "expo",
					opacity: 0,
				},
				0.5
			)
			.to(
				img.DOM.el,
				{
					duration: 1.5,
					ease: "power4",
					x: `+=${dx * 120}`,
					y: `+=${dy * 120}`,
				},
				0.05
			);
	}
}

// =============================================================================
// Variant 6 — Speed-reactive size, blur, grayscale
// =============================================================================

export class ImageTrailVariant6 extends BaseVariant {
	protected updateCache() {
		this.cacheMousePos.x = lerp(this.cacheMousePos.x, this.mousePos.x, 0.3);
		this.cacheMousePos.y = lerp(this.cacheMousePos.y, this.mousePos.y, 0.3);
	}

	private mapSpeedToSize(speed: number, minSize: number, maxSize: number) {
		const maxSpeed = 200;
		return minSize + (maxSize - minSize) * Math.min(speed / maxSpeed, 1);
	}

	private mapSpeedToBrightness(speed: number, minB: number, maxB: number) {
		const maxSpeed = 70;
		return minB + (maxB - minB) * Math.min(speed / maxSpeed, 1);
	}

	private mapSpeedToBlur(speed: number, minBlur: number, maxBlur: number) {
		const maxSpeed = 90;
		return minBlur + (maxBlur - minBlur) * Math.min(speed / maxSpeed, 1);
	}

	private mapSpeedToGrayscale(speed: number, minG: number, maxG: number) {
		const maxSpeed = 90;
		return minG + (maxG - minG) * Math.min(speed / maxSpeed, 1);
	}

	protected showNextImage() {
		const vel = this.getTouchVelocity();
		const speed = Math.sqrt(vel.dx * vel.dx + vel.dy * vel.dy);

		++this.zIndexVal;
		this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
		const img = this.images[this.imgPosition];
		if (!img) return;

		const scaleFactor = this.mapSpeedToSize(speed, 0.3, 2);
		const brightnessValue = this.mapSpeedToBrightness(speed, 0, 1.3);
		const blurValue = this.mapSpeedToBlur(speed, 20, 0);
		const grayscaleValue = this.mapSpeedToGrayscale(speed, 600, 0);

		gsap.killTweensOf(img.DOM.el);
		gsap
			.timeline({
				onStart: () => this.onImageActivated(),
				onComplete: () => this.onImageDeactivated(),
			})
			.fromTo(
				img.DOM.el,
				{
					opacity: 1,
					scale: 0,
					zIndex: this.zIndexVal,
					x: this.cacheMousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.cacheMousePos.y - (img.rect?.height ?? 0) / 2,
				},
				{
					duration: 0.8,
					ease: "power3",
					scale: scaleFactor,
					filter: `grayscale(${grayscaleValue * 100}%) brightness(${
						brightnessValue * 100
					}%) blur(${blurValue}px)`,
					x: this.mousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.mousePos.y - (img.rect?.height ?? 0) / 2,
				},
				0
			)
			.fromTo(
				img.DOM.inner,
				{ scale: 2 },
				{
					duration: 0.8,
					ease: "power3",
					scale: 1,
				},
				0
			)
			.to(
				img.DOM.el,
				{
					duration: 0.4,
					ease: "power3.in",
					opacity: 0,
					scale: 0.2,
				},
				0.45
			);
	}
}

// =============================================================================
// Variant 7 — Stacking trail with visible queue
// =============================================================================

export class ImageTrailVariant7 extends BaseVariant {
	private visibleImagesCount: number;
	private visibleImagesTotal: number;

	constructor(container: HTMLDivElement) {
		super(container);
		this.visibleImagesCount = 0;
		this.visibleImagesTotal = 9;
		this.visibleImagesTotal = Math.min(this.visibleImagesTotal, this.imagesTotal - 1);
	}

	protected updateCache() {
		this.cacheMousePos.x = lerp(this.cacheMousePos.x, this.mousePos.x, 0.3);
		this.cacheMousePos.y = lerp(this.cacheMousePos.y, this.mousePos.y, 0.3);
	}

	protected showNextImage() {
		++this.zIndexVal;
		this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
		const img = this.images[this.imgPosition];
		if (!img) return;
		++this.visibleImagesCount;

		gsap.killTweensOf(img.DOM.el);
		const scaleValue = gsap.utils.random(0.5, 1.6);

		gsap
			.timeline({
				onStart: () => this.onImageActivated(),
				onComplete: () => this.onImageDeactivated(),
			})
			.fromTo(
				img.DOM.el,
				{
					scale: scaleValue - Math.max(gsap.utils.random(0.2, 0.6), 0),
					rotationZ: 0,
					opacity: 1,
					zIndex: this.zIndexVal,
					x: this.cacheMousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.cacheMousePos.y - (img.rect?.height ?? 0) / 2,
				},
				{
					duration: 0.4,
					ease: "power3",
					scale: scaleValue,
					rotationZ: gsap.utils.random(-3, 3),
					x: this.mousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.mousePos.y - (img.rect?.height ?? 0) / 2,
				},
				0
			);

		if (this.visibleImagesCount >= this.visibleImagesTotal) {
			const lastInQueue = getNewPosition(this.imgPosition, this.visibleImagesTotal, this.images);
			const oldImg = this.images[lastInQueue]!;
			gsap.to(oldImg.DOM.el, {
				duration: 0.4,
				ease: "power4",
				opacity: 0,
				scale: 1.3,
				onComplete: () => {
					if (this.activeImagesCount === 0) {
						this.isIdle = true;
					}
				},
			});
		}
	}
}

// =============================================================================
// Variant 8 — 3D perspective based on cursor position
// =============================================================================

export class ImageTrailVariant8 extends BaseVariant {
	private rotation: { x: number; y: number };
	private cachedRotation: { x: number; y: number };
	private zValue: number;
	private cachedZValue: number;

	constructor(container: HTMLDivElement) {
		super(container);
		this.rotation = { x: 0, y: 0 };
		this.cachedRotation = { x: 0, y: 0 };
		this.zValue = 0;
		this.cachedZValue = 0;
	}

	protected showNextImage() {
		const rect = this.container.getBoundingClientRect();
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;
		const relX = this.mousePos.x - centerX;
		const relY = this.mousePos.y - centerY;

		this.rotation.x = -(relY / centerY) * 30;
		this.rotation.y = (relX / centerX) * 30;
		this.cachedRotation = { ...this.rotation };

		const distanceFromCenter = Math.sqrt(relX * relX + relY * relY);
		const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
		const proportion = distanceFromCenter / maxDistance;
		this.zValue = proportion * 1200 - 600;
		this.cachedZValue = this.zValue;
		const normalizedZ = (this.zValue + 600) / 1200;
		const brightness = 0.2 + normalizedZ * 2.3;

		++this.zIndexVal;
		this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
		const img = this.images[this.imgPosition];
		if (!img) return;
		gsap.killTweensOf(img.DOM.el);

		gsap
			.timeline({
				onStart: () => this.onImageActivated(),
				onComplete: () => this.onImageDeactivated(),
			})
			.set(this.DOM.el, { perspective: 1000 }, 0)
			.fromTo(
				img.DOM.el,
				{
					opacity: 1,
					z: 0,
					scale: 1 + this.cachedZValue / 1000,
					zIndex: this.zIndexVal,
					x: this.cacheMousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.cacheMousePos.y - (img.rect?.height ?? 0) / 2,
					rotationX: this.cachedRotation.x,
					rotationY: this.cachedRotation.y,
					filter: `brightness(${brightness})`,
				},
				{
					duration: 1,
					ease: "expo",
					scale: 1 + this.zValue / 1000,
					x: this.mousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.mousePos.y - (img.rect?.height ?? 0) / 2,
					rotationX: this.rotation.x,
					rotationY: this.rotation.y,
				},
				0
			)
			.to(
				img.DOM.el,
				{
					duration: 0.4,
					ease: "power2",
					opacity: 0,
					z: -800,
				},
				0.3
			);
	}
}

// =============================================================================
// Variant Pixelated — hard-snap pop-in/pop-out, pixelated + bordered images
// =============================================================================

export class ImageTrailVariantPixelated extends BaseVariant {
	private static readonly HOLD = 0.15; // seconds the image stays visible before snapping out

	constructor(container: HTMLDivElement) {
		super(container);
		for (const img of this.images) {
			img.DOM.el.style.imageRendering = "pixelated";
			img.DOM.el.style.border = "2px solid #191308";
		}
	}

	protected showNextImage() {
		++this.zIndexVal;
		this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
		const img = this.images[this.imgPosition];
		if (!img) return;

		gsap.killTweensOf(img.DOM.el);
		gsap
			.timeline({
				onStart: () => this.onImageActivated(),
				onComplete: () => this.onImageDeactivated(),
			})
			.set(
				img.DOM.el,
				{
					opacity: 1,
					scale: 1,
					zIndex: this.zIndexVal,
					x: this.mousePos.x - (img.rect?.width ?? 0) / 2,
					y: this.mousePos.y - (img.rect?.height ?? 0) / 2,
				},
				0
			)
			.set(img.DOM.el, { opacity: 0, scale: 0.2 }, ImageTrailVariantPixelated.HOLD);
	}
}

// =============================================================================
// Variant Map
// =============================================================================

export const variantMap: Record<VariantType, new (container: HTMLDivElement) => ImageTrailVariant> =
	{
		type1: ImageTrailVariant1,
		type2: ImageTrailVariant2,
		type3: ImageTrailVariant3,
		type4: ImageTrailVariant4,
		type5: ImageTrailVariant5,
		type6: ImageTrailVariant6,
		type7: ImageTrailVariant7,
		type8: ImageTrailVariant8,
		pixelated: ImageTrailVariantPixelated,
	};
