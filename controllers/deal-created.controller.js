import {Bitrix} from "@2bad/bitrix"

import {Logger} from "../logger/logger.js";
import {FsDealsController} from "./fs_deals.controller.js";
import {ProductsController} from "./product.controller.js";

// Контроллер создания сделки
export class DealCreatedController {
    bx = null
    productController = null
    logger = null
    constructor(link) {
        this.bx = Bitrix(link)
        this.productController = new ProductsController(link)
        this.logger = new Logger()
    }

    // Получение данных о клиенте
    async getDealClientInfo(dealId) {
        try {
            // Получение нужной нам сделки
            const deal = await this.bx.deals.get(dealId)
            // Получение ID клиента из сделки
            const clientId = deal.result.CONTACT_ID
            if (clientId) {
                const client = await this.bx.call("crm.contact.get", { id: clientId })
                    .then(res => res.result)
                    .catch(error => this.logger.errorLog("(/deal-created) crm.contact.get", error.message))
                const clientFields = await this.bx.call("crm.contact.fields", {})
                    .then(res => res.result)
                    .catch(error => this.logger.errorLog("(/deal-created) crm.contact.fields", error.message))
                const priceTypeField = {}
                Object.entries(clientFields).forEach(field => {
                    field.forEach(item => {
                        if (item.formLabel === "Тип цены") { // ВАЖНО. В crm у клиента должно быть поле Тип цены в виде списка. Название тип цены обязательно, чтобы приложение работало
                            priceTypeField.title = item.title
                            if (clientFields[item.title].type === 'string') {
                                priceTypeField.value = client[item.title] ? client[item.title] : "розница"
                            } else if (clientFields[item.title].type === 'enumeration' && clientFields[item.title].items) {
                                for (const field of clientFields[item.title].items) {
                                    if (parseInt(field.ID) === parseInt(client[item.title])) {
                                        priceTypeField.value = field.VALUE
                                        break;
                                    }
                                }
                            }
                        }
                    })
                })
                const clientName = client.NAME
                const clientLastName = client.LAST_NAME
                return {
                    dealId: dealId,
                    clientId: client.ID,
                    clientName: (clientName ? clientName : "") + " " + (clientLastName ? clientLastName : ""),
                    priceType: priceTypeField
                }
            } else {
                this.logger.errorLog("(/deal-created) getDealClientInfo", "Client undefined!")
            }
        } catch (error) {
            this.logger.errorLog("(/deal-created) getDealClientInfo", error.message)
        }
    }

    // Установка корректных данных о товарах. В частности установка правильной цены, соответствующей типу цены у клиента в сделке
    async getProducts(dealId, priceType) {
        try {
            // Получение товаров из сделки
            const dealProducts = await this.productController.getProductRowsFromDeal(dealId)
            let products = []
            if (dealProducts) {
                await Promise.all(dealProducts.map(async dealProduct => {
                    let product = await this.productController.getOriginalProductWithPrice(dealProduct.id, priceType ? priceType.toLowerCase() : "розница")
                    product.quantity = dealProduct.quantity
                    products.push(product);
                }));
                let rows = []
                products.forEach(product => {
                    rows.push(
                        {
                            "PRODUCT_ID": product.offerId,
                            "PRICE": product.price,
                            "QUANTITY": product.quantity
                        }
                    )
                })
                // Установка товарных позиций в сделке
                await this.bx.call("crm.deal.productrows.set", { id: dealId, rows: rows }).then(res => {
                    if (res.error) {
                        this.logger.errorLog("(/deal-created) getProductsIfExist crm.deal.productrows.set", error.message)
                    } else {
                        this.logger.successLog("(/deal-created) getProductsIfExist crm.deal.productrows.set", `status: ${res.result}`)
                    }
                })
                return products
            } else {
                this.logger.errorLog("(/deal-created) getProductsIfExist", "No products in deal")
            }
        } catch (error) {
            this.logger.errorLog("(/deal-created) getProductsIfExist", error.message)
        }
    }

}