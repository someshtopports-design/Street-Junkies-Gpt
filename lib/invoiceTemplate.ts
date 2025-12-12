export const generateV3InvoiceHtml = (data: {
    to_name: string;
    to_email: string;
    invoice_date: string;
    invoice_period: string;
    items: Array<{ desc: string; qty: number; price: number; amount: number }>;
    totals: { total: number; comm: number; payout: number };
    status: string;
}): string => {
    // Generate Rows
    const rows = data.items.map(item => `
    <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#334155;">
        <strong>${item.desc}</strong>
        </td>
        <td align="center" style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#334155;">
        ₹${item.price}
        </td>
        <td align="center" style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#334155;">
        ${item.qty}
        </td>
        <td align="right" style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#0f172a;">
        ₹${item.amount}
        </td>
    </tr>
    `).join("");

    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Invoice</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:24px 10px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
            style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;color:#0f172a;">
            
            <!-- HEADER -->
            <tr>
              <td style="padding:18px 20px;border-bottom:1px solid #e2e8f0;">
                <table role="presentation" width="100%">
                  <tr>
                    <td>
                      <div style="font-size:14px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                        Street Junkies India
                      </div>
                      <div style="font-size:11px;color:#64748b;letter-spacing:0.14em;text-transform:uppercase;">
                        Partner payout statement
                      </div>
                    </td>
                    <td align="right">
                      <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.14em;">
                        Status
                      </div>
                      <div style="display:inline-block;margin-top:4px;padding:3px 10px;border-radius:999px;border:1px solid #22c55e;background:#dcfce7;color:#166534;font-size:10px;font-weight:700;letter-spacing:0.12em;">
                        ${data.status}
                      </div>
                      <div style="margin-top:8px;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.14em;">
                        Date
                      </div>
                      <div style="font-size:12px;font-weight:700;">
                        ${data.invoice_date}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- FROM / TO -->
            <tr>
              <td style="padding:14px 20px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td width="50%" valign="top" style="padding-right:10px;">
                      <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:6px;">
                        From
                      </div>
                      <div style="font-size:12px;font-weight:700;margin-bottom:4px;">Street Junkies India</div>
                      <div style="font-size:12px;color:#475569;line-height:1.45;">
                        New Delhi – 110048<br />
                        India<br />
                        GST: 07ABMCS5480Q1ZD
                      </div>
                    </td>

                    <td width="50%" valign="top" style="padding-left:10px;">
                      <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:6px;">
                        To
                      </div>
                      <div style="font-size:12px;font-weight:700;margin-bottom:4px;">${data.to_name}</div>
                      <div style="font-size:12px;color:#475569;line-height:1.45;">
                        Monthly payout statement for <strong>${data.invoice_period}</strong>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ITEMS TABLE -->
            <tr>
              <td style="padding:0 20px 14px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                  style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                  
                  <thead>
                    <tr style="background:#f8fafc;">
                      <th align="left" style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.14em;">
                        Description
                      </th>
                      <th align="center" style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.14em;">
                        Price
                      </th>
                      <th align="center" style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.14em;">
                        Qty
                      </th>
                      <th align="right" style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.14em;">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    ${rows}
                  </tbody>
                </table>
              </td>
            </tr>

            <!-- SUMMARY -->
            <tr>
              <td style="padding:0 20px 14px 20px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td width="60%" valign="top">
                      <div style="font-size:12px;color:#475569;">
                        Commission is calculated on total sales. Payout is net due to <strong>${data.to_name}</strong>.
                      </div>
                    </td>
                    <td width="40%" valign="top" style="padding-left:10px;">
                      <table role="presentation" width="100%" style="font-size:12px;">
                        <tr>
                          <td style="padding:4px 0;color:#64748b;">Total</td>
                          <td align="right" style="padding:4px 0;font-weight:600;">₹${data.totals.total.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;color:#64748b;">Commission (20%)</td>
                          <td align="right" style="padding:4px 0;font-weight:600;">₹${data.totals.comm.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td style="padding-top:8px;border-top:1px dashed #e2e8f0;font-weight:800;">Payout</td>
                          <td align="right" style="padding-top:8px;border-top:1px dashed #e2e8f0;font-weight:800;color:#15803d;">
                            ₹${data.totals.payout.toLocaleString()}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="padding:16px 20px;border-top:1px solid #e2e8f0;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="font-size:10px;color:#94a3b8;">
                      Generated by Street Junkies Console. Not a valid tax invoice.
                    </td>
                    <td align="right">
                      <div style="font-size:12px;font-weight:700;">Admin</div>
                      <div style="font-size:10px;color:#64748b;">Street Junkies Team</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;
};
