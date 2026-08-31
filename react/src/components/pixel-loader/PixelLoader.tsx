import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../utils.js";
import "./pixel-loader.css";

export interface PixelLoaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of pixel columns */
  cols?: number;
  /** Number of pixel rows */
  rows?: number;
  /** Size of a single pixel in px */
  cellSize?: number;
  /** Space between pixels in px */
  gap?: number;
  /** Pixel colour, any CSS colour value */
  color?: string;
  /** Duration of one full pulse cycle in seconds */
  speed?: number;
  /** Accessible label announced by assistive tech */
  label?: string;
}

export const PixelLoader = forwardRef<HTMLDivElement, PixelLoaderProps>(
  (
    {
      cols = 5,
      rows = 5,
      cellSize = 6,
      gap = 2,
      color = "var(--ft-pixel-color, currentColor)",
      speed = 1.6,
      label = "Loading",
      className,
      style,
      ...rest
    },
    ref
  ) => {
    // A zero or negative animation-duration invalidates the whole declaration.
    const cycle = Math.max(0.01, speed);

    // Delays are a pure function of (row, col) so the server and the client
    // render byte-identical markup — no Math.random, no post-hydration shuffle.
    // (row + col) walks the anti-diagonals, which reads as a wave crossing the
    // grid from the top-left corner to the bottom-right one.
    const span = rows + cols;
    const step = cycle / span;
    const delays: number[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        delays.push(((row + col) % span) * step);
      }
    }

    const rootStyle = {
      "--ft-pixel-cell-color": color,
      "--ft-pixel-speed": `${cycle}s`,
      gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
      gridAutoRows: `${cellSize}px`,
      gap: `${gap}px`,
      ...style,
    } as React.CSSProperties;

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn("inline-grid", className)}
        style={rootStyle}
        {...rest}
      >
        <span className="sr-only">{label}</span>
        {delays.map((delay, i) => (
          <span key={i} className="ft-pixel" style={{ animationDelay: `${delay}s` }} />
        ))}
      </div>
    );
  }
);

PixelLoader.displayName = "PixelLoader";
