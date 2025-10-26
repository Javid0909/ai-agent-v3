import { storeMemory, readMemories } from "./mcp/memoryTools.js";

console.log("🚀 Testing OpenAI embeddings + Pinecone memory write...");

const run = async () => {
  const id = "memory-test-1";
  const text = "GenAition builds real AI agents for workflow automation.";

  await storeMemory(id, text);

  const results = await readMemories("What does GenAition build?");
  console.log("🧾 Retrieved memories:", results);
};

run();
