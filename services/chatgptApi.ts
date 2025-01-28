import axios from "axios";
import dotenv from "dotenv";
import { SocksProxyAgent } from "socks-proxy-agent";
import logger from "../logger";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PROXY_URL = process.env.PROXY_URL; // Формат: socks5://user:password@ip:port

export async function getArticleFromChatGPT(description: string): Promise<string | null> {
    if (!OPENAI_API_KEY) {
        logger.error("❌ Ошибка: API-ключ OpenAI отсутствует!");
        return null;
    }

    const agent = PROXY_URL ? new SocksProxyAgent(PROXY_URL) : undefined;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "Ты — эксперт по автозапчастям. Найди артикул по описанию." },
                    { role: "user", content: `Определи артикул для детали: "${description}"` }
                ]
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                },
                httpsAgent: agent
            }
        );

        return response.data.choices[0].message.content.trim();
    } catch (error: any) {
        logger.error(`❌ Ошибка при запросе к ChatGPT: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
        return "45124375611";
    }
}
