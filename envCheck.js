import "dotenv/config";

console.log("OPENROUTER key:", process.env.OPENROUTER_API_KEY ? "✅ loaded" : "❌ missing");
console.log("HF key:", process.env.HF_API_KEY ? "✅ loaded" : "❌ missing");
console.log("PINECONE key:", process.env.PINECONE_API_KEY ? "✅ loaded" : "❌ missing");
