// mcp/memoryTools.js
import { Pinecone } from "@pinecone-database/pinecone";
import fetch from "node-fetch";
import "dotenv/config";

// ============================
// 🔹 Pinecone setup
// ============================
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.Index(process.env.PINECONE_INDEX || "ai-agent-memory");

// ============================
// 🧠 Store structured memory
// ============================
export async function storeMemory(
  id,
  text,
  type = "general",
  source = "manual",
  metadata = {}
) {
  try {
    // 1️⃣ Create embedding for the text
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    const embedData = await embedRes.json();
    const embedding = embedData.data[0].embedding;

    // 2️⃣ Store in Pinecone
    await index.upsert([
      {
        id,
        values: embedding,
        metadata: {
          text,
          type,
          source,
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      },
    ]);

    console.log(`✅ Memory stored in Pinecone (ID: ${id})`);
    return "✅ Memory stored in Pinecone!";
  } catch (err) {
    console.error("❌ Error storing memory in Pinecone:", err);
    return "❌ Failed to store memory in Pinecone.";
  }
}

// ============================
// 🧠 Retrieve stored memories
// ============================
export async function readMemories(queryText) {
  try {
    // Convert query to embedding
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: queryText,
      }),
    });

    const embedData = await embedRes.json();
    const queryEmbedding = embedData.data[0].embedding;

    // Search Pinecone
    const results = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    console.log(`🔍 Found ${results.matches.length} similar memories`);
    return results.matches.map((m) => m.metadata);
  } catch (err) {
    console.error("❌ Error retrieving from Pinecone:", err);
    return [];
  }
}
