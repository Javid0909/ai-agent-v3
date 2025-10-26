// listMemories.js
import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";

const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = client.Index(process.env.PINECONE_INDEX || "ai-email-agent-v2");

try {
  console.log("📊 Fetching all memory stats...");
  const stats = await index.describeIndexStats();
  console.log(JSON.stringify(stats, null, 2));

  console.log("\n🧠 Querying to preview recent memories...\n");

  const query = await index.query({
    vector: Array(1536).fill(0), // dummy zero vector to fetch recent data
    topK: 20,
    includeMetadata: true,
    includeValues: false,
  });

  query.matches.forEach((m, i) => {
    console.log(`${i + 1}. ID: ${m.id}`);
    console.log(`   Type: ${m.metadata?.type}`);
    console.log(`   Source: ${m.metadata?.source}`);
    console.log(`   Text: ${m.metadata?.text}`);
    console.log(`   Timestamp: ${m.metadata?.timestamp}`);
    console.log("--------------------------------------");
  });
} catch (err) {
  console.error("❌ Error:", err.message);
}
