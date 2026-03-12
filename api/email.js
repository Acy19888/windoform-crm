// api/email.js – Send emails with tracking pixel

import nodemailer from "nodemailer";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { to, subject, html, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, senderName, trackingId } = req.body;
    if (!to || !smtpHost || !smtpUser || !smtpPass) return res.status(400).json({ error: "Missing fields" });

    const port = parseInt(smtpPort) || 465;
    const transporter = nodemailer.createTransport({
      host: smtpHost, port, secure: port === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    });

    // Append tracking pixel if trackingId provided
    let finalHtml = html;
    if (trackingId) {
      const baseUrl = `https://${req.headers.host}`;
      finalHtml += `<img src="${baseUrl}/api/track?id=${trackingId}" width="1" height="1" style="display:none" alt="" />`;
    }

    const info = await transporter.sendMail({
      from: `"${senderName || "Windoform"}" <${smtpFrom || smtpUser}>`,
      to, subject, html: finalHtml,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
