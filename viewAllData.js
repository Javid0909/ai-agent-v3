import { google } from "googleapis";
import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";

const serviceCredentials = JSON.parse(process.env.GOOGLE_SERVICE_KEY);
const sheetsAuth = new google.auth.GoogleAuth({
  credentials: serviceCredentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheetsClient = await sheetsAuth.getClient();
const sheets = google.sheets({ version: "v4", auth: sheetsClient });

const spreadsheetId = "1evAhQ17tEBhd3f8OJwpD8umnTKnVPsuNKBQU9h2eHw0";
const sheetName = "Book(Sheet1)";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX);

console.log("📊 Fetching all data...");

const sheet = await sheets.spreadsheets.values.get({
  spreadsheetId,
  range: `${sheetName}!A1:G`,
});
const rows = sheet.data.values || [];
console.log(`🧾 Google Sheet rows: ${rows.length}`);

const memories = await index.query({
  vector: Array(1536).fill(0),
  topK: 100,
  includeMetadata: true,
});
console.log(`🧠 Pinecone memories: ${memories.matches?.length || 0}`);

console.log("\n📄 Google Sheet Data:");
rows.forEach((r) => console.log(r.join(" | ")));

if (memories.matches?.length) {
  console.log("\n🧩 Pinecone Data:");
  memories.matches.forEach((m, i) => {
    console.log(`${i + 1}. ${m.metadata?.text}`);
  });
}
