import axios from "axios";
import dotenv from "dotenv";
import logger from "../logger";
import { SocksProxyAgent } from "socks-proxy-agent";

dotenv.config();

const PROXY_URL = process.env.PROXY_URL;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const agent = PROXY_URL ? new SocksProxyAgent(PROXY_URL) : undefined;

export async function getArticleFromChatGPT(description: string): Promise<string | null> {
    if (!OPENAI_API_KEY) {
        logger.error("❌ Ошибка: API-ключ OpenAI отсутствует!");
        return null;
    }

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-3.5-turbo", // Если у вас есть доступ к GPT-4, можно заменить
                messages: [
                    { 
                        role: "system", 
                        content: `Ты — эксперт по автозапчастям. 
                        На основе описания пользователя **только выдай точный артикул** детали. 
                        **Никакого творчества, комментариев, слов — только артикул.**
                        Чтобы максимально упростить и ускорить процесс поиска артикула запчасти, следует воспользоваться специальными базами. Они есть практически у любого интернет-магазина. Таким образом, можно найти артикул запчасти по вин-коду автомобиля. Дополнительно потребуется ввести марку, модель машины, а также год ее выпуска
                       `
                    },
                    { role: "user", content: `Определи артикул для детали: "${description}"` }
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
