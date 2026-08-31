/**
 * Structural ref type. NOT React.RefObject / React.MutableRefObject: those changed
 * shape between @types/react 18 and 19 (19 dropped the mutable/readonly split), and
 * this package's peer range is `^18 || ^19`. A structural type is assignable from
 * every variant either version emits.
 */
export type ElementRef<T extends Element = HTMLElement> = { readonly current: T | null };
