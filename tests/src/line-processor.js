const expect = require('chai').expect;

const LineProcessor = require('../../src/line-processor');

describe('LineProcessor', function() {
    describe('parse /json/test.json', function() {
        it('lines.length = 14, lines[11], lines[15] equal', function() {
            const lineProcessor = new LineProcessor();
            const testJson = require('../json/test');
            const lines  = lineProcessor.getLines(testJson);
            const lineValues = Object.values(lines);
            expect(lineValues.length).to.eq(24);
            expect(lineValues[0]).to.eq('MUTTER HOPPE');
            expect(lineValues[11]).to.eq('1 Salat HÃ¤hnchenbrust 13,50 1');
            expect(lineValues[15]).to.eq('1 MÃ¤rkisch.\\Land 0.4 4,00 1');
        });
    });
});
