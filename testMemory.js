import { storeMemory, recallMemory } from "./mcp/memoryTools.js";

async function run() {
  console.log("========== GENAITON STRUCTURED MEMORY TEST ==========");

  await storeMemory(
    "2",
    "Email sent to Anna about GenAition workshop on 6 Dec.",
    "email",
    "gmail",
    { recipient: "Anna", subject: "GenAition Workshop", date: "2025-12-06" }
  );

  await storeMemory(
    "3",
    "Scheduled Zoom call with Viktor regarding AI agent updates.",
    "meeting",
    "calendar",
    { participant: "Viktor", platform: "Zoom", time: "15:00 CET" }
  );

  const memories = await recallMemory("AI agent");
  console.log("🧠 Recall result:", memories);
}

run();
