import { google } from "googleapis";
import "dotenv/config";
import fs from "fs";
import http from "http";
import url from "url";

// --- Step 1: Configure OAuth2 client ---
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000" // Must match redirect URI in Google Cloud
);

// --- Step 2: Define scopes (Gmail + Sheets) ---
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/gmail.send",
];

// --- Step 3: Create authorization URL ---
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
});

// --- Step 4: Start local web server to catch redirect ---
const server = http.createServer(async (req, res) => {
  try {
    if (req.url.includes("/?code=")) {
      const query = new url.URL(req.url, "http://localhost:3000").searchParams;
      const code = query.get("code");

      // Respond to browser
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <h2 style="font-family:sans-serif;">✅ Authorization successful!</h2>
        <p>You can close this tab and return to the terminal.</p>
      `);

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Save tokens locally
      fs.writeFileSync("token.json", JSON.stringify(tokens, null, 2));
      console.log("\n✅ Access & refresh tokens saved to token.json");

      server.close();
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h2>Waiting for Google authorization...</h2>");
    }
  } catch (err) {
    console.error("❌ Error during OAuth flow:", err);
    res.end("<h2>❌ Error during authentication. Check terminal.</h2>");
    server.close();
  }
});

// --- Step 5: Start server and prompt user ---
server.listen(3000, () => {
  console.log("🌐 Listening on http://localhost:3000");
  console.log("\n🔗 Open this URL in your browser to authorize:\n");
  console.log(authUrl);
});
