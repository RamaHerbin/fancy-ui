import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "fancy-ui-react";

export function AccordionExample() {
	const [value, setValue] = useState<string | string[]>("shipping");

	return (
		<Accordion
			type="single"
			collapsible
			value={value}
			onValueChange={setValue}
			className="w-full max-w-md"
		>
			<AccordionItem value="shipping">
				<AccordionTrigger>How long does shipping take?</AccordionTrigger>
				<AccordionContent>Orders leave the warehouse within two working days.</AccordionContent>
			</AccordionItem>
			<AccordionItem value="returns">
				<AccordionTrigger>Can I return an item?</AccordionTrigger>
				<AccordionContent>
					Yes, within 30 days, as long as it is unused and in its original packaging.
				</AccordionContent>
			</AccordionItem>
			<AccordionItem value="support">
				<AccordionTrigger>How do I reach support?</AccordionTrigger>
				<AccordionContent>
					Write to us any time and we reply within one working day.
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
