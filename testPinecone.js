import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const listIndexes = async () => {
  const indexes = await pinecone.listIndexes();
  console.log("Your indexes:", indexes);
};

await listIndexes();
