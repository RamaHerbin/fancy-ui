// Types
export type { ContactFormData, FieldErrors, Testimonial, Logo } from "./types.js";

// Validation
export { validateContactForm, hasValidationErrors, sanitizeFormData } from "./validation.js";

// Components
export { default as NavAnchor } from "./NavAnchor.svelte";
export { default as ReviewCard } from "./ReviewCard.svelte";
export { default as CarbonNeutralBadge } from "./CarbonNeutralBadge.svelte";
export { default as ContactForm } from "./ContactForm.svelte";

// Sections
export { default as Hero } from "./sections/Hero.svelte";
export { default as Trusted } from "./sections/Trusted.svelte";
export { default as About } from "./sections/About.svelte";
export { default as Projects } from "./sections/Projects.svelte";
export { default as Testimonials } from "./sections/Testimonials.svelte";
export { default as Passions } from "./sections/Passions.svelte";
export { default as Creative } from "./sections/Creative.svelte";
export { default as Contact } from "./sections/Contact.svelte";
export { default as Footer } from "./sections/Footer.svelte";
