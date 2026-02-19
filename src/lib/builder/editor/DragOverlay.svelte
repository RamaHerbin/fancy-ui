<!--
  DragOverlay - Floating drag preview with physics-based pendulum animation.
  Uses a damped spring model for rotation (horizontal velocity) and vertical offset.
  Runs on requestAnimationFrame for 60fps. pointer-events: none for hit-testing.
-->
<script lang="ts">
	import { getEditorState } from '../stores/editor.svelte.js';
	import { getBuilderComponent } from '../registry/index.js';
	import { findNode } from '../utils/tree.js';
	import { getIcon } from './IconMap.js';

	const editor = getEditorState();

	// --- Spring physics constants ---
	const STIFFNESS = 0.15;
	const DAMPING = 0.75;
	const ANGLE_FACTOR = 0.08;
	const MAX_ANGLE = 12; // degrees
	const VERTICAL_FACTOR = 0.3;
	const MAX_VERTICAL_OFFSET = 6; // px

	// --- Animation state (rAF-driven, not reactive except bind:this) ---
	let overlayEl: HTMLDivElement | undefined = $state();
	let rafId = 0;
	let prevPointerX = 0;
	let prevPointerY = 0;

	// Spring state for angle
	let currentAngle = 0;
	let angleVelocity = 0;

	// Spring state for vertical offset
	let currentOffsetY = 0;
	let offsetYVelocity = 0;

	// Rendered position (smoothed)
	let renderX = 0;
	let renderY = 0;

	function clamp(v: number, min: number, max: number) {
		return v < min ? min : v > max ? max : v;
	}

	function tick() {
		if (!editor.isDragging || !overlayEl) {
			cancelAnimationFrame(rafId);
			rafId = 0;
			return;
		}

		// Pointer deltas
		const dx = editor.pointerX - prevPointerX;
		const dy = editor.pointerY - prevPointerY;
		prevPointerX = editor.pointerX;
		prevPointerY = editor.pointerY;

		// --- Angle spring (horizontal velocity → pendulum tilt) ---
		const targetAngle = clamp(dx * ANGLE_FACTOR, -MAX_ANGLE, MAX_ANGLE);
		const angleAccel = (targetAngle - currentAngle) * STIFFNESS;
		angleVelocity = (angleVelocity + angleAccel) * DAMPING;
		currentAngle += angleVelocity;

		// --- Vertical offset spring (speed → weight bounce) ---
		const speed = Math.sqrt(dx * dx + dy * dy);
		const targetOffsetY = clamp(speed * VERTICAL_FACTOR, 0, MAX_VERTICAL_OFFSET);
		const offsetAccel = (targetOffsetY - currentOffsetY) * STIFFNESS;
		offsetYVelocity = (offsetYVelocity + offsetAccel) * DAMPING;
		currentOffsetY += offsetYVelocity;

		// Position: offset from pointer
		renderX = editor.pointerX + 12;
		renderY = editor.pointerY + 12 + currentOffsetY;

		// Apply transform directly (bypass reactivity for 60fps)
		overlayEl.style.transform = `translate3d(${renderX}px, ${renderY}px, 0) rotate(${currentAngle.toFixed(2)}deg)`;

		rafId = requestAnimationFrame(tick);
	}

	function startAnimation() {
		// Reset physics state
		prevPointerX = editor.pointerX;
		prevPointerY = editor.pointerY;
		currentAngle = 0;
		angleVelocity = 0;
		currentOffsetY = 0;
		offsetYVelocity = 0;
		renderX = editor.pointerX + 12;
		renderY = editor.pointerY + 12;

		if (rafId) cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(tick);
	}

	function stopAnimation() {
		if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = 0;
		}
	}

	// Start/stop rAF loop when drag begins/ends
	$effect(() => {
		if (editor.isDragging) {
			startAnimation();
		} else {
			stopAnimation();
		}
		return stopAnimation;
	});

	// --- Derived label/icon (unchanged) ---

	let dragLabel = $derived.by(() => {
		if (!editor.dragSource) return '';
		if (editor.dragSource.type === 'palette') {
			const meta = getBuilderComponent(editor.dragSource.slug);
			return meta?.name ?? editor.dragSource.slug;
		}
		if (editor.dragSource.type === 'block') {
			const node = findNode(editor.page.body, editor.dragSource.blockId);
			if (node) {
				const meta = getBuilderComponent(node.type);
				return meta?.name ?? node.type;
			}
			return 'Block';
		}
		return '';
	});

	let dragIcon = $derived.by(() => {
		if (!editor.dragSource) return null;
		const slug =
			editor.dragSource.type === 'palette'
				? editor.dragSource.slug
				: (() => {
						const node = findNode(
							editor.page.body,
							(editor.dragSource as { type: 'block'; blockId: string }).blockId
						);
						return node?.type;
					})();
		if (!slug) return null;
		const meta = getBuilderComponent(slug);
		return meta ? getIcon(meta.icon) : null;
	});

	let badgeText = $derived(
		editor.dragSource?.type === 'palette' ? 'Add' : 'Move'
	);
</script>

{#if editor.isDragging}
	<div
		bind:this={overlayEl}
		class="pointer-events-none fixed left-0 top-0 z-[9999] flex items-center gap-2 rounded-md border bg-card/90 px-3 py-1.5 text-sm shadow-lg backdrop-blur-sm will-change-transform"
		style="transform: translate3d({editor.pointerX + 12}px, {editor.pointerY + 12}px, 0);"
	>
		{#if dragIcon}
			{@const Icon = dragIcon}
			<Icon class="h-4 w-4 shrink-0 text-muted-foreground" />
		{/if}
		<span class="whitespace-nowrap">{dragLabel}</span>
		<span class="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{badgeText}</span>
	</div>
{/if}
