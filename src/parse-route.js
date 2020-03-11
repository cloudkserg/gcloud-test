const TextProcessor = require("./text-processor"),
    LineProcessor = require('./line-processor');

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




module.exports = async (req, res, next) => {
    let resultJson;
    // const image = __dirname + '../uploads/image2.jpg';
    // resultJson = require('../tests/json/test3');

    const image = req.file.path;
    try {
         const processor = new GoogleProcessor();
         resultJson = await processor.parseImage(image);
         // fs.writeFileSync(
         //     __dirname + '/test3.json',
         //     JSON.stringify(resultJson)
         // );
     } catch (err) {
         console.error(err);
         res.end('Cloud Vision Error: ' + err.toString());
         return;
     }


    const lineProcessor = new LineProcessor();
    const lines = lineProcessor.getLines(resultJson);
    const widhts = lineProcessor.getWidths();
    const lineSymbols = lineProcessor.lineSymbols;

    const textProcessor = new TextProcessor(lineSymbols, lines, widhts);
    const text = textProcessor.processText();
    const result = {path: image, rows: text.items, totalPrice: text.totalPrice, lines};
    res.json(result);
    // try {
    //     const processor = new GoogleProcessor();
    //     text = await processor.parseImage(image);
    // } catch (e) {
    //     console.error(err);
    //     res.end('Cloud Vision Error: ' + err.toString());
    //     return;
    // }
};
