// mcp/server.js
import express from "express";
import bodyParser from "body-parser";
import { sendEmail, processSheet } from "../index.js"; // Import from your main logic file

const app = express();
app.use(bodyParser.json());

// --- Health Check (for Render & testing) ---
app.get("/healthz", (req, res) => {
  res.send("🧠 MCP Server is running and ready!");
});

// --- Root Endpoint ---
app.get("/", (req, res) => {
  res.send("✅ MCP AI Email Agent is active (controlled mode)");
});

// --- Manual Control Endpoint ---
app.post("/run", async (req, res) => {
  try {
    const { task } = req.body;

    if (!task) {
      return res.status(400).json({ error: "Missing 'task' in request body." });
    }

    console.log(`⚙️  MCP received task: ${task}`);

    if (task === "processSheet") {
      await processSheet();
      return res.json({ status: "✅ Sheet processed successfully" });
    }

    if (task === "sendEmail") {
      const { to, firstName, lastName, fruit } = req.body;
      if (!to || !firstName) {
        return res.status(400).json({ error: "Missing 'to' or 'firstName' in body" });
      }
      await sendEmail(to, firstName, lastName, fruit || "apple");
      return res.json({ status: `📧 Email sent to ${to}` });
    }

    return res.status(400).json({ error: `Unknown task: ${task}` });
  } catch (err) {
    console.error("❌ MCP run error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Start MCP Server ---
const PORT = process.env.PORT || 3000; // Render expects port 3000
app.listen(PORT, () => console.log(`🌐 MCP Server running on port ${PORT}`));
