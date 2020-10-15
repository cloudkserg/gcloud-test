const TryRecord = require('../models/TryRecord')
const fs = require('fs');
const path = require('path');
module.exports = class TryRecordService {

    async addRecord(filepath, total, rows, googleJson, speed, google_speed) {
        const file = this.copyImage(filepath);
        await TryRecord.create({
            file,
            total,
            speed,
            google_speed,
	        result: false,
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

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    // static getInputPath(filepath) {
    //     return __dirname + '/../uploads/' +filepath;
    // }
    //
    copyImage(filepath) {
        const pathDir = path.dirname(filepath);
        const randNumber = this.getRandomInt(1000);
        const newFilepath = pathDir + '/' + Date.now() + '_' + randNumber +  '.jpg';

        fs.copyFileSync(filepath, newFilepath);
        return path.basename(newFilepath);
    }
};
