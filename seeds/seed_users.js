"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = void 0;
function seed(knex) {
    return __awaiter(this, void 0, void 0, function* () {
        // Очищаем таблицу перед добавлением новых данных
        yield knex("users").del();
        // Добавляем пользователей
        yield knex("users").insert([
            { id: 1, tg_name: "Bad_Nikkname", role: "admin" },
            { id: 2, tg_name: "S2", role: "admin" }
        ]);
        console.log("✅ Сиды пользователей загружены!");
    });
}
exports.seed = seed;
