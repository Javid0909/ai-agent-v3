import { google } from "googleapis";
import fetch from "node-fetch";
import "dotenv/config";

// --- Step 1: Authenticate with Service Account (via environment variable) ---
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_KEY);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send",
  ],
});

const gmail = google.gmail({ version: "v1", auth });
const sheets = google.sheets({ version: "v4", auth });

// --- Step 2: Spreadsheet details ---
const spreadsheetId = "1evAhQ17tEBhd3f8OJwpD8umnTKnVPsuNKBQU9h2eHw0";
const sheetName = "Book(Sheet1)";

// --- Step 3: AI email generator ---
async function generateAIEmail(firstName, lastName, fruit) {
  console.log(`🧠 Generating AI email for ${firstName} ${lastName}...`);

  const prompt = `
Write a short, professional, and engaging email to ${firstName} ${lastName}, whose favourite fruit is ${fruit}, inviting them to join our upcoming AI Agent Workshop.

Do not include a subject line.

In the email:
- Start with a warm greeting using their first name.
- Mention that they can benefit from learning how to build AI agents to boost efficiency and unlock new opportunities.
- Highlight that the workshop is hands-on, practical, and no-code, making it easy to follow.
- Mention that it will help them save time, automate tasks, and explore how AI agents can support entrepreneurs and innovators.
- Add a call-to-action with a registration link: https://genaition.io/event-1/
- Keep the tone friendly yet professional.
- End with a warm closing and my signature: Best regards, Javid Valiyev, GenAition Team
`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful AI writing assistant." },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || "";

  const htmlBody = `
  <html>
    <body style="font-family:Arial,sans-serif;background-color:#f6f8fa;margin:0;padding:0;">
      <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#f6f8fa;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.05);overflow:hidden;">
              <tr>
                <td style="padding:30px;">
                  <h2 style="color:#222;text-align:center;margin-top:0;margin-bottom:20px;font-weight:600;font-size:22px;">
                    Welcome to our AI Agent Workshop
                  </h2>
                  <div style="color:#444;font-size:15px;line-height:1.7;">
                    ${text.replace(/\n\s*\n/g, "</p><p>").replace(/\n/g, "<br>")}
                  </div>
                  <div style="text-align:center;margin-top:35px;">
                    <a href="https://genaition.io/event-1/"
                      style="display:inline-block;padding:12px 24px;background-color:#16a34a;color:white;text-decoration:none;border-radius:8px;font-weight:600;">
                      Register Now
                    </a>
                  </div>
                  <p style="color:#888;text-align:center;margin-top:40px;font-size:13px;">
                    Best regards,<br>
                    <strong>Javid Valiyev</strong><br>
                    GenAition Team
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  return htmlBody;
}

// --- Step 4: Send email ---
async function sendEmail(to, firstName, lastName, fruit) {
  const htmlBody = await generateAIEmail(firstName, lastName, fruit);

  const subject = `Welcome to our AI Agent Workshop`;
  const emailLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    htmlBody,
  ];

  const email = emailLines.join("\n");
  const encodedMessage = Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });

  console.log(`📧 Email sent to ${to}`);
}

// --- Step 5: Process Google Sheet ---
async function processSheet() {
  console.log("🚀 Starting AI Email Agent...");

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:E`,
  });

  const rows = response.data.values || [];
  console.log(`📊 Found ${rows.length} rows.`);

  if (!rows.length) {
    console.log("⚠️ No data found in sheet.");
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    const [rowNum, firstName, lastName, fruit, email] = rows[i];
    if (!email) continue;

    try {
      await sendEmail(email, firstName, lastName, fruit);

      const rowIndex = i + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!F${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [["✅ Sent"]] },
      });

      console.log(`✅ Updated status for ${email}`);
    } catch (error) {
      console.error(`❌ Error for ${email}:`, error.message);
    }
  }
}

// --- Step 6: Run agent ---
processSheet();
