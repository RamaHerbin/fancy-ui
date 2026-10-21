import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { createStoryThread, STORY_THREAD_DEFAULTS } from "./story-thread-core.js";
import type { StoryThreadCore } from "./story-thread-core.js";
import type { StoryThreadDash, StoryThreadLayout, StoryThreadSegment } from "./types.js";
import "./story-thread.css";

export interface StoryThreadProps {
	/**
	 * `"horizontal"` pins a full-height viewport and pans the content sideways
	 * as the page scrolls; `"vertical"` keeps a plain stack. `"auto"` is
	 * horizontal from 900 × 520 px up, vertical below.
	 */
	layout?: StoryThreadLayout;
	/**
	 * The thread's segments, each through a list of StoryNode ids. Leave it
	 * out for one segment through every node in document order. Several
	 * segments that leave the same node and meet again draw a fork whose
	 * branches advance together.
	 */
	segments?: StoryThreadSegment[];
	/** Where the tip of the thread sits in the viewport, 0..1 along the reading axis. */
	lead?: number;
	/** Curve tension between nodes: 0 draws straight lines, 1 long flat tangents. */
	tension?: number;
	/** Stroke pattern of the thread. */
	dash?: StoryThreadDash;
	/** Draw a glowing dot at the tip of every segment while it is drawing. */
	head?: boolean;
	/**
	 * Plays a soft `tick` each time the thread reaches a node going forward.
	 * Off by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/** Called with a node's id each time the thread reaches it going forward. */
	onReach?: (id: string) => void;
	/** Accessible name of the region. */
	ariaLabel?: string;
	/** Additional CSS classes on the root. */
	className?: string;
	/** The story: sections holding StoryNode anchors. */
	children?: ReactNode;
}

/** Stable default: the core re-measures only when `segments` changes identity. */
const NO_SEGMENTS: StoryThreadSegment[] = [];

/**
 * A thread that draws itself through the StoryNode anchors as the page scrolls.
 * All geometry and scroll handling live in the shared core, which writes
 * straight to the DOM; React only creates it and forwards props.
 */
export function StoryThread({
	layout = STORY_THREAD_DEFAULTS.layout,
	segments = NO_SEGMENTS,
	lead = STORY_THREAD_DEFAULTS.lead,
	tension = STORY_THREAD_DEFAULTS.tension,
	dash = STORY_THREAD_DEFAULTS.dash,
	head = STORY_THREAD_DEFAULTS.head,
	sound = false,
	onReach,
	ariaLabel = "Story",
	className,
	children,
}: StoryThreadProps) {
	const [root, rootRef] = useElementRef<HTMLDivElement>();
	const [viewport, viewportRef] = useElementRef<HTMLDivElement>();
	const [track, trackRef] = useElementRef<HTMLDivElement>();
	const [svg, svgRef] = useElementRef<SVGSVGElement>();
	const [core, setCore] = useState<StoryThreadCore | null>(null);

	const reduced = useReducedMotion();
	const live = useLiveRef({ layout, segments, lead, tension, dash, head, reduced, sound, onReach });

	useEffect(() => {
		if (!root || !viewport || !track || !svg) return;
		const { layout, segments, lead, tension, dash, head, reduced } = live.current;
		const instance = createStoryThread(root, viewport, track, svg, {
			layout,
			segments,
			lead,
			tension,
			dash,
			head,
			reducedMotion: reduced,
			onReach(id) {
				if (live.current.sound) soundFx.play("tick", { volume: 0.5 });
				live.current.onReach?.(id);
			},
		});
		setCore(instance);
		return () => {
			instance.destroy();
			setCore(null);
		};
	}, [root, viewport, track, svg, live]);

	useEffect(() => {
		core?.update({ layout, segments, lead, tension, dash, head, reducedMotion: reduced });
	}, [core, layout, segments, lead, tension, dash, head, reduced]);

	return (
		// Focusable so the arrow keys can pan a story with no control in it, the
		// same contract as a scrollable region.
		<div
			ref={rootRef}
			className={cn("st-root", className)}
			role="region"
			aria-label={ariaLabel}
			tabIndex={0}
		>
			<div ref={viewportRef} className="st-viewport">
				<div ref={trackRef} className="st-track">
					<svg ref={svgRef} className="st-svg" aria-hidden="true" focusable="false" />
					{children}
				</div>
			</div>
		</div>
	);
}
