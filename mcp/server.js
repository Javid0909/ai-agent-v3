// mcp/server.js
import express from "express";
import { tools } from "./tools.js";

const app = express();
app.use(express.json());

// --- Simple local MCP-like handler ---
const MCPServer = {
  tools: {},
  addTool(name, description, handler) {
    this.tools[name] = { description, handler };
  },
  async run(task) {
    const { tool, input } = task;
    const entry = this.tools[tool];
    if (!entry) throw new Error(`Tool not found: ${tool}`);
    return await entry.handler(input || {});
  },
};

// --- Register tools dynamically ---
for (const [name, { description, handler }] of Object.entries(tools)) {
  MCPServer.addTool(name, description, handler);
}

// --- REST endpoint ---
app.post("/mcp/run", async (req, res) => {
  try {
    const { task } = req.body;
    const result = await MCPServer.run(task);
    res.json(result);
  } catch (err) {
    console.error("MCP error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Start server ---
const PORT = process.env.MCP_PORT || 3001;
app.listen(PORT, () =>
  console.log(`🧠 MCP Server (local) running on http://localhost:${PORT}`)
);
