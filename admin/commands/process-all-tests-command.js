const TryRecord = require('../../models/TryRecord');
const { Op } = require("sequelize");
const fs = require('fs');
const parseRecord = require('../../src/parse-record');
const TryRecordService = require('../../src/try-record-service');



class ProcessAllTestsCommand {
    constructor(process) {
        this.process = process
    }

    async start() {
        let offset = 0;
        while(true) {
            const record = await TryRecord.findOne({
                order: [['id', 'ASC']],
                limit: 1,
                offset: offset,
                where: {
                    id: {[Op.gte]: this.process.startId}
                }
            });
            if (!record) {
                break;
            }
            offset++;
            if (offset > this.process.fullCount) {
                break;
            }

            await this.retryRecord(record);
            this.process.processedCount++;
            await this.process.save();

        }
        this.process.finishedAt = new Date();
        await this.process.save();
    }

    async retryRecord(record) {

        try {
            record.file = TryRecordService.getFilePath(record.file);
            if (!fs.existsSync(record.file)) {
                return;
            }
            await parseRecord(record.file);
        } catch (e) {
            console.error(e);
            return;
        }

        console.log('FINISHED RECORD #' + record.id);
    }
};

module.exports = ProcessAllTestsCommand;
