import fs from "fs"

import {Logger} from "../logger/logger.js";

export class FsDealsController {
    logger
    dealsFilePath = "./deals/deal_"
    constructor() {
        this.logger = new Logger()
    }

    writeFile(dealId, data) {
        try {
            fs.writeFile(this.dealsFilePath + dealId + ".json", JSON.stringify(data, null , 2), (err) => {
                if (!err)
                    this.logger.successLog("fs.controller writeFile", `file created deal_${dealId}.json`)
                this.logger.errorLog("fs.controller writeFile", `error while writing new file (deal_${dealId}).json - ${err}`)
            })
        } catch (error) {
            this.logger.errorLog("fs.controller updateFile", error.message)
        }
    }

    async updateFile(dealId, data) {
        return new Promise((resolve) => {
            try {
                fs.writeFile(this.dealsFilePath + dealId + ".json", JSON.stringify(data, null, 2), { flag: 'a' }, (err) => {
                    this.logger.errorLog("fs.controller updateFile", err)
                })
            } catch (error) {
                this.logger.errorLog("fs.controller updateFile", error.message)
                resolve(null)
            }
        })
    }

    async readFile(dealId) {
        return new Promise((resolve) => {
            try {
                fs.readFile(this.dealsFilePath + dealId + ".json", 'utf-8', (err, data) => {
                    if (err) {
                        this.logger.errorLog("fs.controller readFileIfExists", err)
                        resolve(null);
                    } else {
                        try {
                            const jsonData = JSON.parse(data);
                            resolve(jsonData.data);
                        } catch (error) {
                            this.logger.errorLog("fs.controller readFileIfExists", error)
                            resolve(null);
                        }
                    }
                });
            } catch (error) {
                this.logger.errorLog("fs.controller readFile", error.message)
                resolve(null)
            }
        });
    }
}