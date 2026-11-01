import { SarvamAIClient } from "sarvamai";

// Load environment variables from .env (built into Node.js 20+)
process.loadEnvFile();

const apiKey = process.env.SARVAM_API_KEY;
if (!apiKey) {
  console.error("Error: SARVAM_API_KEY is not set in the environment.");
  process.exit(1);
}

// SarvamAIClient automatically picks up process.env.SARVAM_API_KEY
const client = new SarvamAIClient({
  apiSubscriptionKey: apiKey,
});

async function main() {
  console.log("Calling Sarvam AI Chat API...");

  const response = await client.chat.completions({
    model: "sarvam-105b",
    messages: [
      {
        role: "user",
        content: "Namaste! In 2 concise sentences, introduce Sarvam AI and what makes it special.",
      },
    ],
  });

  const reply = response.choices?.[0]?.message?.content;
  console.log("\nResponse from Sarvam AI:");
  console.log(reply);
}

main().catch((err) => {
  console.error("Error making API call:", err);
  process.exit(1);
});
