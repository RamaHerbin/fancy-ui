import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes } from "react";

import { cn } from "../../utils.js";
import { accessibleName, avatarToneClass, initialsOf, resolveAvatarStatus } from "./avatar-core.js";

export type AvatarSize = "sm" | "md" | "lg";
export type AvatarShape = "circle" | "square";

/**
 * `AvatarProps` plus every native attribute and listener of the `<span>` it
 * renders. Own props win.
 */
export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
	/** Image URL. While it loads a skeleton shows; if it fails the initials show. */
	src?: string;
	/**
	 * The accessible name, and the one required decision whenever `src` is set:
	 * describe the image, or pass `""` to mark the avatar decorative (beside
	 * a visible name that already says who it is). Falls back to `name`.
	 */
	alt?: string;
	/**
	 * Who this is. Gives one or two initials for the fallback and a colour that
	 * is always the same for the same name.
	 */
	name?: string;
	/** Diameter: 28, 36 or 64px. */
	size?: AvatarSize;
	/** Fully round, or a rounded square. */
	shape?: AvatarShape;
	/** Additional CSS classes. */
	className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
	sm: "size-7 text-[0.65rem]",
	md: "size-9 text-xs",
	lg: "size-16 text-lg",
};

const SHAPE_CLASSES: Record<AvatarShape, string> = {
	circle: "rounded-full",
	square: "rounded-lg",
};

export function Avatar({
	src,
	alt,
	name,
	size = "md",
	shape = "circle",
	className,
	...restProps
}: AvatarProps) {
	// The last source that loaded and the last that failed, not a status flag: a
	// new `src` is "loading" again with nothing to reset, and the server render
	// and the first client render agree.
	const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	const imgRef = useRef<HTMLImageElement | null>(null);

	const status = resolveAvatarStatus(src, loadedSrc, failedSrc);
	const label = accessibleName(alt, name);
	const initials = initialsOf(name);

	// An image that finished before this component hydrated has already fired
	// its load or error event, so the handlers below never hear about it. Ask
	// the element once it exists.
	useEffect(() => {
		const el = imgRef.current;
		if (!el || !src || !el.complete) return;
		if (el.naturalWidth > 0) setLoadedSrc(src);
		else setFailedSrc(src);
	}, [src]);

	return (
		<span
			{...restProps}
			className={cn(
				"relative inline-flex shrink-0 items-center justify-center overflow-hidden font-semibold select-none",
				SIZE_CLASSES[size],
				SHAPE_CLASSES[shape],
				status === "fallback" ? avatarToneClass(name) : "bg-muted text-muted-foreground",
				className
			)}
			role={label ? "img" : restProps.role}
			aria-label={label ?? restProps["aria-label"]}
			aria-hidden={label ? undefined : true}
			data-size={size}
			data-shape={shape}
			data-status={status}
		>
			{src && status !== "fallback" ? (
				<img
					ref={imgRef}
					src={src}
					alt=""
					decoding="async"
					draggable={false}
					className={cn(
						"absolute inset-0 size-full object-cover motion-safe:transition-opacity motion-safe:duration-200",
						status === "loaded" ? "opacity-100" : "opacity-0"
					)}
					onLoad={() => setLoadedSrc(src)}
					onError={() => setFailedSrc(src)}
				/>
			) : null}
			{status === "loading" ? (
				<span
					data-slot="skeleton"
					aria-hidden="true"
					className="bg-foreground/10 absolute inset-0 motion-safe:animate-pulse"
				/>
			) : status === "fallback" ? (
				initials ? (
					<span data-slot="initials" aria-hidden="true">
						{initials}
					</span>
				) : (
					<svg
						data-slot="silhouette"
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="currentColor"
						className="size-[60%]"
					>
						<circle cx="12" cy="8.5" r="4" />
						<path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7z" />
					</svg>
				)
			) : null}
		</span>
	);
}
