// api/ai-email.js – AI Email Assistant using Claude API

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return res.status(200).json({ error: "No AI key", subject: "", body: "" });

  try {
    const { prompt, customerName, company, context, senderName, signature, language } = req.body;
    const langMap = { de: "German", tr: "Turkish", en: "English", es: "Spanish", fr: "French", it: "Italian" };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `You are an email assistant for Windoform, a door and window accessories company. Write a professional business email.

Language: ${langMap[language] || "German"}
Customer: ${customerName} at ${company}
Context: ${context}
Request: ${prompt}
Sender: ${senderName}

Respond ONLY with JSON (no markdown, no backticks):
{
  "subject": "Email subject line",
  "body": "Email body text (use \\n for line breaks, DO NOT include signature)"
}

Keep it professional, warm, and concise. Max 150 words for the body.`
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(200).json({ error: err.message, subject: "", body: "" });
  }
}
