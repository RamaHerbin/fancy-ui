import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../utils.js";
import { PixelLoader } from "../pixel-loader/index.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./image-generation.css";

/**
 * Props for ImageGeneration
 */
export interface ImageGenerationProps {
	/** Which stage of the generation to render */
	status: "idle" | "generating" | "done" | "error";
	/** The generated image, shown once status is "done" */
	src?: string | null;
	/** Describes the image to assistive tech — typically the prompt */
	alt: string;
	/** CSS aspect-ratio of the frame, holding the layout across every state */
	aspectRatio?: string;
	/** Muted caption line under the frame */
	prompt?: string;
	/** The failure line shown in the error state */
	errorText?: string;
	/** Pressing retry calls this; the retry button only exists when it is set */
	onRetry?: () => void;
	/** Called once the generated image has finished loading */
	onLoad?: () => void;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the press cue through the sound controller when retry is
	 * pressed. Off by default; only audible once the user has enabled
	 * sound.
	 */
	sound?: boolean;
}

/**
 * ImageGeneration
 */
export const ImageGeneration = forwardRef<HTMLDivElement, ImageGenerationProps>(
	function ImageGeneration(
		{
			status,
			src,
			alt,
			aspectRatio = "1 / 1",
			prompt,
			errorText = "Generation failed",
			onRetry,
			onLoad,
			className,
			sound,
		},
		ref
	) {
		const playCue = useSoundCue(sound);
		/*
		 * A plain ref, not `useElementRef`: the only thing that reads this node is
		 * the mount effect below, and reading it at mount is the whole point. An
		 * <img> that appears later — a generation that starts on "generating" and
		 * settles on "done" — was never on screen before this component existed, so
		 * it has nothing already decoded to protect and takes the ordinary reveal.
		 * That is exactly what the Svelte source's `onMount` does.
		 */
		const imageEl = useRef<HTMLImageElement | null>(null);

		/*
		 * The reveal is opt-in rather than opt-out: `mounted` is false through the
		 * whole server render, so the markup that leaves the server carries no blur
		 * class and a page that never hydrates — or hydrates with JavaScript
		 * disabled — shows a sharp image instead of a permanently smeared one.
		 * Turning it on in the mount effect is early enough to still catch the load
		 * event, which the browser queues as a separate task at the earliest.
		 */
		const [mounted, setMounted] = useState(false);

		/*
		 * Which URL finished loading, rather than a boolean: a second generation
		 * swaps `src` while the same <img> stays mounted, and comparing the two
		 * re-arms the reveal for the new image without an effect to reset a flag.
		 */
		const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
		/*
		 * Which URL failed, kept apart from which one loaded. Recording a failure as
		 * a load reveals the image, but it also makes a retry of the same URL look
		 * like something that already arrived, so the retry that finally works
		 * reports nothing to the caller.
		 */
		const [erroredSrc, setErroredSrc] = useState<string | null>(null);

		const blurred = mounted && loadedSrc !== src && erroredSrc !== src;

		function handleLoad() {
			// A cached image can be complete before the mount effect runs and fire its
			// load event after; both paths land here, and only the first one counts.
			if (loadedSrc === src) return;
			setLoadedSrc(src ?? null);
			setErroredSrc(null);
			onLoad?.();
		}

		function handleError() {
			// A broken image would otherwise sit blurred forever waiting for a load
			// that is never coming. Reveal it — the browser's own broken-image mark
			// is the honest thing to show — without claiming it loaded.
			setErroredSrc(src ?? null);
		}

		/*
		 * Mount only, and once: the guard survives React's development double-invoke
		 * of mount effects, which would otherwise report a second arrival the Svelte
		 * source never reports.
		 */
		const settled = useRef(false);
		useEffect(() => {
			// An image that is already `complete` here has settled its fate before this
			// code existed — hydration over server markup, a cache hit, or a failure —
			// and neither `load` nor `error` is coming to settle it later. So being
			// complete at mount is decisive on its own: the reveal is never armed over
			// one, whichever way it went.
			if (!settled.current) {
				settled.current = true;
				if (imageEl.current?.complete) {
					if (imageEl.current.naturalWidth > 0) {
						// Decoded and on screen: blurring it back out would be a regression the
						// reader can see, and the caller still deserves the arrival it missed.
						handleLoad();
					} else {
						// No intrinsic width — a broken image, or an SVG sized only by its
						// viewBox. Reveal it without claiming a load that may never have
						// happened; the browser's own broken-image mark is the honest thing to
						// show, and an SVG that renders fine has nothing to hide behind.
						setErroredSrc(src ?? null);
					}
				}
			}
			setMounted(true);
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, []);

		// Retry only ever renders while status === "error" and onRetry is set —
		// there is no in-flight/disabled state to guard here, unlike ChatError's
		// retry. No cue plays from handleLoad/handleError or a status transition:
		// those are outcomes the component observes, never a gesture it resolves.
		function handleRetry() {
			playCue("press");
			onRetry?.();
		}

		return (
			<div
				ref={ref}
				className={cn("ft-imagegen flex w-full flex-col gap-2", className)}
				aria-busy={status === "generating" ? "true" : undefined}
			>
				<div
					className={cn(
						"ft-imagegen-frame relative w-full overflow-hidden rounded-lg border",
						status === "idle" && "ft-imagegen-frame-idle"
					)}
					style={{ aspectRatio }}
				>
					{status === "generating" ? (
						<>
							<div className="ft-imagegen-dots" aria-hidden="true" />
							<div className="absolute inset-0 flex items-center justify-center">
								<PixelLoader cols={8} rows={8} />
							</div>
						</>
					) : status === "done" && src ? (
						<img
							ref={imageEl}
							src={src}
							alt={alt}
							className={cn(
								"ft-imagegen-img absolute inset-0 h-full w-full object-cover",
								blurred && "ft-imagegen-img-blurred"
							)}
							onLoad={handleLoad}
							onError={handleError}
						/>
					) : status === "error" ? (
						<div
							className="ft-imagegen-error absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center"
							role="alert"
						>
							<span className="ft-imagegen-error-icon" aria-hidden="true">
								<svg
									className="size-5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
									<path d="M12 9v4" />
									<path d="M12 17h.01" />
								</svg>
							</span>
							<p className="ft-imagegen-error-text text-sm">{errorText}</p>
							{onRetry ? (
								<button
									type="button"
									className="ft-imagegen-retry rounded border px-2.5 py-1 text-xs font-medium transition-colors"
									onClick={handleRetry}
								>
									Retry
								</button>
							) : null}
						</div>
					) : null}
				</div>

				{prompt ? (
					<p className="ft-imagegen-prompt text-muted-foreground text-xs leading-relaxed">
						{prompt}
					</p>
				) : null}
			</div>
		);
	}
);
