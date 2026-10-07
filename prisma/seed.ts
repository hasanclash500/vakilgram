import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

const providerChain = [
  {
    id: "llm-01-openrouter-primary",
    name: "OpenRouter Free Primary",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    position: 1
  },
  {
    id: "llm-02-openrouter-secondary",
    name: "OpenRouter Free Secondary",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    position: 2
  },
  {
    id: "llm-03-groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    position: 3
  },
  {
    id: "llm-04-gemini",
    name: "Google Gemini OpenAI-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKeyEnv: "GEMINI_API_KEY",
    position: 4
  },
  {
    id: "llm-05-cloudflare",
    name: "Cloudflare Workers AI",
    baseUrl:
      "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/v1",
    apiKeyEnv: "CLOUDFLARE_AI_API_KEY",
    position: 5
  },
  {
    id: "llm-06-openrouter-fallback",
    name: "OpenRouter Free Fallback",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    position: 6
  },
  {
    id: "llm-07-mistral",
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
    position: 7
  },
  {
    id: "llm-08-together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    apiKeyEnv: "TOGETHER_API_KEY",
    position: 8
  },
  {
    id: "llm-09-deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    position: 9
  },
  {
    id: "llm-10-custom",
    name: "OpenAI-compatible Custom Fallback",
    baseUrl: "https://replace.invalid/v1",
    apiKeyEnv: null,
    position: 10
  }
] as const;

async function main() {
  await prisma.setting.upsert({
    where: { key: "feature.voice" },
    update: { value: true },
    create: { key: "feature.voice", value: true }
  });

  await prisma.setting.upsert({
    where: { key: "legal.disclaimer" },
    update: {
      value: "این پاسخ صرفاً اطلاعات عمومی حقوقی است و جایگزین مشاوره رسمی وکیل نیست."
    },
    create: {
      key: "legal.disclaimer",
      value: "این پاسخ صرفاً اطلاعات عمومی حقوقی است و جایگزین مشاوره رسمی وکیل نیست."
    }
  });

  for (const provider of providerChain) {
    await prisma.aiProviderConfig.upsert({
      where: { id: provider.id },
      update: {},
      create: {
        ...provider,
        kind: "LLM",
        model: "configure-in-admin",
        enabled: false
      }
    });
  }

  await prisma.featuredTier.upsert({
    where: { id: "sample-tier" },
    update: {},
    create: {
      id: "sample-tier",
      name: "نمونه ساختگی - ویژه",
      priority: 10,
      costPerClick: 0n,
      active: false
    }
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
