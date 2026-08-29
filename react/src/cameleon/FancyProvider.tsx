import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "../utils.js";
import type { Skin } from "./types.js";
import { SkinReactContext, type SkinContext } from "./context.js";
import "./cameleon.css";

export interface FancyProviderProps {
	/** The active skin. Changing it re-flows the whole subtree live. */
	skin: Skin;
	/** Scope `.dark` to this subtree for skins whose colorScheme is "dark". */
	manageColorScheme?: boolean;
	className?: string;
	children?: ReactNode;
}

export function FancyProvider({
	skin,
	manageColorScheme = false,
	className = "",
	children,
}: FancyProviderProps) {
	// Fresh context value whenever `skin` changes — this is what makes a live
	// skin switch reactive; consumers re-render because the value identity changes.
	const ctx = useMemo<SkinContext>(() => ({ skin }), [skin]);

	// Skin tokens as scoped inline CSS variables. Overriding these var names on
	// this element re-flows every utility that reads them, for THIS subtree only.
	// The provider never touches <html>, so it can't fight the global theme store.
	const styleVars = useMemo(() => ({ ...skin.tokens }) as CSSProperties, [skin.tokens]);

	// Inject skin webfonts once (deduped by id). useEffect only ever runs
	// client-side, so this is SSR-safe with no extra guard.
	useEffect(() => {
		if (!skin.fonts) return;
		for (const font of skin.fonts) {
			if (document.getElementById(font.id)) continue;
			const link = document.createElement("link");
			link.id = font.id;
			link.rel = "stylesheet";
			link.href = font.href;
			document.head.appendChild(link);
		}
	}, [skin.fonts]);

	return (
		<SkinReactContext.Provider value={ctx}>
			<div
				data-skin={skin.name}
				className={cn(
					"cameleon-root",
					manageColorScheme && skin.colorScheme === "dark" && "dark",
					className
				)}
				style={styleVars}
			>
				{children}
			</div>
		</SkinReactContext.Provider>
	);
}
