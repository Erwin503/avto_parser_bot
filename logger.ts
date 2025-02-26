import winston from "winston";

const logger = winston.createLogger({
    level: "debug",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message }) => `${level}: ${message}`)
            )
        }),
        new winston.transports.File({
            filename: "logs/app.log",
            level: "debug",
            options: { encoding: "utf8" }, // Добавляем поддержку UTF-8
            format: winston.format.printf(({ timestamp, level, message }) => {
                return `${timestamp} [${level.toUpperCase()}]: ${message}`;
            })
        })
    ]
});

export default logger;
