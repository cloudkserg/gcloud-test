const expect = require('chai').expect;

const TextProcessor = require('../../src/text-processor'),
    LineProcessor = require('../../src/line-processor');

const getLines = (filename) => {
    const data = require(filename);
    const lineProcessor = new LineProcessor();
    return { lines: lineProcessor.getLines(data), lineSymbols: lineProcessor.lineSymbols};
}


describe('TextProcessor', function() {
    describe('parse json/text.json', function() {
        it('items', function() {
            const {lines, lineSymbols} = getLines('../json/test');
            const textProcessor = new TextProcessor(lineSymbols, lines);
            const result = textProcessor.processText();
            console.log(result);
        });
    });
});
