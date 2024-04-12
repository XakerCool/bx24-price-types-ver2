import express from "express"
import bodyParser from "body-parser";

import {Logger} from "./logger/logger.js"

import { ProductsController } from "./controllers/product.controller.js";
import { DealCreatedController } from "./controllers/deal-created.controller.js";
import { FsDealsController } from "./controllers/fs_deals.controller.js";
import {DealUpdatedController} from "./controllers/deal-updated.controller.js";

const app = express()
const port = 5500

const logger = new Logger()
const fs = new FsDealsController()

app.use(bodyParser.urlencoded({ extended: true }))


/*
* Обработчик создания сделки, отвечает на запрос от исходящего вебхука, содержащего ссылку из входящего вебхука (необходимо для функционала)
* Пример ссылки входящего вебхука - http://example.com/deal-created?link=ссылкаИзВходящеговебхука
* */
app.post("/deal-created", async (req, res) => {
    setTimeout(async ()=> {
        let dealId = null
        try {
            // получаем ссылку входящего вебхука из реквест параметров
            const incomingWebhookUrl = req.query.link ? req.query.link : null;

            // получаем ID сделки из тела реквеста. Для этого необходим bodyParser.urlencoded({extended: true})
            dealId = req.body.data.FIELDS.ID ? req.body.data.FIELDS.ID : null;
            if (incomingWebhookUrl && dealId) {

                // Инициализация рабочиъ классов
                const controller = new DealCreatedController(incomingWebhookUrl)
                const clientData = await controller.getDealClientInfo(dealId)
                clientData.products = await controller.getProducts(dealId, clientData.priceType.value)

                // Запись данных в файл. Пример файла можно найти в папке deals
                await fs.writeF(dealId, clientData)
            } else {
                console.log("Data is null")
            }
        } catch (error) {
            logger.errorLog(`/deal-created (dealId: ${dealId})`, error.message)
        }
    }, 1000)

})

/*
* Обработчик обновления сделки, отвечает на запрос от исходящего вебхука, содержащего ссылку из входящего вебхука (необходимо для функционала)
* Пример ссылки входящего вебхука - http://example.com/deal-updated?link=ссылкаИзВходящеговебхука
* */
let isHandlerActive = 0
app.post("/deal-updated", async (req, res) => {
    console.log(isHandlerActive)
    // Проверка на повторное срабатывание хендлера
    if (!(isHandlerActive >= 0)) {
        console.log("again")
        return;
    }
    isHandlerActive--;
    let dealId = null
    try {
        // Получение ссылки входящего вебхука из реквест параметров
        const incomingWebhookUrl = req.query.link ? req.query.link : null;

        // получаем ID сделки из тела реквеста. Для этого необходим bodyParser.urlencoded({extended: true})
        dealId = req.body.data.FIELDS.ID ? req.body.data.FIELDS.ID : null;
        if (incomingWebhookUrl && dealId) {

            // Инициализация рабочего класса
            const controller = new DealUpdatedController(incomingWebhookUrl)
            await controller.setProduct(dealId)
            console.log("2")
            isHandlerActive++;
        } else {
            console.log("Data is null")
        }
    } catch (error) {
        logger.errorLog(`/deal-updated (dealId: ${dealId})`, error.message)
    }
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})