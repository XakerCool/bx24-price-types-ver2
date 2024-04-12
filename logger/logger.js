import fs from "fs";

// Класс для логирования: Ошибок, Успеха работы, Попытки работы
export class Logger {
    errorLogFilePath = "./logs/error-logs.log"
    accessLogFilePath = "./logs/access-logs.log"
    successLogFilePath = "./logs/success-logs.log"
    constructor() {}

    errorLog(source, msg) {
        try {
            let errorLog = `ERROR ${this.setDate()} ${source} - ${msg}`
            fs.appendFile(this.errorLogFilePath, errorLog + "\n", (err) => {
                if (err)
                    console.error(`ERROR ${this.setDate()}: error while writing to error-log file: ${err}`)
            })
        } catch (error) {
            console.error(`ERROR ${this.setDate()} errorLog: ${error.message}`)
        }

    }

    accessLog(source, msg) {
        try {
            let accessLog = `ACCESS ${this.setDate()} ${source} - ${msg}`
            fs.appendFile(this.accessLogFilePath, accessLog + "\n", (err) => {
                if (err)
                    console.error(`ERROR ${this.setDate()}: error while writing to access-log file: ${err}`)
            })
        } catch (error) {
            console.error(`ERROR ${this.setDate()} accessLog: ${error.message}`)
        }
    }

    successLog(source, msg) {
        try {
            let successLog = `SUCCESS ${this.setDate()} ${source} - ${msg}`
            fs.appendFile(this.successLogFilePath, successLog + "\n", (err) => {
                if (err)
                    console.error(`ERROR ${this.setDate()}: error while writing to success-log file: ${err}`)
            })
        } catch (error) {
            console.error(`ERROR ${this.setDate()} successLog: ${error.message}`)
        }
    }

    setDate() {
        const currentDate = new Date();
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // Месяцы в JavaScript начинаются с 0
        const year = currentDate.getFullYear();
        const hours = currentDate.getHours().toString().padStart(2, '0');
        const minutes = currentDate.getMinutes().toString().padStart(2, '0');
        const seconds = currentDate.getSeconds().toString().padStart(2, '0');

        return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`
    }
}