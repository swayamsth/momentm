import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { planName, price, userName, userEmail, transactionId, billingDate } = await req.json();

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invoice</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
  <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:28px 32px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px;">Receipt from</p>
          <h1 style="color:white;font-size:24px;font-weight:700;margin:0;">Momentm</h1>
        </div>
        <div style="text-align:right;">
          <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:0 0 2px;">Invoice</p>
          <p style="color:white;font-size:13px;font-weight:600;margin:0;">#${transactionId}</p>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#555;font-size:14px;margin:0 0 24px;">Hi ${userName || "there"}, thank you for your purchase! Here is your invoice.</p>

      <!-- Invoice details -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="text-align:left;padding:10px 14px;font-size:12px;color:#777;font-weight:600;text-transform:uppercase;border-radius:6px 0 0 6px;">Description</th>
            <th style="text-align:left;padding:10px 14px;font-size:12px;color:#777;font-weight:600;text-transform:uppercase;">Period</th>
            <th style="text-align:right;padding:10px 14px;font-size:12px;color:#777;font-weight:600;text-transform:uppercase;border-radius:0 6px 6px 0;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:14px;font-size:14px;color:#111;font-weight:600;border-bottom:1px solid #f0f0f0;">${planName}</td>
            <td style="padding:14px;font-size:14px;color:#555;border-bottom:1px solid #f0f0f0;">Monthly subscription</td>
            <td style="padding:14px;font-size:14px;color:#111;font-weight:600;text-align:right;border-bottom:1px solid #f0f0f0;">$${price}.00</td>
          </tr>
        </tbody>
      </table>

      <!-- Total -->
      <div style="background:#f0f4ff;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <span style="font-size:15px;font-weight:600;color:#333;">Total charged</span>
        <span style="font-size:20px;font-weight:700;color:#3b82f6;">$${price}.00</span>
      </div>

      <!-- Meta -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#777;width:140px;">Date</td>
          <td style="padding:6px 0;font-size:13px;color:#333;">${billingDate}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#777;">Transaction ID</td>
          <td style="padding:6px 0;font-size:13px;color:#333;font-family:monospace;">${transactionId}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#777;">Plan</td>
          <td style="padding:6px 0;font-size:13px;color:#333;">${planName} — renews monthly</td>
        </tr>
      </table>

      <p style="color:#888;font-size:12px;line-height:1.6;border-top:1px solid #eee;padding-top:16px;margin:0;">
        This is your payment receipt from Momentm. If you have any questions, please contact our support team.
        You can cancel your subscription at any time from your account settings.
      </p>
    </div>

    <div style="background:#f8f9fa;padding:16px 32px;text-align:center;">
      <p style="color:#aaa;font-size:12px;margin:0;">Momentm &mdash; Build habits, together</p>
    </div>
  </div>
</body>
</html>`;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    console.log("[invoice] Gmail credentials not set — invoice not sent.");
    return NextResponse.json({ sent: false });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"Momentm" <${gmailUser}>`,
      to: userEmail,
      subject: `Your Momentm Invoice — ${planName} ($${price}.00)`,
      html,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[invoice] Send failed:", err);
    return NextResponse.json({ sent: false });
  }
}
