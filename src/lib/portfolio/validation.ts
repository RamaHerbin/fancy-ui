import type { ContactFormData, FieldErrors } from "./types.js";

export function validateContactForm(formData: ContactFormData): FieldErrors {
	const errors: FieldErrors = {};

	if (!formData.name.trim()) {
		errors.name = "Name is required";
	} else if (formData.name.trim().length < 2) {
		errors.name = "Name must be at least 2 characters long";
	}

	if (!formData.email.trim()) {
		errors.email = "Email is required";
	} else {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(formData.email.trim())) {
			errors.email = "Please enter a valid email address";
		}
	}

	if (!formData.message.trim()) {
		errors.message = "Message is required";
	} else if (formData.message.trim().length < 10) {
		errors.message = "Message must be at least 10 characters long";
	}

	return errors;
}

export function hasValidationErrors(errors: FieldErrors): boolean {
	return Object.keys(errors).length > 0;
}

export function sanitizeFormData(formData: ContactFormData): ContactFormData {
	return {
		name: formData.name.trim(),
		email: formData.email.trim(),
		message: formData.message.trim(),
	};
}
