String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

const TotalWord = require('../models/TotalWord');
const StopWord = require('../models/StopWord');
const _ = require('lodash');
const MAX_DIFFS_IN_X = 20;
const DIFFS_IN_X = 15;

const floatSum = (sumPrice, price) => {
    return +(sumPrice + price).toFixed(12)
};

module.exports =  class TextProcessor {

    constructor (lineSymbols, lines, widths) {
        this.lineSymbols = lineSymbols;
        this.lines = lines;
        this.widths = widths;
        this.savedPositions = null;
        this.savePositionOnY = 0;
        this.priceCalculations = null;
    }

    async initWords() {
        // const totalWords = [
        //     'Bar',
        //     'offen',
        //     'К оплате',
        //     'Total',
        //     'Tatal', //may be synonim of Total
        //     'Karte',
        //     'Sunne',
        //     'Summe', //may be synonim of Symme
        //     'Итого',
        //     'Всего',
        //     'Bcero',
        //     'Сумма'
        // ];
        this.totalWords = await TotalWord.findAll();
        this.totalWords = this.totalWords.map(totalWord => totalWord.name);
        this.stopWords = await StopWord.findAll();
        this.stopWords = this.stopWords.map(stopWord => stopWord.name);
        this.totalWords.forEach(totalWord => this.stopWords.push(totalWord));
        console.log(this.totalWords, this.stopWords);
    }

    getMaxDiffForY(y, x) {
        return MAX_DIFFS_IN_X;
        if (!this.widths[y]) {
            return MAX_DIFFS_IN_X;
        }
        const line = this.lineSymbols[y];
        if (x) {
            const prevX = this.getPrevX(line, x);
            if (prevX) {
                return this.widths[y][prevX] + DIFFS_IN_X;
            }
        }
        const maxWidth = _.max(Object.values(this.widths[y]));
        return maxWidth + DIFFS_IN_X;
    }

    findExistedX (line, x, y) {
        const diffs = _.range(0, parseInt(this.getMaxDiffForY(y, x)));
        const maxPrevX = _.chain(diffs)
            .map(diff => [+x-diff])
            .flatten()
            .find(diff => !!line[diff])
            .value();

        if (maxPrevX) {
            return maxPrevX;
        }
        const minNextX =  _.chain(diffs)
            .map(diff => [+x+diff])
            .flatten()
            .find(diff => !!line[diff])
            .value();
        return minNextX;
    }

    findNearestX (line, x, y, isCheckSymbol = (x) => true) {
        const existedX = this.findExistedX(line, x, y);

        const prevX = this.getPrevX(line, existedX);
        if (!prevX) {
            return existedX;
        }
        const prevChar = line[prevX];
        if (this.isCLosedToPreviousSymbol(line, existedX, y)
            && !this.isPrevSymbolEqualSpace(prevChar)
            && isCheckSymbol(prevChar)
        ) {
            const prevX = this.getPrevX(line, existedX);
            return this.findNearestX(line, prevX, y);
        }
        return existedX;
    }

    isPrevSymbolEqualSpace(prevChar) {
        return prevChar == ' ';
    }


    nextLineHasStartTextOnPosition (nextLine, startTextPosition, y) {
        const nearestX = this.findNearestX(nextLine, startTextPosition, y);
        if (!nearestX) {
            return false;
        }
        return true;
    }

    calculateTextPosition(line, y, pricePositions) {
        const nextLine = this.getNextLine(y);
        if (!nextLine) {
            return null;
        }

        let inMediumText = false;
        for (const x in line) {
            const curChar = line[x];
            if (!curChar) {
                inMediumText = false;
                continue;
            }
            if (curChar == ' ' && !inMediumText) {
                continue;
            }
            if ( _.includes(pricePositions, x)) {
                inMediumText = false;
                continue;
            }

            if (inMediumText && !this.isCLosedToPreviousSymbol(line, x)) {
                inMediumText = false;
            }
            if (inMediumText) {
                continue;
            }
            inMediumText = true;

            const startTextPosition = x;
            if (this.nextLineHasStartTextOnPosition(nextLine, startTextPosition, y)) {
                return startTextPosition;
            }
        }
        return null;
    }

    getTextFromPosition (line, x, y) {
        let nearestX = this.getMaxPreviousX(line, x, (x) => true, y);
        const char = line[nearestX];
        let text = char;
        let currentX = this.getNextX(line, nearestX);
        if (!currentX) {
            return text;
        }
        let isEndText = false;

        while(!isEndText) {
            const nextChar = line[currentX];
            if (nextChar === null || !this.isCLosedToPreviousSymbol(line, currentX)) {
                isEndText = true;
            } else {
                text += nextChar;
            }
            currentX = this.getNextX(line, currentX);
        }

        return text;
    }

    getMaxPreviousX(line, x, isCondition, y) {
        let maxNearestX = this.findNearestX(line, x, y);
        let currentNearestX =  this.getPrevX(line, maxNearestX);
        while (
            currentNearestX &&
            this.isCLosedToPreviousSymbol(line, currentNearestX, y) &&
            isCondition(line[currentNearestX])
            ) {
            maxNearestX = currentNearestX;
            currentNearestX = this.getPrevX(line, currentNearestX);
        }
        return maxNearestX;
    }

    isStartNumber(line, x, y) {
        const prevChar = this.getPrevXChar(line, x);
        if (this.isCLosedToPreviousSymbol(line, x, y) && !isNaN(parseInt(prevChar))) {
            return false;
        }

        //not isClosedToPrevious
        return true;
        // const prevChar = this.getPrevXChar(line, x);
        // const isSign = prevChar == '.' || prevChar == ',';
        // if (isSign) {
        //      return this.isStartNumber(line, this.getPrevX(line, x));
        // }
        // return isNaN(parseInt(prevChar));
    }

    getPriceFromPosition (line, x, y, toFloat = true, asTotal = false) {
        // if (y  == '332') {
        //     const a = 'g';
        // }
        let nearestX = this.findNearestX(line, x, y, x => this.isNumber(x));
        const char = this.pointToPoint(line[nearestX]);
        if (isNaN(parseFloat(char))) {
            return NaN;
        }
        if (!this.isStartNumber(line, nearestX, y)) {
            return NaN;
        }

        let price = char;
        let currentX = this.getNextX(line, nearestX);
        if (!currentX || isNaN(parseFloat(price))) {
            return price;
        }

        let priceHasPoint = this.hasPointInEnd(price);

        while(true) {
            if (!currentX) {
                break;
            }
            const nextChar = this.pointToPoint(line[currentX]);
            if (nextChar === null) {
                break;
            }

            if (!this.isCLosedToPreviousSymbol(line, currentX, y)) {
                if (!priceHasPoint) {
                    //break;
                    // currentX = this.getNextX(line, currentX);
                    // continue;
                }
                if (this.hasTwoOrMoreDigitsAfter(price)) {
                    break;
                }
            }

            if (nextChar === '.' || nextChar == ',') {
                priceHasPoint = true;
                price += '.';
            } else if (nextChar == ' ') {
                if (this.hasPointInEnd(price)) {
                    currentX = this.getNextX(line, currentX);
                    continue;
                }
                if (!asTotal) {
                    break;
                }
                //previous fixing
                // if (this.isPrice(price) && this.hasTwoDigitsAfter(price)) {
                //     break;
                // }
                // currentX = this.getNextX(line, currentX);
                // continue;
            } else if (isNaN(parseFloat(nextChar))) {
                break;
            } else if (!isNaN(parseFloat(nextChar))) {
                price += nextChar;
            }
            price = this.pointToPoint(price);
            const nextX = this.getNextX(line, currentX);
            if (this.hasTwoDigitsAfter(price) && !this.isCLosedToPreviousSymbol(line, nextX, y))  {
                break;
            }

            currentX = this.getNextX(line, currentX);
        }
        if (y  == '870') {
            const a = 'g';
        }
        if (!this.isPrice(price)) {
            return NaN;
        }

        return toFloat ? parseFloat(price) : price;
    }

    pointToPoint(currentPrice) {
        if (!currentPrice) {
            return null;
        }
        let pr = currentPrice
            .replace(/[^\d,\.]/g, "")
            .replace(/(\d),(\d)/g, "$1.$2");
        if (this.hasOneDigitsAfter(pr)) {
            pr =  '' + pr + '0';
        }
        return pr;
    }

    nextLineHasStartPriceOnPosition (nextLine, startPricePosition, y) {
        const nearestX = this.findNearestX(nextLine, startPricePosition, y);
        if (!nearestX) {
            return false;
        }
        if (isNaN(parseInt(nextLine[nearestX]))) {
            return false;
        }

        return true;
    }

    calculatePricePositions(line, y, asTotal = false) {
        const pricePositions = [];
        let currentPrice = null;
        let currentNumberPosition = null;
        for (const x in line) {
            const curChar = line[x];
            const isDigit = !isNaN(parseFloat(curChar));
            const isPoint = curChar === '.' || curChar === ',';
            const isSpace = curChar === ' ';
            const isChar = !isDigit && !isPoint && !isSpace;
            if (!this.isCLosedToPreviousSymbol(line, x, y) && this.isPrice(currentPrice)) {
                pricePositions.push(currentNumberPosition);
                currentNumberPosition = null;
            }
            if (!this.isCLosedToPreviousSymbol(line, x, y) && !this.hasPointInEnd(currentPrice)) {
                currentNumberPosition = null;
            }
            if (isChar) {
                if (currentNumberPosition && this.isPrice(currentPrice)) {
                    pricePositions.push(currentNumberPosition);
                }
                currentNumberPosition = null;
                currentPrice = null;
                continue;
            }
            if (isDigit) {
                if (!currentNumberPosition) {
                    currentNumberPosition = x;
                    currentPrice = this.pointToPoint(curChar);
                    continue;
                } else {
                    currentPrice = this.pointToPoint(currentPrice + curChar);
                    continue;
                }
            }
            if (isSpace) {
                if (this.isPrice(currentPrice)) {
                    pricePositions.push(currentNumberPosition);
                    currentNumberPosition = null;
                    currentPrice = null;
                    continue;
                } else if (this.hasPointInEnd(currentPrice) || asTotal) {
                    continue;
                } else {
                    currentNumberPosition = null;
                    currentPrice = null;
                }
                continue;
            }
            if (isPoint) {
                if (!currentNumberPosition) {
                    continue;
                } else {
                    currentPrice += '.';
                    continue;
                }
            }
        }
        if (currentNumberPosition && this.isPrice(currentPrice)) {
            pricePositions.push(currentNumberPosition);
        }
        return pricePositions;
    }

    hasPointInEnd(price) {
        if (!price) {
            return false;
        }
        return price.substr(-1, 1) == '.' || price.substr(-1, 1) == ',';
    }

    getSecondNextLine(y) {
        const nextY = this.getNextY(y.toString());
        return this.getNextLine(nextY);
    }

    parseCountAndPricePositions(pricePositions) {
        const result = {pricePosition: pricePositions[0]};
        if (pricePositions.length > 1) {
            result['countPosition'] = pricePositions[1];
        }
        return result;
    }

    calculatePositions(line, y, asTotal = false) {

        const nextLine = this.getNextLine(y);
        if (!nextLine) {
            return null;
        }

        let pricePositions = this.calculatePricePositions(line, y);
        if (pricePositions.length === 0) {
            return null;
        }
        if (!asTotal) {
            const nextLine = this.getNextLine(y);
            if (!nextLine) {
                return null;
            }
            pricePositions = pricePositions.filter(
                pricePosition => this.nextLineHasStartPriceOnPosition(nextLine, pricePosition, y)
            );
        }


        const { pricePosition, countPosition} = this.parseCountAndPricePositions(pricePositions);
        const textPosition = this.calculateTextPosition(line, y, pricePositions);
        if (!textPosition) {
            return null;
        }

        return {textPosition, pricePosition, countPosition};
    }

    getSavedPositions(line, y) {
       if (!this.savedPositions) {
            this.savedPositions = this.calculatePositions(line, y);
            this.savePositionOnY = y;
       }
       return this.savedPositions;
    }

    getPrevX(line, x) {
        if (!x) {
            return null;
        }
        let keys = Object.keys(line);
        let nextIndex = parseInt(keys.indexOf(x.toString())) - 1;
        if (!keys[nextIndex]) {
            return null;
        }
        return keys[nextIndex];
    }

    getPrevXChar(line, x) {
        if (!x) {
            return null;
        }
        const xKey = this.getPrevX(line, x.toString());
        if (line[xKey]) {
            return line[xKey];
        }
        return null;
    }

    isCLosedToPreviousSymbol (line, x, y) {
        if (!y) {
            throw new Error('not defined y');
        }
        const prevX = this.getPrevX(line, x);
        const prevChar = line[prevX];
        const endCurrentX = parseInt(x) + parseInt(this.widths[y][x]);
        if (!prevX || prevChar == ' ') {
            return false;
        }
        return parseInt(endCurrentX) - parseInt(prevX) <= this.getMaxDiffForY(y, x);
    }

    getNextX(line, x) {
        if (!x) {
            return null;
        }
        let xKeys = Object.keys(line);
        let nextIndex = parseInt(xKeys.indexOf(x.toString())) + 1;
        if (!xKeys[nextIndex]) {
            return null;
        }
        return xKeys[nextIndex];
    }

    getNextXChar(line, x) {
        if (!x) {
            return null;
        }
        const xKey = this.getNextX(line, x.toString());
        if (line[xKey]) {
            return line[xKey];
        }
        return null;
    }

    getNextY(y) {
        let keys = Object.keys(this.lineSymbols);
        let nextIndex = parseInt(keys.indexOf(y.toString())) + 1;
        if (!keys[nextIndex]) {
            return null;
        }
        return keys[nextIndex];
    }


    getNextLine(y) {
        if (!y) {
            return null;
        }
        const yKey = this.getNextY(y.toString());
        if (this.lineSymbols[yKey]) {
            return this.lineSymbols[yKey];
        }
        return null;;
    }




    hasTotalWord(line) {
        return _.some(this.totalWords, totalWord => {
            return _.includes(_.lowerCase(line), _.lowerCase(totalWord));
        });
    }

    endedWithPoint(price) {
        if (price.length === 0) {
            return false;
        }
        return price[price.length - 1] === '.';
    }

    isPrice(priceStr) {
        if (!priceStr) {
            return false;
        }
        const price = parseFloat(priceStr);
        if (isNaN(price)) {
            return false;
        }
        return this.hasPointInMedium(priceStr) && this.hasTwoDigitsAfter(priceStr);
    }

    hasTwoDigitsAfter(priceStr) {
        const priceAfter = priceStr.split('.');
        return priceAfter && priceAfter.length > 1 && priceAfter[1].length == 2;
    }

    hasOneDigitsAfter(priceStr) {
        const priceAfter = priceStr.split('.');
        return priceAfter && priceAfter[1] && priceAfter[1].length == 1;
    }

    hasTwoOrMoreDigitsAfter(priceStr) {
        const priceAfter = priceStr.split('.');
        return priceAfter && priceAfter.length > 1 && priceAfter[1].length >= 2;
    }

    hasPointInMedium(price) {
        const pointPosition = price.indexOf('.');
        return pointPosition !== -1 && pointPosition !== 0 && pointPosition !== (price.length - 1);
    }

    getPriceFromElement(el, startPricePart) {
        let price =  el.replace(",", ".");
        const hasPoint = price.indexOf('.') !== -1;
        if (startPricePart) {
            price = startPricePart + '' + price;
            startPricePart = null;
            if (hasPoint) {
                return {price: null, startPricePart};
            }
        } else {
            if (this.endedWithPoint(price)) {
                startPricePart = price;
                return {price:null, startPricePart };
            }
        }
        if (!this.hasPointInMedium(price)) {
            return {price: null, startPricePart };
        }
        price = this.cutBeginWordFromPrice(price);
        return {price, startPricePart }
    }

    cutBeginWordFromPrice(price) {
        const els = price.split('');
        let cutPosition = 0;
        for (let i =0; i < els.length; i++) {
            const isWordInMedium = cutPosition !== i;
            if (isWordInMedium) {
                continue;
            }
            const floatWord = parseFloat(els[i]);
            if (isNaN(floatWord)) {
                cutPosition = i+1;
            }
        }
        return price.slice(cutPosition);
    }

    //price need has . or , in medium
    getTotalPriceFromLine(y) {
        const elements = line.split('');
        let maxPrice = null;
        let prevStartPricePart = null;
        for (const el of elements) {
            let { price, startPricePart } = this.getPriceFromElement(el, prevStartPricePart);
            prevStartPricePart = startPricePart;
            if (!price) {
                continue;
            }

            price = parseFloat(price);
            if (price && price > 0 && price > maxPrice) {
                maxPrice = price;
            }
        }
        return maxPrice;
    }

    parseLineWithTotalWord(y, line) {
        const pricePositions = this.getPricePositionsForLine(y, true);
        if (pricePositions.length > 0) {
            return pricePositions[pricePositions.length - 1].price;
        } else {
            if (this.isTotalWithDigitsBelow(y, line)) {
                return this.getTotalFromDigitsBelow(y, line);
            }
        }
        return null;
    }

    getTotalFromDigitsBelow(y, line) {
        const nextY = this.getNextY(y);
        const nextPricePositions = this.getPricePositionsForLine(nextY, true);
        const positionsCount = nextPricePositions.length;
        if (positionsCount > 0) {
            return nextPricePositions[positionsCount-1].price;
        }
        return null;
    }

    hasDigits(line) {
        const digitMatch = /\d/;
        return line.match(digitMatch) !== null;
    }

    hasChars(line) {
        const wordMatch = /[a-zA-Z]/;
        return line.match(wordMatch) !== null;
    }

    //only scheme
    // chars
    // digits
    isTotalWithDigitsBelow(y, line) {
        if (this.hasDigits(line)) {
            return false;
        }
        const nextY = this.getNextY(y);
        const nextLine = this.lines[nextY];
        if (this.hasDigits(nextLine) || !this.hasTotalWord(nextLine)) {
            return true;
        }
        return false;
    }

    getEndItem(obj) {
        if (Object.values(obj).length == 0) {
            return null;
        }
        return _.chain(obj)
            .values()
            .splice(-1)
            .value()[0];
    }

    getTotalPrice() {
        const totalPrices = {};
        for (const y of Object.keys(this.lines)) {
            const line = this.lines[y];
            if (this.hasTotalWord(line)) {
                totalPrices[y] = this.parseLineWithTotalWord(y, line);
                if (totalPrices[y] !== null) {
                    this.totalY = y;
                } else {
                    delete totalPrices[y];
                }
            }
        }
        return this.getEndItem(totalPrices);
    }

    minimizeXTo (line, minX, y) {
        const newLine = {};
        const diffX = this.getMaxDiffForY(y, null) + 1;
        let prevX = 0;
        for (const x in line) {
            if (x >= (minX - diffX)) {
                newLine[prevX] ? newLine[prevX] + '' + line[x] : line[x];
            } else {
                newLine[x] = line[x];
                prevX = x;
            }
        }
        return newLine;
    }

    joinCurrentRowWithNext (y) {
        const line = this.lineSymbols[y];
        const yIndexes = Object.keys(this.lineSymbols);
        const yIndex = yIndexes.indexOf(y.toString());
        if (yIndex < yIndexes.length - 1) {
            const nextY = yIndexes[yIndex+1];
            const nextLine = this.lineSymbols[nextY];
            const minNextX = _.min(Object.keys(nextLine));
            const newPrevLine = this.minimizeXTo(line, minNextX);
            this.lineSymbols[nextY] = {...newPrevLine, ...this.lineSymbols[nextY]};
        }
    }

    moreThanTotalY (y) {
        return this.totalY && parseInt(y) >= parseInt(this.totalY)
    }

     getSumNumberForPosition (numberPosition, currentY, asTotal) {
        let sumPrice = 0;
        let tryItemsInPrice = 0;
        let lastSavedYIndex = null;
        let currencyYIndex = 0;
        const newLineSymbols = this.lineSymbols;
        const priceMatch = /^\d+\.\d+$/i;
        for (const y in newLineSymbols) {
            //начинаем считать с текущей строчки
            currencyYIndex++;
            //skip before currentY
            if (y < currentY) {
                continue;
            }
            //skip after totalY
            if (!asTotal && this.moreThanTotalY(y)) {
                break;
            //skip for total all except current
            } else if (asTotal && y !== currentY) {
                continue;
            }


            //если разница между последним сохраненным и текущим больше двух строк -- заканчиваем
            if (lastSavedYIndex && currencyYIndex - lastSavedYIndex > 2) {
                break;
            }

            const line = this.lineSymbols[y];
            const priceStr = this.getPriceFromPosition(line, numberPosition, y, false, asTotal);
            if (!priceStr) {
                continue;
            }
            if (priceStr.match(priceMatch) === null) {
                continue;
            }
            const price = parseFloat(priceStr);
            if (price && price > 0) {
                sumPrice = floatSum(sumPrice, price);
                tryItemsInPrice++;
                lastSavedYIndex = currencyYIndex;
            }

        }
        const yIndexes = Object.keys(this.lineSymbols);
        return {price: sumPrice, priceItems: tryItemsInPrice, endY: yIndexes[lastSavedYIndex-1]};
    }

    getPriceOutputCalculation (priceCalculation) {
        return {
            pricePosition: priceCalculation.pricePosition,
            startY: priceCalculation.startY,
            endY: priceCalculation.endY
        };
    }

    getPricePositionsForLine(y, asTotal = false) {
        const line = this.lineSymbols[y];
        const numberPositions = this.calculatePricePositions(line, y, asTotal);
        const pricePositions = [];
        for (const numberPosition of numberPositions) {
            const a = '1';
            const {price, priceItems: tryItemsInPrice, endY: tryEndY} = this.getSumNumberForPosition(numberPosition, y, asTotal);
            const pricePosition = {
                startY: y,
                endY: tryEndY,
                price,
                priceItems: tryItemsInPrice,
                pricePosition: numberPosition
            };
            pricePositions.push(pricePosition);
        }
        return pricePositions;
    }


    getPricePosition (totalPrice) {
        const skippedPositions = [];
        const totalPriceCalculation = {
            pricePosition: null,
            priceItems: 0,
            startY: 0,
            endY: 0
        };
        const priceCalculations = {};
        //     pricePosition: null, [2: {price: 10, priceItems: 10, startY: 0, endY: 0}]
        //     priceItems: 0
        // };

        for (const y in this.lineSymbols) {
        // const y = '985';
            if (parseInt(y) >= parseInt(this.totalY)) {
                break;
            }
            //todo: deleted
            // if (y < 733) {
            //     continue;
            // }
            const pricePositions = this.getPricePositionsForLine(y);
            if (pricePositions.length == 0) {
                continue;
            }
            // for (const pricePosition of pricePositions) {
                const pricePosition = pricePositions[pricePositions.length - 1];
                const numberPosition = pricePosition.pricePosition;
                if (
                    pricePosition.price == totalPrice &&
                    pricePosition.priceItems > totalPriceCalculation.priceItems &&
                    pricePosition.priceItems > 1
                ) {
                    totalPriceCalculation.priceItems = pricePosition.priceItems;
                    totalPriceCalculation.pricePosition = numberPosition;
                    totalPriceCalculation.startY = pricePosition.startY;
                    totalPriceCalculation.price = pricePosition.price;
                    totalPriceCalculation.endY = pricePosition.endY;
                } else if (
                    !priceCalculations[numberPosition] ||
                    pricePosition.priceItems > priceCalculations[numberPosition].priceItems
                ) {
                    priceCalculations[numberPosition] = {
                        priceItems: pricePosition.priceItems,
                        ['pricePosition']: numberPosition,
                        startY: pricePosition.startY,
                        price: pricePosition.price,
                        endY:pricePosition.endY
                    };
                }
                // skippedPositions.push(numberPosition);
            // }
        }

        this.priceCalculations = priceCalculations;
        if (totalPriceCalculation.priceItems > 0) {
            return this.getPriceOutputCalculation(totalPriceCalculation);
        }

        const maxPriceCalculation =  this.getMaxPriceCalculationsByPriceItemsAndPrice(priceCalculations, totalPrice);
        if (!maxPriceCalculation) {
            return this.getPriceOutputCalculation({
                pricePosition: null,
                price: 0,
                startY: 0,
                endY: 0
            });
        }
        return this.getPriceOutputCalculation(maxPriceCalculation);
    }

    getMaxPriceCalculationsByPriceItemsAndPrice(priceCalculations, totalPrice) {
        const priceValues = Object.values(priceCalculations);
        return priceValues.reduce((maxPriceCalculation, priceCalculation) => {
            if (!maxPriceCalculation) {
                return priceCalculation;
            }
            const newDiff = Math.abs(totalPrice - priceCalculation.price);
            const currentDiff = Math.abs(totalPrice - maxPriceCalculation.price);
            if (newDiff < currentDiff ) {
                return priceCalculation;
            }
            return maxPriceCalculation;
        }, null);
    }

    isNotNumber(x) {
        return !isNaN(parseInt(x)) && x != '.' && x != ',';
    }

    isNumber(x) {
        return !isNaN(parseInt(x));
    }

    getEndedCountX(line, nearestCountX) {
        if (nearestCountX) {
            const xKeys = Object.keys(line);
            let xIndex = xKeys.indexOf(nearestCountX.toString());
            for (let i = xIndex; i < xKeys.length; i++) {
                const x = xKeys[i];
                const char = line[x];
                if (this.isNotNumber(char)) {
                    return x;
                }
            }
            return line.length - 1;
        }
    }

    getTextBeforePosition (line, pricePosition, countPosition, y) {
        let nearestPriceX = this.getMaxPreviousX(line, pricePosition, this.isNotNumber, y);
        const lineXs = Object.keys(line);
        if (!nearestPriceX) {
            nearestPriceX = lineXs.length;
        }
        let nearestCountX = lineXs[lineXs.length -1];
        let endedCountX = nearestCountX;
        if (countPosition) {
            nearestCountX = parseInt(this.getMaxPreviousX(line, countPosition, this.isNotNumber, y)) || nearestCountX;
            endedCountX = parseInt(this.getEndedCountX(line, nearestCountX));
        }

        let string = '';

        const xKeys = Object.keys(line);
        let xIndex = xKeys.indexOf(nearestPriceX.toString());
        for (let i = 0; i <= xIndex; i++) {
            const x = parseInt(xKeys[i]);
            const char = line[x];
            if (x > endedCountX || x < nearestCountX) {
                string += char;
            }
        }
        return string;
    }

    getTextAfterPosition (line, pricePosition, countPosition, y) {
        let nearestPriceX = this.getMaxPreviousX(line, pricePosition, this.isNotNumber, y);
        let endedPriceX = this.getEndedCountX(line, nearestPriceX);

        let endedCountX = Object.values(line).length;
        if (!endedPriceX) {
            endedPriceX = endedCountX;
        }
        let nearestCountX = endedCountX;
        if (countPosition) {
            nearestCountX = this.getMaxPreviousX(line, countPosition, this.isNotNumber, y) || nearestCountX;
            endedCountX = this.getEndedCountX(line, nearestCountX);
        }

        let string = '';
        const xKeys = Object.keys(line);
        let xIndex = xKeys.indexOf(endedPriceX.toString()) + 1;
        for (let i = xIndex; i < xKeys.length; i++) {
            const x = parseInt(xKeys[i]);
            const char = line[x];
            if (x > parseInt(endedCountX) || x < parseInt(nearestCountX)) {
                string += char;
            }
        }
        return string;
    }

    getTextFromPricePosition(line, pricePosition, countPosition, y) {
        const textBefore = this.getTextBeforePosition(line, pricePosition, countPosition, y);
        const textAfter = this.getTextAfterPosition(line, pricePosition, countPosition, y);
        return (textAfter.length > textBefore.length) ? textAfter : textBefore;
    }

    hasStopWord(line) {
        const lineString = Object.values(line).join('');
        return _.some(this.stopWords, stopWord => {
            return _.includes(_.lowerCase(lineString), _.lowerCase(stopWord));
        });
    }

    getItems (pricePosition, countPosition, startY, endY, totalPrice) {
        const items = [];
        for (const y in this.lineSymbols) {
            // if (y < startY || y > endY) {
            //     continue;
            // }
            // if (y > this.totalY) {
            //     continue;
            // }
            if (parseInt(y) >= this.totalY) {
                continue;
            }
            const line = this.lineSymbols[y];
            if (this.hasStopWord(line)) {
                continue;
            }
            //
            // if (y  == '833') {
            //     const a = 'g';
            // }
            const numberPositions = this.getPricePositionsForLine(y, true);
            const intNumberPositions = _.map(numberPositions, numberPosition => parseInt(numberPosition.pricePosition));
            const maxNumberPosition = _.max(intNumberPositions);
            if (maxNumberPosition < pricePosition && pricePosition - maxNumberPosition  > MAX_DIFFS_IN_X + 30) {
                continue;
            }
            const price = this.getPriceFromPosition(line, maxNumberPosition, y);
            if (!price) {
                // если разница между текущей строчкой и предудущей строкой = 1 - соединяем их
                // this.joinCurrentRowWithNext(y);
                continue;
            }
            if (price == totalPrice) {
                continue;
            }

            let count;
            if (countPosition) {
                count = this.getPriceFromPosition(line, countPosition);
            }
            const text = this.getTextFromPricePosition(line, pricePosition, countPosition, y);

            items.push({
                price,
                count: 1,
                text
            })
        }
        return items;
    }

    processText() {
        const totalPrice = this.getTotalPrice();

        const {pricePosition, countPosition, startY, endY} = this.getPricePosition(totalPrice);
        const items = this.getItems(pricePosition, countPosition, startY, endY, totalPrice);


        return {
            items,
            totalPrice
        };
    }
}
