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

const index = pinecone.Index(process.env.PINECONE_INDEX || "agent-memory");

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
    // 1️⃣ Create embedding using llama-text-embed-v2 (dimension 1024)
    const embedRes = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-embed", // ✅ matches your Pinecone config (1024 dim)
        input: text,
      }),
    });

    const embedData = await embedRes.json();

    if (!embedData?.data?.[0]?.embedding) {
      console.error("❌ No embedding returned:", embedData);
      return "❌ Failed to generate embedding.";
    }

    const embedding = embedData.data[0].embedding;

    // 2️⃣ Upsert into Pinecone
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
    console.error("❌ Error storing memory in Pinecone:", err.message);
    return "❌ Failed to store memory in Pinecone.";
  }
}

// ============================
// 🧠 Retrieve stored memories
// ============================
export async function readMemories(queryText) {
  try {
    // 1️⃣ Create embedding for the query (same model)
    const embedRes = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-embed",
        input: queryText,
      }),
    });

    const embedData = await embedRes.json();
    if (!embedData?.data?.[0]?.embedding) {
      console.error("❌ No query embedding returned:", embedData);
      return [];
    }

    const queryEmbedding = embedData.data[0].embedding;

    // 2️⃣ Query Pinecone
    const results = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    console.log(`🔍 Found ${results.matches.length} similar memories`);
    return results.matches.map((m) => m.metadata);
  } catch (err) {
    console.error("❌ Error retrieving from Pinecone:", err.message);
    return [];
  }
}
