// mcp/tools.js
import { sendEmail, processSheet } from "../index.js";

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
};
