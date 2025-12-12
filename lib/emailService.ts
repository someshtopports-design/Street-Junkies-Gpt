import emailjs from '@emailjs/browser';

// Interfaces for email data
interface EmailData {
    to_name: string;
    to_email: string; // The brand's email
    message: string;
    invoice_link?: string; // Optional if we generate a link
    invoice_details?: string; // JSON string or formatted HTML/Text of invoice
}

export const sendInvoiceEmail = async (templateParams: Record<string, unknown>) => {
    try {
        // Structure the payload for our API
        // We expect 'templateParams' to contain a special 'api_payload' or we reconstruct it.
        // Actually, let's just assume templateParams IS the data object for generation, plus to_email.

        const response = await fetch('/api/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to_email: templateParams.to_email,
                to_name: templateParams.to_name,
                subject: `Invoice for ${templateParams.to_name} from Street Junkies`,
                data: templateParams // Pass everything for the template generator
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Failed to send email");
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};
