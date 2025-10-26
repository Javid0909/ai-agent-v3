// mcp/tools.js
import { sendEmail, processSheet } from "../index.js";
import { storeMemory, recallMemory } from "./memoryTools.js";

export const tools = {
  send_email: {
    description: "Send AI-generated email via Gmail based on sheet data.",
    handler: async (input) => {
      const { to, firstName, lastName, fruit } = input;
      await sendEmail(to, firstName, lastName, fruit);
      return { status: "✅ Email sent", recipient: to };
    },
  },

  check_sheet: {
    description: "Read Google Sheet and send unsent emails.",
    handler: async () => {
      await processSheet();
      return { status: "✅ Sheet processed" };
    },
  },

  // 🧠 NEW TOOLS BELOW ---------------------
  store_memory: {
    description: "Store text as long-term memory in Pinecone.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        text: { type: "string" },
      },
      required: ["id", "text"],
    },
    handler: async ({ id, text }) => {
      const result = await storeMemory(id, text);
      return { status: result };
    },
  },

  recall_memory: {
    description: "Retrieve similar text memories from Pinecone.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
    },
    handler: async ({ query }) => {
      const results = await recallMemory(query);
      return { memories: results };
    },
  },
};
