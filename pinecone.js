// pinecone.js
import "dotenv/config";           // ✅ Add this line
import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export const index = pinecone.Index(process.env.PINECONE_INDEX);
