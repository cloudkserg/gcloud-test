const TextProcessor = require("./text-processor"),
    LineProcessor = require('./line-processor'),
    process = require('process'),
    TryRecordService = require('../services/try-record-service');

const fs = require('fs'),
    util = require('util'),
    _ = require('lodash'),
    GoogleProcessor = require('./google-processor'),
    mime = require('mime');

// Turn image into Base64 so we can display it easily
function base64Image(src) {
    var data = fs.readFileSync(src).toString('base64');
    return util.format('data:%s;base64,%s', mime.getType(src), data);
}


module.exports = async (file) => {
    const timeStart = new Date();
    let resultJson;
    //const image = __dirname + '../uploads/image2.jpg';
    //resultJson = [require(__dirname + '/../tests/json/test831.json')];

    const image = file;
    let googleTime;

    const processor = new GoogleProcessor();
    resultJson = await processor.parseImage(image);
    googleTime = new Date() - timeStart;
    // fs.writeFileSync(
    //     __dirname + '/test710.json',
    //     JSON.stringify(resultJson)
    // );

    const lineProcessor = new LineProcessor();
    let textProcessor;
    let text;
    let lines;
    try {

        lines = lineProcessor.getLines(resultJson);
        const widhts = lineProcessor.getWidths();
        const lineSymbols = lineProcessor.lineSymbols;

        textProcessor = new TextProcessor(lineSymbols, lines, widhts);
        await textProcessor.initWords();
        text = textProcessor.processText();

    } catch (err) {
        console.error(err);
        return;
    }
    const tryRecordService = new TryRecordService();
    const time = new Date() - timeStart;
    const record = await tryRecordService.addRecord(file, text.totalPrice, text.items, resultJson, time, googleTime);
    const result = {
        id: record.id, 
	url: TryRecordService.getPublicPath(record.file),
        path: image, rows: text.items, totalPrice: text.totalPrice,
        priceCalculations: textProcessor.priceCalculations,
        lines,
        startYs: lineProcessor.startYs,
        debug: lineProcessor.getDebug(),
        transformations: lineProcessor.transformations,
        superDebug: lineProcessor.debug
    };
    return result;
};
