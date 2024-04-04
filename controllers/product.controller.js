import {Bitrix} from "@2bad/bitrix"
import {Logger} from "../logger/logger.js"

export class ProductsController {
    bx = null
    productFields = []
    logger = null
    constructor(link) {
        this.logger = new Logger()
        this.bx = Bitrix(link)
        this.setProductFields().then(r => {})
    }

    async setProductFields() {
        this.productFields = await this.getProductFieldsFromBx()
    }

    async getProductRowsFromDeal(dealId) {
        return new Promise (async (resolve, reject) => {
            try {
                let dealProducts = []
                let result = await this.bx.call("crm.deal.productrows.get", { id: dealId }).catch(error => {
                    this.logger.errorLog("(product-controller) getProductRowsFromDeal crm.deal.productrows.get", error.message)
                    resolve(null)
                }).then(res => { return res })
                result.result.forEach(product => {
                    dealProducts.push(
                        {
                            id: product["PRODUCT_ID"],
                            name: product["PRODUCT_NAME"],
                            price: product["PRICE"],
                            quantity: product["QUANTITY"]
                        }
                    )
                })
                resolve(dealProducts)
            } catch (error) {
                this.logger.errorLog("(product-controller) getProductRowsFromDeal", error.message)
                resolve(null)
            }
        })
    }

    async getOriginalProductWithPrice(offerId, priceType) {
        return new Promise(async (resolve, reject) => {
            try {
                const offer = await this.bx.call("catalog.product.offer.get", { id: offerId }).catch(error => {
                    this.logger.errorLog("(product-controller) getOriginalProductWithPrice catalog.product.offer.get", error.message)
                }).then(res => { return res })
                let product = null
                if (offer) {
                    product = await this.bx.call("crm.product.get", { id: offer.result.offer.parentId.value }).catch(error => {
                        this.logger.errorLog("(product-controller) getOriginalProductWithPrice crm.product.get", error.message)
                    }).then(res => { return res })
                } else {
                    product = await this.bx.call("crm.product.get", { id: offerId }).catch(error => {
                        console.error(`ERROR (product-controller) crm.product.get (get product): ${error.message}`)
                    }).then(res => { return res })
                }

                let field = this.productFields.find(field => field.title.includes(priceType))
                let price = 0
                if (field) {
                    price = product.result[field.key].value
                }
                resolve(
                    {
                        offerId: offerId,
                        id: product.result["ID"],
                        code: product.result["CODE"],
                        name: product.result["NAME"],
                        price: price ? price : 0
                    }
                )
            } catch (error) {
                this.logger.errorLog("(product-controller) getOriginalProductWithPrice", error.message)
                resolve(null)
            }
        })
    }

    async getProductFieldsFromBx() {
        return new Promise(async (resolve) => {
            try {
                let data = []
                const fields = await this.bx.call("crm.product.fields", {}).catch((err) => {
                    this.logger.errorLog("(product-controller) (getProductFieldsFromBx) crm.product.fields", err.message)
                    resolve(null)
                })
                for (let key in fields.result) {
                    if (fields.result.hasOwnProperty(key) && fields.result[key].title.toLowerCase().includes("цена")) {
                        if (key !== "PRICE") {
                            data.push({key: key, title: fields.result[key].title.toLowerCase()})
                        }
                    }
                }
                resolve(data)
            } catch (error) {
                this.logger.errorLog("(product-controller) getProductFieldsFromBx", error.message)
                resolve(null)
            }
        })
    }

}