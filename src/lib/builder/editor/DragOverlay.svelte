<!--
  DragOverlay - Floating drag preview with physics-based pendulum animation.
  Uses a damped spring model for rotation (horizontal velocity) and vertical offset.
  Velocity is accumulated from pointer events; the rAF loop consumes it for smooth spring physics.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { getEditorState } from '../stores/editor.svelte.js';
	import { getBuilderComponent } from '../registry/index.js';
	import { findNode } from '../utils/tree.js';
	import { getIcon } from './IconMap.js';

	const editor = getEditorState();

	// --- Spring physics constants ---
	const STIFFNESS = 0.2;
	const DAMPING = 0.85;
	const ANGLE_FACTOR = 0.3;
	const MAX_ANGLE = 15; // degrees
	const VERTICAL_FACTOR = 0.5;
	const MAX_VERTICAL_OFFSET = 8; // px

	// --- Animation state (rAF-driven, not reactive except bind:this) ---
	let overlayEl: HTMLDivElement | undefined = $state();
	let rafId = 0;

	// Velocity accumulated from pointermove events (written by event handler, read by rAF)
	let accumulatedDx = 0;
	let accumulatedDy = 0;
	let moveCount = 0;
	let prevEventX = 0;
	let prevEventY = 0;

	// Spring state for angle
	let currentAngle = 0;
	let angleVelocity = 0;

	// Spring state for vertical offset
	let currentOffsetY = 0;
	let offsetYVelocity = 0;

	function clamp(v: number, min: number, max: number) {
		return v < min ? min : v > max ? max : v;
	}

	function onPointerMoveAccumulate(e: PointerEvent) {
		const dx = e.clientX - prevEventX;
		const dy = e.clientY - prevEventY;
		prevEventX = e.clientX;
		prevEventY = e.clientY;
		accumulatedDx += dx;
		accumulatedDy += dy;
		moveCount++;
	}

	function tick() {
		if (!editor.isDragging || !overlayEl) {
			cancelAnimationFrame(rafId);
			rafId = 0;
			return;
		}

		// Consume accumulated velocity from pointer events
		const dx = moveCount > 0 ? accumulatedDx / moveCount : 0;
		const dy = moveCount > 0 ? accumulatedDy / moveCount : 0;
		accumulatedDx = 0;
		accumulatedDy = 0;
		moveCount = 0;

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
		const renderX = editor.pointerX + 12;
		const renderY = editor.pointerY + 12 + currentOffsetY;

		// Apply transform directly (bypass reactivity for 60fps)
		overlayEl.style.transform = `translate3d(${renderX}px, ${renderY}px, 0) rotate(${currentAngle.toFixed(2)}deg)`;

		rafId = requestAnimationFrame(tick);
	}

	function startAnimation() {
		prevEventX = editor.pointerX;
		prevEventY = editor.pointerY;
		accumulatedDx = 0;
		accumulatedDy = 0;
		moveCount = 0;
		currentAngle = 0;
		angleVelocity = 0;
		currentOffsetY = 0;
		offsetYVelocity = 0;

		document.addEventListener('pointermove', onPointerMoveAccumulate);

		if (rafId) cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(tick);
	}

	function stopAnimation() {
		document.removeEventListener('pointermove', onPointerMoveAccumulate);
		if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = 0;
		}
	}

	// Start/stop rAF loop when drag begins/ends.
	// untrack() prevents editor.pointerX/Y reads inside startAnimation()
	// from becoming $effect dependencies — otherwise the effect would
	// re-run on every pointer move, killing the accumulator.
	$effect(() => {
		if (editor.isDragging && overlayEl) {
			untrack(() => startAnimation());
		} else {
			stopAnimation();
		}
		return stopAnimation;
	});

	// --- Derived label/icon ---

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
	>
		{#if dragIcon}
			{@const Icon = dragIcon}
			<Icon class="h-4 w-4 shrink-0 text-muted-foreground" />
		{/if}
		<span class="whitespace-nowrap">{dragLabel}</span>
		<span class="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{badgeText}</span>
	</div>
{/if}
