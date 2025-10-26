// mcp/memoryTools.js
import { Pinecone } from "@pinecone-database/pinecone";
import fetch from "node-fetch";
import "dotenv/config";

// ============================
// 🔹 Startup Validation
// ============================
if (!process.env.OPENAI_API_KEY)
  console.warn("⚠️ Missing OPENAI_API_KEY — embeddings will fail.");
if (!process.env.PINECONE_API_KEY)
  console.warn("⚠️ Missing PINECONE_API_KEY — Pinecone won't store data.");
if (!process.env.PINECONE_INDEX)
  console.warn("⚠️ Missing PINECONE_INDEX — defaulting to ai-email-agent-v2.");

// ============================
// 🔹 Pinecone Setup
// ============================
let index;
try {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  index = pinecone.Index(process.env.PINECONE_INDEX || "ai-email-agent-v2");
  console.log(`📦 Connected to Pinecone index: ${process.env.PINECONE_INDEX || "ai-email-agent-v2"}`);
} catch (err) {
  console.error("❌ Failed to initialize Pinecone:", err.message);
}

// ============================
// 🧩 Helper: Create OpenAI Embedding
// ============================
async function getEmbedding(text) {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
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

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ OpenAI API Error (${res.status}):`, errText);
      return null;
    }

    const data = await res.json();
    const embedding = data?.data?.[0]?.embedding;

    if (!embedding?.length) {
      console.error("❌ No embedding returned:", data);
      return null;
    }

    return embedding;
  } catch (err) {
    console.error("❌ Embedding request failed:", err.message);
    return null;
  }
}

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
  if (!index) {
    console.error("❌ Pinecone index not initialized — skipping memory store.");
    return;
  }

  try {
    console.log("🧠 Creating embedding via OpenAI...");
    const embedding = await getEmbedding(text);
    if (!embedding) return;

    console.log(`🧩 Embedding vector length: ${embedding.length}`);

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
    console.error("❌ Error storing memory in Pinecone:", err.message);
  }
}

// ============================
// 🔍 Retrieve stored memories
// ============================
export async function readMemories(queryText) {
  if (!index) {
    console.error("❌ Pinecone index not initialized — skipping read.");
    return [];
  }

  try {
    console.log("🔍 Creating query embedding via OpenAI...");
    const queryEmbedding = await getEmbedding(queryText);
    if (!queryEmbedding) return [];

    console.log(`🧠 Query vector length: ${queryEmbedding.length}`);

    const results = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    const matches = results.matches || [];
    console.log(`📄 Retrieved ${matches.length} memories.`);
    return matches.map((m) => m.metadata);
  } catch (err) {
    console.error("❌ Error reading memories:", err.message);
    return [];
  }
}
