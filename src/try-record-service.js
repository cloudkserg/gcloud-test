const TryRecord = require('../models/TryRecord')
const fs = require('fs');
const path = require('path');
module.exports = class TryRecordService {

    async addRecord(filepath, total, rows, googleJson) {
        const file = path.basename(filepath);
        //this.saveImage(filepath, file);
        await TryRecord.create({
            file,
            total,
            rows: JSON.stringify(rows),
            json: JSON.stringify(googleJson)
        });
    }

    static getFilePath(file) {
        return __dirname + '/../public/try-files/' + file;
    }

    static getPublicPath(file) {
        return '/try-files/' + file;
    }

    // static getInputPath(filepath) {
    //     return __dirname + '/../uploads/' +filepath;
    // }
    //
    // saveImage(filepath, file) {
    //     fs.writeFileSync(TryRecordService.getFilePath(file), require(filepath));
    // }
};
