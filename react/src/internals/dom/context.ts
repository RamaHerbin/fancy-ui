import { createContext, useContext } from "react";
import type { Provider } from "react";

export interface InternalContext<T> {
	Provider: Provider<T | undefined>;
	useRequired: () => T;
	useOptional: () => T | undefined;
}

/**
 * A typed context plus its two readers. `useRequired` throws a named error outside its
 * provider (the compound-component contract); `useOptional` returns `undefined` (the
 * degrade-gracefully contract — a field reader with no field, a group item outside its
 * group).
 *
 * A context VALUE is a plain object rebuilt when its scalar inputs change, and the
 * rebuild is what makes consumers re-render. Never wrap one in `useMemo(..., [])`.
 */
export function createInternalContext<T>(displayName: string): InternalContext<T> {
	const Context = createContext<T | undefined>(undefined);
	Context.displayName = displayName;

	function useRequired(): T {
		const value = useContext(Context);
		if (value === undefined) {
			throw new Error(`${displayName} is missing: this component must be rendered inside its provider.`);
		}
		return value;
	}

	function useOptional(): T | undefined {
		return useContext(Context);
	}

	return { Provider: Context.Provider, useRequired, useOptional };
}
