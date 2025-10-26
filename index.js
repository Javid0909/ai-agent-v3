// index.js
import { storeMemory } from "./mcp/memoryTools.js";
import { google } from "googleapis";
import fetch from "node-fetch";
import "dotenv/config";

// ===============================
//  STEP 1️⃣ AUTHENTICATION SETUP
// ===============================
const serviceCredentials = JSON.parse(process.env.GOOGLE_SERVICE_KEY);
const sheetsAuth = new google.auth.GoogleAuth({
  credentials: serviceCredentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheetsClient = await sheetsAuth.getClient();
const sheets = google.sheets({ version: "v4", auth: sheetsClient });
console.log("📄 Authenticated as:", serviceCredentials.client_email);

const gmailToken = JSON.parse(process.env.GOOGLE_TOKEN_JSON);
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000"
);
oauth2Client.setCredentials(gmailToken);
const gmail = google.gmail({ version: "v1", auth: oauth2Client });

// ===============================
//  STEP 2️⃣ SPREADSHEET DETAILS
// ===============================
const spreadsheetId = "1evAhQ17tEBhd3f8OJwpD8umnTKnVPsuNKBQU9h2eHw0";
const sheetName = "Book(Sheet1)";

// ===============================
//  STEP 3️⃣ AI EMAIL GENERATION
// ===============================
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

  return `
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
}

// ===============================
//  STEP 4️⃣ EMAIL SENDING
// ===============================
async function sendEmail(to, firstName, lastName, fruit) {
  const htmlBody = await generateAIEmail(firstName, lastName, fruit);
  const subject = "Welcome to our AI Agent Workshop";

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

  // 🧠 Store memory in Pinecone
  await storeMemory(
    Date.now().toString(),
    `Email sent to ${firstName} ${lastName} (${to}) about ${fruit} AI Agent Workshop.`,
    "email",
    "gmail",
    {
      recipient: to,
      subject,
      sentAt: new Date().toISOString(),
    }
  );
}

// ===============================
//  STEP 5️⃣ SHEET PROCESSING (with anti-duplicate lock)
// ===============================
async function processSheet() {
  console.log("🚀 Processing sheet once...");

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:E`,
  });

  const rows = response.data.values || [];
  if (!rows.length) {
    console.log("⚠️ No data found in sheet.");
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    const [rowNum, firstName, lastName, fruit, email] = rows[i];
    const rowIndex = i + 2;
    if (!email) continue;

    const statusRange = `${sheetName}!F${rowIndex}`;
    const statusRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: statusRange,
    });
    const status = statusRes.data.values?.[0]?.[0];

    // Skip if already sent or currently being processed
    if (status?.includes("✅") || status?.includes("🕓")) {
      console.log(`⚠️ Skipping ${email} (status: ${status || "none"})`);
      continue;
    }

    // Mark as in progress to prevent double-send
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!F${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [["🕓 Sending..."]] },
    });
    console.log(`🕓 Marked ${email} as Sending...`);

    try {
      await sendEmail(email, firstName, lastName, fruit);

      const timestamp = new Date().toLocaleString("sv-SE");
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!F${rowIndex}:G${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [["✅ Sent", timestamp]] },
      });
      console.log(`✅ Updated status for ${email}`);
    } catch (err) {
      console.error(`❌ Failed to send to ${email}:`, err.message);
      // reset status if failed
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!F${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [["❌ Failed"]] },
      });
    }
  }
}

// ===============================
//  STEP 6️⃣ SCHEDULER (every 5 minutes)
// ===============================
const MINUTES = Number(process.env.RUN_EVERY_MINUTES || 5);
let running = false;

async function tick() {
  if (running) {
    console.log("⏳ Previous run still in progress. Skipping this tick.");
    return;
  }
  running = true;
  console.log(`⏱️ Tick started @ ${new Date().toISOString()}`);
  try {
    await processSheet();
  } catch (e) {
    console.error("❌ Tick failed:", e?.message || e);
  } finally {
    running = false;
    console.log(`✅ Tick finished @ ${new Date().toISOString()}`);
  }
}

// Run once immediately, then every N minutes
await tick();
setInterval(tick, MINUTES * 60 * 1000);

export { sendEmail, processSheet };
