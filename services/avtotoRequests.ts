import axios from "axios";
import qs from "qs";
import logger from "../logger";
import dotenv from "dotenv";
dotenv.config();

const AVTOTO_API_URL = "https://www.avtoto.ru/?soap_server=json_mode";

/**
 * Выполняет запрос SearchStart к Avtoto API.
 * Данные запроса передаются в виде массива:
 *   - Первый элемент – название метода ("SearchStart")
 *   - Второй элемент – JSON-строка с параметрами (user_id, user_login, user_password, search_code, search_cross)
 *
 * @param search_code - Артикул, введённый пользователем.
 * @returns Ответ сервера с process_id (например, ключ "process_id") или null.
 */
export async function searchStart(search_code: string): Promise<any | null> {
  const data = {
    search_code: search_code,
    search_cross: "off",
    user_id: Number(process.env.AVTOTO_USER_ID) || 1000000,
    user_login: process.env.AVTOTO_USER_LOGIN || "login",
    user_password: process.env.AVTOTO_USER_PASSWORD || "pass"
  };

  const dataString = JSON.stringify(data);

  const requestPayload = {
    action: "SearchStart",
    data: dataString
  };

  const serialized = qs.stringify(requestPayload);

  try {
    const response = await axios.post(AVTOTO_API_URL, serialized, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    if (response.data && response.data.ProcessSearchId) {
      return response.data;
    } else {
      logger.error("SearchStart: process_id не найден");
      return null;
    }
  } catch (error: any) {
    if (error.response) {
      logger.error(`SearchStart error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      logger.error(`SearchStart error: ${error.message}`);
    }
    return null;
  }
}

/**
 * Выполняет запрос SearchGetParts к Avtoto API с использованием ProcessSearchId.
 * Если данные ещё не готовы (Parts пустой), функция ждёт 500 мс и повторяет запрос до 10 секунд.
 *
 * @param processSearchId - Идентификатор процесса поиска.
 * @returns Ответ сервера с результатами или null при ошибке.
 */
export async function searchGetParts(processSearchId: string): Promise<any | null> {
  // Изменили ключ на "ProcessSearchId" согласно требованиям API
  const data = {
    ProcessSearchId: processSearchId
  };
  const dataString = JSON.stringify(data);
  const requestPayload = {
    action: "SearchGetParts",
    data: dataString
  };
  const serialized = qs.stringify(requestPayload);
  logger.info(`SearchGetParts payload: ${serialized}`);

  const maxWaitTime = 10000; // максимум 10 секунд
  const interval = 500;      // 500 мс задержка
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await axios.post(AVTOTO_API_URL, serialized, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      // Если массив Parts не пустой, возвращаем результат
      if (response.data && Array.isArray(response.data.Parts) && response.data.Parts.length > 0) {
        logger.debug(response.data[1])
        return response.data;
      }
      // Ждем 500 мс и повторяем запрос
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error: any) {
      if (error.response) {
        logger.error(`SearchGetParts error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        logger.error(`SearchGetParts error: ${error.message}`);
      }
      return null;
    }
  }

  logger.error("SearchGetParts: Время ожидания истекло, данные не получены");
  return null;
}
