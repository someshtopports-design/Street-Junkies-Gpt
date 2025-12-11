import emailjs from '@emailjs/browser';

// Interfaces for email data
interface EmailData {
    to_name: string;
    to_email: string; // The brand's email
    message: string;
    invoice_link?: string; // Optional if we generate a link
    invoice_details?: string; // JSON string or formatted HTML/Text of invoice
}

export const sendInvoiceEmail = async (data: EmailData) => {
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!;

    if (!serviceId || !templateId || !publicKey) {
        console.error("Missing EmailJS environment variables.");
        throw new Error("Email service is not configured correctly.");
    }

    try {
        const response = await emailjs.send(
            serviceId,
            templateId,
            {
                ...data,
            },
            publicKey
        );
        return response;
    } catch (error) {
        console.error("EmailJS Error:", error);
        throw error;
    }
};
