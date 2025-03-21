import axios from "axios";
import dotenv from "dotenv";
import logger from "../logger";
import { SocksProxyAgent } from "socks-proxy-agent";

dotenv.config();

const PROXY_URL = process.env.PROXY_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const agent = PROXY_URL ? new SocksProxyAgent(PROXY_URL) : undefined;

export interface ChatGPTInput {
  model: string;
  year: string;
  description: string;
}

export async function getArticleFromChatGPT(input: ChatGPTInput): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    logger.error("❌ Ошибка: API-ключ OpenAI отсутствует!");
    return null;
  }

  // Формируем сообщение для пользователя, объединяя модель, год выпуска и описание детали
  const userContent = `Определи артикул для детали. Модель: "${input.model}", Год выпуска: "${input.year}", Описание: "${input.description}"`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo", // Если есть доступ к GPT-4, можно заменить
        messages: [
          {
            role: "system",
            content: `Ты — эксперт по автозапчастям. На основе предоставленных данных выдай **только точный артикул** детали.
Не добавляй никаких пояснений, комментариев или лишних слов — только один артикул.`
          },
          { role: "user", content: userContent }
        ],
        max_tokens: 20
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        httpsAgent: agent
      }
    );

    const chatResponse = response.data.choices[0].message.content.trim();
    logger.info(`🔍 ChatGPT ответил: ${chatResponse}`);

    if (chatResponse.toLowerCase().includes("недостаточно данных")) {
      logger.warn(`⚠ ChatGPT не смог определить артикул.`);
      return null;
    }

    return chatResponse;
  } catch (error: any) {
    if (error.response?.status === 403 && error.response?.data?.error?.code === "unsupported_country_region_territory") {
      logger.error("❌ OpenAI API заблокирован в вашем регионе. Используйте VPN или попробуйте альтернативный API.");
      return "❌ OpenAI API недоступен в вашем регионе. Попробуйте включить VPN или свяжитесь с менеджером.";
    }
    logger.error(`❌ Ошибка при запросе к ChatGPT: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
    return null;
  }
}
