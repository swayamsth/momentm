import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { coachName, coachFocus, date, time, price, userEmail, userName } = await req.json();

  const formattedDate = new Date(date).toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Booking Confirmation</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
  <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);border-radius:10px;padding:10px 20px;">
        <span style="color:white;font-size:20px;font-weight:bold;">Momentm</span>
      </div>
    </div>

    <h2 style="color:#111;font-size:20px;margin:0 0 6px;">Your Session is Confirmed!</h2>
    <p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${userName || "there"}, your coaching session has been successfully booked.</p>

    <div style="background:#f0f4ff;border-radius:10px;padding:20px;margin-bottom:24px;border-left:4px solid #3b82f6;">
      <p style="font-size:13px;color:#555;font-weight:600;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.05em;">Your booking</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#777;font-size:14px;padding:5px 0;width:110px;font-weight:600;">Coach</td>
          <td style="color:#111;font-size:14px;padding:5px 0;font-weight:600;">${coachName}</td>
        </tr>
        <tr>
          <td style="color:#777;font-size:14px;padding:5px 0;font-weight:600;">Specialty</td>
          <td style="color:#111;font-size:14px;padding:5px 0;">${coachFocus}</td>
        </tr>
        <tr>
          <td style="color:#777;font-size:14px;padding:5px 0;font-weight:600;">Date</td>
          <td style="color:#111;font-size:14px;padding:5px 0;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="color:#777;font-size:14px;padding:5px 0;font-weight:600;">Time</td>
          <td style="color:#111;font-size:14px;padding:5px 0;">${time}</td>
        </tr>
        <tr>
          <td style="color:#777;font-size:14px;padding:5px 0;font-weight:600;">Price</td>
          <td style="color:#111;font-size:14px;padding:5px 0;">$${price} / session</td>
        </tr>
      </table>
    </div>

    <p style="color:#555;font-size:13px;line-height:1.6;">Your coach will reach out shortly with session details. Make sure to check your inbox before your scheduled time.</p>

    <div style="text-align:center;margin-top:28px;padding-top:24px;border-top:1px solid #eee;">
      <p style="color:#aaa;font-size:12px;margin:0;">Momentm &mdash; Build habits, together</p>
    </div>
  </div>
</body>
</html>`;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    console.log("[book-session] Gmail credentials not set — email not sent.");
    return NextResponse.json({ success: true, emailSent: false });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"Momentm" <${gmailUser}>`,
      to: userEmail,
      subject: `Your appointment with ${coachName} is booked — ${formattedDate} at ${time}`,
      html,
    });

    return NextResponse.json({ success: true, emailSent: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[book-session] Gmail send failed:", message);
    return NextResponse.json({ success: true, emailSent: false, error: message });
  }
}
