// mcp/memoryTools.js
import fs from "fs";
import path from "path";
import "dotenv/config";

const memoryFile = path.resolve("./agent_memory.json");

// 🧠 Store structured memory
export async function storeMemory(
  id,
  text,
  type = "general",
  source = "manual",
  metadata = {}
) {
  try {
    // ✅ Ensure file exists
    if (!fs.existsSync(memoryFile)) {
      fs.writeFileSync(memoryFile, "[]");
    }

    // ✅ Read existing memories
    const memories = JSON.parse(fs.readFileSync(memoryFile, "utf8"));

    // ✅ Create new structured memory object
    const newMemory = {
      id,
      text,
      type, // e.g., "email", "meeting", "note"
      source, // e.g., "gmail", "calendar", "chatbot"
      metadata,
      timestamp: new Date().toISOString(),
    };

    // ✅ Append and save
    memories.push(newMemory);
    fs.writeFileSync(memoryFile, JSON.stringify(memories, null, 2));

    console.log("✅ Structured memory stored!");
    return "✅ Structured memory stored!";
  } catch (err) {
    console.error("❌ Error storing memory:", err.message);
    return "❌ Failed to store memory.";
  }
}

// 🧠 Retrieve stored memories (optional helper)
export function readMemories() {
  try {
    if (!fs.existsSync(memoryFile)) return [];
    return JSON.parse(fs.readFileSync(memoryFile, "utf8"));
  } catch (err) {
    console.error("❌ Error reading memory file:", err.message);
    return [];
  }
}
