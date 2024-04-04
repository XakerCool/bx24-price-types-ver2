import express from "express"
import bodyParser from "body-parser";

import {Logger} from "./logger/logger.js"

import { ProductsController } from "./controllers/product.controller.js";
import { DealCreatedController } from "./controllers/deal-created.controller.js";
import { FsDealsController } from "./controllers/fs_deals.controller.js";

const app = express()
const port = 5500

const logger = new Logger()
const fs = new FsDealsController()

app.use(bodyParser.urlencoded({ extended: true }))

app.post("/deal-created", async (req, res) => {
    let dealId = null
    try {
        const incomingWebhookUrl = req.query.link ? req.query.link : null;
        dealId = req.body.data.FIELDS.ID ? req.body.data.FIELDS.ID : null;
        if (incomingWebhookUrl && dealId) {
            const controller = new DealCreatedController(incomingWebhookUrl)
            const clientData = await controller.getDealClientInfo(dealId)
            clientData.products = await controller.getProducts(dealId, clientData.priceType.value)
            await fs.writeFile(dealId, clientData)
        } else {
            console.log("Data is null")
        }
    } catch (error) {
        logger.errorLog(`/deal-created (dealId: ${dealId})`, error.message)
    }
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})