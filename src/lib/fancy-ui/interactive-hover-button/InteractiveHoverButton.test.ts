import { render, screen, cleanup } from '@testing-library/svelte';
import { afterEach, describe, it, expect } from 'vitest';
import InteractiveHoverButton from './InteractiveHoverButton.svelte';

describe('InteractiveHoverButton', () => {
	afterEach(cleanup);

	it('renders a button element', () => {
		render(InteractiveHoverButton);
		expect(screen.getByRole('button')).toBeInTheDocument();
	});

	it('renders default text "Button" when no text prop is provided', () => {
		render(InteractiveHoverButton);
		const button = screen.getByRole('button');
		expect(button).toHaveTextContent('Button');
	});

	it('renders custom text from the text prop', () => {
		render(InteractiveHoverButton, { props: { text: 'Get Started' } });
		const button = screen.getByRole('button');
		expect(button).toHaveTextContent('Get Started');
	});

	it('displays the text twice (initial + hover overlay)', () => {
		render(InteractiveHoverButton, { props: { text: 'Subscribe' } });
		const matches = screen.getAllByText('Subscribe');
		expect(matches).toHaveLength(2);
	});

	it('renders the arrow SVG icon', () => {
		render(InteractiveHoverButton);
		const button = screen.getByRole('button');
		const svg = button.querySelector('svg');
		expect(svg).toBeInTheDocument();
		expect(svg?.querySelectorAll('path')).toHaveLength(2);
	});

	it('applies custom class names', () => {
		render(InteractiveHoverButton, { props: { class: 'my-custom-class' } });
		const button = screen.getByRole('button');
		expect(button.className).toContain('my-custom-class');
	});

	it('preserves base classes when custom class is added', () => {
		render(InteractiveHoverButton, { props: { class: 'extra' } });
		const button = screen.getByRole('button');
		expect(button.className).toContain('overflow-hidden');
		expect(button.className).toContain('rounded-full');
	});

	it('forwards native button attributes', () => {
		render(InteractiveHoverButton, {
			props: { disabled: true, type: 'submit', 'aria-label': 'Sign up' }
		});
		const button = screen.getByRole('button');
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute('type', 'submit');
		expect(button).toHaveAttribute('aria-label', 'Sign up');
	});

	it('contains the dot element with bg-primary class', () => {
		render(InteractiveHoverButton);
		const button = screen.getByRole('button');
		const dot = button.querySelector('.bg-primary');
		expect(dot).toBeInTheDocument();
	});

	it('has hover overlay with translate and opacity classes', () => {
		render(InteractiveHoverButton);
		const button = screen.getByRole('button');
		const overlay = button.querySelector('.translate-x-12.opacity-0');
		expect(overlay).toBeInTheDocument();
	});
});
