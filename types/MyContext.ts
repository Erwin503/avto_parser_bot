import { Context } from 'telegraf';

export interface MyContext extends Context {
  session?: {
    partsResult?: any;
    // Можно добавить и другие свойства сессии при необходимости
  }
}
