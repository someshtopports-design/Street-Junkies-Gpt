import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateV3InvoiceHtml } from '@/lib/invoiceTemplate';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { to_email, to_name, subject, data } = body;

        // Generate the HTML using our server-side template
        const htmlContent = generateV3InvoiceHtml(data);

        // Send via Resend
        // Note: 'onboarding@resend.dev' works only for sending to the registered email.
        // Ideally, the user should verify their domain "streetjunkies.com" or similar to send to dynamic emails.
        const { data: emailData, error } = await resend.emails.send({
            from: 'Street Junkies <onboarding@resend.dev>',
            to: [to_email], // In test mode, this MUST be the admin email. In prod, it can be the brand email.
            subject: subject || "Payout Invoice",
            html: htmlContent,
        });

        if (error) {
            return NextResponse.json({ error }, { status: 400 });
        }

        return NextResponse.json({ message: 'Email sent successfully', id: emailData?.id });
    } catch (err) {
        console.error("Email Error:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
