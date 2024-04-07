import {Bitrix} from "@2bad/bitrix"

import {Logger} from "../logger/logger.js";
import {FsDealsController} from "./fs_deals.controller.js";
import {ProductsController} from "./product.controller.js";

export class DealUpdatedController {
    bx = null
    productController = null
    logger = null
    fs = null
    constructor(link) {
        this.bx = Bitrix(link)
        this.productController = new ProductsController(link)
        this.logger = new Logger()
        this.fs = new FsDealsController()
    }

    async setProduct(dealId) {
        try {
            const deal = await this.bx.deals.get(dealId);
            const dealProducts = await this.productController.getProductRowsFromDeal(dealId);

            const isChanged = await this.checkIfUpdated(dealId, deal, dealProducts);
            if(isChanged.res) {
                let products = []
                let rows = []
                let upgradableFileData = await this.fs.readF(dealId)
                if (isChanged.type === 'client') {
                    this.logger.accessLog("(/deal-updated) setProduct", `changing client deal_${dealId}.json`)
                    const priceTypeField = await this.getDealPriceType(deal.result.CONTACT_ID);
                    await Promise.all(dealProducts.map(async dealProduct => {
                        const product = await this.productController.getOriginalProductWithPrice(dealProduct.id, priceTypeField?.value ? priceTypeField.value.toLowerCase() : "розница");
                        product.quantity = dealProduct.quantity
                        products.push(product);
                    }));


                    const client = await this.bx.call("crm.contact.get", { id: deal.result.CONTACT_ID })
                        .then(res => res.result)
                        .catch(error => this.logger.errorLog("(/deal-updated) setProduct crm.contact.get", error.message))

                    upgradableFileData.clientName = (client.NAME ? client.NAME : "") + " " + (client.LAST_NAME ? client.LAST_NAME : "")

                    upgradableFileData.clientId = deal.result.CONTACT_ID
                    upgradableFileData.products = products
                    upgradableFileData.priceType = priceTypeField

                } else if (isChanged.type === 'products') {
                    this.logger.accessLog("(/deal-updated) setProduct", `changing products list deal_${dealId}.json`)
                    const priceTypeField = await this.getFilePriceType(dealId);
                    await Promise.all(dealProducts.map(async dealProduct => {
                        const product = await this.productController.getOriginalProductWithPrice(dealProduct.id, priceTypeField?.value ? priceTypeField.value.toLowerCase() : "розница");
                        product.quantity = dealProduct.quantity
                        products.push(product);
                    }));

                    upgradableFileData.products = products

                } else if (isChanged.type === 'quantity') {

                }
                if (products.length !== 0) {
                    products.forEach(product => {
                        rows.push({
                            "PRODUCT_ID": product.offerId,
                            "PRICE": product.price,
                            "QUANTITY": product.quantity
                        });
                    });
                    const res = await this.bx.call("crm.deal.productrows.set", {id: dealId, rows: rows});
                    if (res.error) {
                        this.logger.errorLog("(/deal-updated) setProduct crm.deal.productrows.set", res.error)
                    } else {
                        this.logger.successLog("(/deal-updated) setProduct crm.deal.productrows.set", res.result)
                        await this.fs.updateF(dealId,upgradableFileData);
                    }

                    this.logger.successLog("(/deal-updated) setProduct", `Deal product rows updated dealId - ${dealId}`)
                } else {
                    this.logger.errorLog("(/deal-updated) setProduct", "products length = 0")
                }
            } else {
                this.logger.accessLog("(/deal-updated) setProduct", `no updates deal_${dealId}.json`)
            }
        } catch (error) {
            this.logger.errorLog("(/deal-updated) setProduct", error.message)
        }
    }

    async getFilePriceType(dealId) {
        return new Promise(async (resolve, reject) => {
            try {
                const dealInfo = await this.fs.readF(dealId)
                if (!dealInfo.priceType && !dealInfo.priceType.value)
                {
                    this.logger.errorLog("(/deal-updated) getFilePriceType", `price type is null deal_${dealId}.json`)
                    resolve(null)
                }
                resolve(dealInfo.priceType.value)
            } catch (error) {
                this.logger.errorLog("(/deal-updated) getFilePriceType", error.message)
                resolve(null)
            }
        })
    }

    async getDealPriceType(clientId) {
        return new Promise(async (resolve, reject) => {
            try {
                const client = await this.bx.call("crm.contact.get", { id: clientId })
                    .then(res => res.result)
                    .catch(error => this.logger.errorLog("(/deal-updated) getDealPriceType crm.contact.get", error.message))
                const clientFields = await this.bx.call("crm.contact.fields", {})
                    .then(res => res.result)
                    .catch(error => this.logger.errorLog("(/deal-updated) getDealPriceType crm.contact.fields", error.message))
                const priceTypeField = {}
                Object.entries(clientFields).forEach(field => {
                    field.forEach(item => {
                        if (item.formLabel === "Тип цены" && item.listLabel === "Тип цены" && item.filterLabel === "Тип цены") {
                            priceTypeField.title = item.title
                            if (clientFields[item.title].type === 'string') {
                                priceTypeField.value = client[item.title]
                            } else if (clientFields[item.title].type === 'enumeration' && clientFields[item.title].items) {
                                clientFields[item.title].items.forEach(field => {
                                    if (parseInt(field.ID) === parseInt(client[item.title])) {
                                        priceTypeField.value = field.VALUE
                                    }
                                })
                            }
                        }
                    })
                })
                resolve(priceTypeField)
            } catch (error) {
                this.logger.errorLog("(/deal-updated) getDealPriceType", error.message)
                resolve(null)
            }
        })
    }

    async checkIfUpdated(dealId, deal, dealProducts) {
        try {
            const fileData = await this.fs.readF(dealId)
            const result = { type: "none", res: true }
            let isQuantityChanged = false
            if (fileData.dealId === dealId) {
                if (fileData.products && (fileData.products?.length !== dealProducts.length)) {
                    result.type = "products"
                } else if (fileData.clientId !== deal.CONTACT_ID) {
                    result.type = "client"
                } else {
                    fileData.products.forEach(fileProduct => {
                        dealProducts.forEach(dealProduct => {
                            if (parseInt(fileProduct.quantity) !== parseInt(dealProduct.quantity)) {
                                isQuantityChanged = true
                            }
                        })
                    })
                    if (isQuantityChanged) {
                        result.type = "quantity"
                    }
                }
                return result
            }
        } catch (error) {
            this.logger.errorLog("(/deal-updated) checkIfUpdated", error.message)
            return false
        }
    }

}