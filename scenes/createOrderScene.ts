import { Context } from "telegraf";
import { Scenes } from "telegraf";

export interface CreateOrderState extends Scenes.SceneSessionData {
  partNumber?: string;
  details?: Array<{
    brand: string;
    price: string;
    deliveryTime: string;
  }>;
}

export type MyContext = Context & Scenes.SceneContext<CreateOrderState>;
