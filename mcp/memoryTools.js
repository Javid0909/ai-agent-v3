import { Pinecone } from "@pinecone-database/pinecone";
import fetch from "node-fetch";
import "dotenv/config";

// ============================
// 🔹 Pinecone Setup
// ============================
if (!process.env.PINECONE_API_KEY) {
  console.error("❌ Missing PINECONE_API_KEY in environment!");
}
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Missing OPENAI_API_KEY in environment!");
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const indexName = process.env.PINECONE_INDEX || "ai-email-agent-v2";
let index;

async function initIndex() {
  try {
    index = pinecone.Index(indexName);
    console.log(`📦 Connected to Pinecone index: ${indexName}`);
  } catch (err) {
    console.error("❌ Failed to connect to Pinecone:", err.message);
  }
}
await initIndex();

// ============================
// 🛠 Helper: Retry wrapper
// ============================
async function fetchWithRetry(url, options, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      console.warn(`⚠️ Fetch attempt ${i + 1} failed: ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ============================
// 🧠 Store structured memory
// ============================
export async function storeMemory(id, text, type = "general", source = "manual", metadata = {}) {
  try {
    console.log("🚀 Creating embedding via OpenAI...");

    const embedRes = await fetchWithRetry("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    const embedData = await embedRes.json();
    const embedding = embedData?.data?.[0]?.embedding;

    if (!embedding?.length) {
      console.error("❌ No embedding returned:", embedData);
      return;
    }

    console.log(`🧩 Embedding created (vector length: ${embedding.length})`);

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
  } catch (err) {
    console.error("❌ Error storing memory in Pinecone:", err.message || err);
  }
}

// ============================
// 🔍 Retrieve stored memories
// ============================
export async function readMemories(queryText) {
  try {
    console.log("🔍 Creating query embedding via OpenAI...");
    const embedRes = await fetchWithRetry("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: queryText,
      }),
    });

    const data = await embedRes.json();
    const queryEmbedding = data?.data?.[0]?.embedding;
    if (!queryEmbedding?.length) {
      console.error("❌ No embedding returned for query:", data);
      return [];
    }

    console.log(`🧠 Query vector length: ${queryEmbedding.length}`);

    const results = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    console.log(`📄 Retrieved ${results.matches?.length || 0} memories.`);
    return results.matches?.map((m) => m.metadata) || [];
  } catch (err) {
    console.error("❌ Error reading memories:", err.message || err);
    return [];
  }
}
