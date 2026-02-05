import { render, cleanup } from '@testing-library/svelte';
import { afterEach, describe, it, expect } from 'vitest';
import Marquee from './Marquee.svelte';

describe('Marquee', () => {
	afterEach(cleanup);

	it('renders a container div', () => {
		const { container } = render(Marquee);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it('has overflow-hidden class', () => {
		const { container } = render(Marquee);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain('overflow-hidden');
	});

	it('renders default 4 repeat groups', () => {
		const { container } = render(Marquee);
		const groups = container.querySelectorAll('.animate-marquee');
		expect(groups.length).toBe(4);
	});

	it('renders custom repeat count', () => {
		const { container } = render(Marquee, { props: { repeat: 2 } });
		const groups = container.querySelectorAll('.animate-marquee');
		expect(groups.length).toBe(2);
	});

	it('uses vertical animation class when vertical', () => {
		const { container } = render(Marquee, { props: { vertical: true } });
		const groups = container.querySelectorAll('.animate-marquee-vertical');
		expect(groups.length).toBe(4);
	});

	it('uses flex-col when vertical', () => {
		const { container } = render(Marquee, { props: { vertical: true } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain('flex-col');
	});

	it('sets animation-direction to reverse when reverse prop is true', () => {
		const { container } = render(Marquee, { props: { reverse: true } });
		const group = container.querySelector('.animate-marquee') as HTMLElement;
		expect(group?.style.animationDirection).toBe('reverse');
	});

	it('applies custom class names', () => {
		const { container } = render(Marquee, { props: { class: 'my-marquee' } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain('my-marquee');
	});
});
