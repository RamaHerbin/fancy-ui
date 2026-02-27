export interface ContactFormData {
	name: string;
	email: string;
	message: string;
}

export type FieldErrors = Partial<Record<keyof ContactFormData, string>>;

export interface Testimonial {
	id: number;
	name: string;
	designation: string;
	image: string;
	testimonial: string;
	linkedinUrl: string;
	date: string;
}

export interface Logo {
	name: string;
	path: string;
}
