"use client";

import { useEffect, useRef, useState } from "react";
import { ImageTrailCursor } from "fancy-ui-react";
import { c, cList } from "@/content/content";

const IMAGES = cList("home.creative.images");

function isMobileViewport(): boolean {
	return (
		window.innerWidth < 768 ||
		/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
	);
}

export function Creative() {
	const [isMobile, setIsMobile] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const sectionRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const check = () => setIsMobile(isMobileViewport());
		check();
		window.addEventListener("resize", check);

		// Only run the trail while the section is on screen.
		let observer: IntersectionObserver | undefined;
		if (sectionRef.current) {
			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) setIsVisible(entry.isIntersecting);
				},
				{ threshold: 0.1, rootMargin: "50px 0px" }
			);
			observer.observe(sectionRef.current);
		}

		return () => {
			window.removeEventListener("resize", check);
			observer?.disconnect();
		};
	}, []);

	if (isMobile) return null;

	return (
		<div ref={sectionRef} id="creative" className="flex min-h-96 w-full flex-col gap-2">
			<div className="border-border relative mx-auto mt-4 flex h-96 w-full max-w-4xl items-center justify-center rounded-lg border p-4">
				<span className="text-muted-foreground absolute inset-0 flex items-center justify-center text-4xl select-none">
					{c("home.creative.hover-label")}
				</span>

				{isVisible && <ImageTrailCursor images={IMAGES} variant="type2" />}
			</div>
		</div>
	);
}
