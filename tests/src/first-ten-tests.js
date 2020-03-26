const expect = require('chai').expect,
    _ = require('lodash');

const TextProcessor = require('../../src/text-processor'),
    LineProcessor = require('../../src/line-processor');


getData = function (resultJson) {
    const lineProcessor = new LineProcessor();
    const lines = lineProcessor.getLines(resultJson);
    const widhts = lineProcessor.getWidths();
    const lineSymbols = lineProcessor.lineSymbols;

    const textProcessor = new TextProcessor(lineSymbols, lines, widhts);
    const text = textProcessor.processText();
    return {
        rows: text.items,
        totalPrice: text.totalPrice
    };
};

const floatSum = (sumPrice, price) => {
    return +(sumPrice + price).toFixed(12)
};

const getSumByRows = (rows) => {
    return _.reduce(rows, (sumPrice, row) => floatSum(sumPrice, row.price), 0);
};


describe('First Ten tests', function() {

    describe('test 710 image', function() {
        it('items', function() {
            const needTotalPrice = 9.4;
            const needCountRows = 4;

            const {rows, totalPrice} = getData(require('../json/test710'));

            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });

    describe('test 831 image', function() {
        it('items', function() {
            const needTotalPrice = 2.25;
            const needCountRows = 2;

            const {rows, totalPrice} = getData(require('../json/test831'));

            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });

    describe('test 997 image', function() {
        it('items', function() {
            const needTotalPrice = 550;
            const needCountRows = 2;

            const {rows, totalPrice} = getData(require('../json/test997'));

            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });

    describe('test 1168 image', function() {
        it('items', function() {
            const needTotalPrice = 7600;
            const needCountRows = 9;

            const {rows, totalPrice} = getData(require('../json/test1168'));

            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });

    describe('test 1275 image', function() {
        it('items', function() {
            const needTotalPrice = 37.25;
            const needCountRows = 7;

            const {rows, totalPrice} = getData(require('../json/test1275'));

            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });

    describe('test 1452 image', function() {
        it('items', function() {
            const needTotalPrice = 79.26;
            const needCountRows = 13;

            const {rows, totalPrice} = getData(require('../json/test1452'));

            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });

    describe('test 1622 image', function() {
        it('items', function() {
            const needTotalPrice = 218;
            const needCountRows = 5;

            const {rows, totalPrice} = getData(require('../json/test1622'));

            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });

    describe('test 1686 image', function() {
        it('items', function() {
            const needTotalPrice = 48.9;
            const needCountRows = 7;

            const {rows, totalPrice} = getData(require('../json/test1686'));

            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });

    describe('test 1832 image', function() {
        it('items', function() {
            const needTotalPrice = 4280;
            const needCountRows = 7;

            const {rows, totalPrice} = getData(require('../json/test1832'));

            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });

    describe('test 3774 image', function() {
        it('items', function() {
            const needTotalPrice = 68.8;
            const needCountRows = 11;

            const {rows, totalPrice} = getData(require('../json/test3774'));

            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });

    describe('test 4215 image', function() {
        it('items', function() {
            const needTotalPrice = 54.7;
            const needCountRows = 5;

            const {rows, totalPrice} = getData(require('../json/test4215'));
            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });

    describe('test 20190805_084419 image', function() {
        it('items', function() {
            const needTotalPrice = 338;
            const needCountRows = 6;

            const {rows, totalPrice} = getData(require('../json/20190805_084419'));

            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });

    describe('test 20190810_193936 image', function() {
        it('items', function() {
            const needTotalPrice = 23641;
            const needCountRows = 27;

            const {rows, totalPrice} = getData(require('../json/20190810_193936'));

            expect(totalPrice).to.eq(needTotalPrice);
            expect(rows.length).to.eq(needCountRows);
            expect(getSumByRows(rows)).to.eq(needTotalPrice);
        });
    });


});
