import { render, cleanup } from '@testing-library/svelte';
import { afterEach, describe, it, expect } from 'vitest';
import FluidCursor from './FluidCursor.svelte';

describe('FluidCursor', () => {
	afterEach(cleanup);

	it('renders a container div', () => {
		const { container } = render(FluidCursor);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it('renders a canvas element', () => {
		const { container } = render(FluidCursor);
		const canvas = container.querySelector('canvas');
		expect(canvas).toBeInTheDocument();
	});

	it('canvas has id="fluid"', () => {
		const { container } = render(FluidCursor);
		const canvas = container.querySelector('canvas#fluid');
		expect(canvas).toBeInTheDocument();
	});

	it('container has pointer-events-none class', () => {
		const { container } = render(FluidCursor);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain('pointer-events-none');
	});

	it('container has fixed positioning class', () => {
		const { container } = render(FluidCursor);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain('fixed');
	});

	it('container has z-50 class', () => {
		const { container } = render(FluidCursor);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain('z-50');
	});

	it('applies custom class names', () => {
		const { container } = render(FluidCursor, { props: { class: 'my-fluid' } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain('my-fluid');
	});
});
