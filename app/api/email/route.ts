import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { generateV3InvoiceHtml } from '@/lib/invoiceTemplate';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { to_email, to_name, subject, data } = body;

        // 1. Configure the Transporter (Gmail)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, // Your Gmail address
                pass: process.env.GMAIL_APP_PASSWORD, // Your App Password
            },
        });

        // 2. Generate HTML
        const htmlContent = generateV3InvoiceHtml(data);

        // 3. Send Email
        const info = await transporter.sendMail({
            from: `"Street Junkies" <${process.env.GMAIL_USER}>`, // Shows as "Street Junkies <your@gmail.com>"
            to: to_email, // Now works for ANY email address!
            subject: subject || "Payout Invoice",
            html: htmlContent,
        });

        return NextResponse.json({ message: 'Email sent successfully', id: info.messageId });
    } catch (err: any) {
        console.error("Email Error:", err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
