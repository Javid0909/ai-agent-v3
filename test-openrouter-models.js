import fetch from "node-fetch";
import "dotenv/config";

async function listModels() {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    console.log("✅ Available models in your OpenRouter account:\n");
    data.data.forEach((model) => {
      console.log("🧠", model.id);
    });
  } catch (error) {
    console.error("❌ Error fetching models:", error.message);
  }
}

listModels();
