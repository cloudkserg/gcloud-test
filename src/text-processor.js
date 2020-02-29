String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

const _ = require('lodash');
const MAX_DIFFS_IN_X = 20;
const MAX_DIFF_FOR_SPACE = 30;

module.exports =  class TextProcessor {

    constructor (lineSymbols, lines) {
        this.lineSymbols = lineSymbols;
        this.processY = null;
        this.lines = lines;
        this.savedPositions = null;
        this.savePositionOnY = 0;
    }


    findNearestX (line, x) {
        const diffs = _.range(0, MAX_DIFFS_IN_X);
        const prevX = _.chain(diffs)
            .map(diff => [+x-diff])
            .flatten()
            .find(diff => !!line[diff])
            .value();

        if (prevX) {
            return prevX;
        }
        return _.chain(diffs)
            .map(diff => [+x+diff])
            .flatten()
            .find(diff => !!line[diff])
            .value();
    }

    isSpaceOnPosition(line, x) {
        return line[x] == ' ';
    }


    nextLineHasStartTextOnPosition (nextLine, startTextPosition) {
        const nearestX = this.findNearestX(nextLine, startTextPosition);
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
            if (this.nextLineHasStartTextOnPosition(nextLine, startTextPosition)) {
                return startTextPosition;
            }
        }
        return null;
    }

    getTextFromPosition (line, x) {
        let nearestX = this.getMaxPreviousX(line, x, (x) => true);
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

    getMaxPreviousX(line, x, isCondition) {
        let maxNearestX = this.findNearestX(line, x);
        let currentNearestX =  this.getPrevX(line, maxNearestX);
        while (
            currentNearestX &&
            this.isCLosedToPreviousSymbol(line, currentNearestX) &&
            isCondition(line[currentNearestX])
            ) {
            maxNearestX = currentNearestX;
            currentNearestX = this.getPrevX(line, currentNearestX);
        }
        return maxNearestX;
    }

    isStartNumber(line, x) {
        if (!this.isCLosedToPreviousSymbol(line, x)) {
            return true;
        }

        const prevChar = this.getPrevXChar(line, x);
        const isSign = prevChar == '.' || prevChar == ',';
        if (isSign) {
             return this.isStartNumber(line, this.getPrevX(line, x));
        }
        return isNaN(parseInt(prevChar));
    }

    getPriceFromPosition (line, x) {
        let nearestX = this.findNearestX(line, x);
        const char = line[nearestX];
        if (isNaN(parseInt(char))) {
            return NaN;
        }
        if (!this.isStartNumber(line, nearestX)) {
            return NaN;
        }

        let price = char;
        let currentX = this.getNextX(line, nearestX);
        if (!currentX) {
            return price;
        }
        currentX = currentX.toString();

        let isEndPrice = false;

        while(!isEndPrice) {
            const nextChar = line[currentX];

            if (nextChar === null || nextChar == ' ' || !this.isCLosedToPreviousSymbol(line, currentX)) {
                isEndPrice = true;
            } else {
                if (nextChar === '.' || nextChar == ',') {
                    price += '.';
                } else if (!isNaN(parseInt(nextChar))) {
                    price += nextChar;
                }
            }
            currentX = this.getNextX(line, currentX);
        }

        return parseFloat(price);
    }

    nextLineHasStartPriceOnPosition (nextLine, startPricePosition) {
        const nearestX = this.findNearestX(nextLine, startPricePosition);
        if (!nearestX) {
            return false;
        }
        if (isNaN(parseInt(nextLine[nearestX]))) {
            return false;
        }

        return true;
    }

    calculatePricePositions(line, y) {
        const nextLine = this.getNextLine(y);
        if (!nextLine) {
            return [];
        }





        const pricePositions = [];
        let inMediumPrice = false;
        for (const x in line) {
            const curChar = line[x];
            if (curChar == ' ') {
                inMediumPrice = false;
                continue;
            }

            if (!this.isCLosedToPreviousSymbol(line, x)) {
                inMediumPrice = false;
            }

            if (inMediumPrice) {
                continue;
            }

            const price = this.getPriceFromPosition(line, x);
            if (isNaN(price)) {
                inMediumPrice = false;
                continue;
            }

            inMediumPrice = true;
            const startPricePosition = x;
            if (this.nextLineHasStartPriceOnPosition(nextLine, startPricePosition)) {
                pricePositions.push(startPricePosition);
            } else {
                const secondNextLine = this.getSecondNextLine(y);
                if (secondNextLine && this.nextLineHasStartPriceOnPosition(secondNextLine, startPricePosition)) {
                    pricePositions.push(startPricePosition);
                }
            }
        }
        return pricePositions;
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

    calculatePositions(line, y) {

        const nextLine = this.getNextLine(y);
        if (!nextLine) {
            return null;
        }

        const pricePositions = this.calculatePricePositions(line, y);
        if (pricePositions.length === 0) {
            return null;
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

    isCLosedToPreviousSymbol (line, x) {
        const prevX = this.getPrevX(line, x);
        if (!prevX) {
            return false;
        }
        return parseInt(x) - parseInt(prevX) <= MAX_DIFF_FOR_SPACE;
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
        const totalWords = [
            'Total',
            'Karte',
            'Sunne',
            'Итого',
            'Всего',
            'Сумма'
        ];
        return _.some(totalWords, totalWord => {
            return _.includes(_.lowerCase(line), _.lowerCase(totalWord));
        });
    }

    endedWithPoint(price) {
        if (price.length === 0) {
            return false;
        }
        return price[price.length - 1] === '.';
    }

    hasPointInMedium(price) {
        const pointPosition = price.indexOf('.');
        return pointPosition !== -1 || pointPosition !== 0 || pointPosition !== (price.length - 1);
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
    getPriceFromLine(line) {
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

    getTotalPrice() {
        let totalPrice = null;
        for (const y of Object.keys(this.lines)) {
            const line = this.lines[y];
            if (this.hasTotalWord(line)) {
                const checkTotalPrice = this.getPriceFromLine(line);
                if (checkTotalPrice) {
                    totalPrice = checkTotalPrice;
                    this.totalY = y;
                }
            }
        }
        return totalPrice;
    }

    minimizeXTo (line, minX) {
        const newLine = {};
        const diffX = MAX_DIFFS_IN_X + 1;
        let prevX = 0;
        for (const x in line) {
            if (x >= (minX - diffX)) {
                newLine[prevX] += line[x];
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

    getSumNumberForPosition (numberPosition, currentY) {
        let sumPrice = 0;
        let tryItemsInPrice = 0;
        let lastSavedYIndex = null;
        let currencyYIndex = 0;
        const newLineSymbols = this.lineSymbols;
        for (const y in newLineSymbols) {
            if (parseInt(y) >= parseInt(this.totalY)) {
                break;
            }
            //начинаем считать с текущей строчки
            currencyYIndex++;
            //skip before currentY
            if (y < currentY) {
                continue;
            }

            //skip after totalY
            if (y >= this.totalY) {
                break;
            }

            //если разница между последним сохраненным и текущим больше двух строк -- заканчиваем
            if (lastSavedYIndex && currencyYIndex - lastSavedYIndex > 2) {
                break;
            }


            const line = this.lineSymbols[y];
            const priceStr = this.getPriceFromPosition(line, numberPosition);
            const price = parseFloat(priceStr);
            if (price && price > 0) {
                sumPrice += price;
                tryItemsInPrice++;
                lastSavedYIndex = currencyYIndex;
            }

        }
        const yIndexes = Object.keys(this.lineSymbols);
        return {price: sumPrice, priceItems: tryItemsInPrice, endY: yIndexes[lastSavedYIndex-1]};
    }

    getCountPositionFromNumberCalculations(priceCalculation, priceCalculations = null) {
        if (!priceCalculations || Object.keys(priceCalculations).length == 0) { return null; }
        const maxPriceCalculation = this.getMaxPriceCalculationsByPriceItemsAndPrice(priceCalculations);
        const diffPosition = parseInt(priceCalculation.pricePosition) - parseInt(maxPriceCalculation.pricePosition);
        const sizeDiffPosition = Math.abs(diffPosition);
        if (sizeDiffPosition <= MAX_DIFFS_IN_X) {
            delete priceCalculations[maxPriceCalculation.pricePosition];
            return this.getCountPositionFromNumberCalculations(priceCalculation, priceCalculations);
        }
        return maxPriceCalculation.pricePosition;
    }

    getPositionsFromCalculation (priceCalculation, priceCalculations = null) {
        const countPosition = this.getCountPositionFromNumberCalculations(priceCalculation, priceCalculations);
        return {
            pricePosition: priceCalculation.pricePosition,
            countPosition,
            startY: priceCalculation.startY,
            endY: priceCalculation.endY
        };
    }


    getPricePosition (totalPrice) {
        const skippedPositions = [];
        const totalPriceCalculation = {
            pricePosition: null,
            priceItems: 0,
            startY: 0,
            endY: 0
        };
        const priceCalculations = [];
        //     pricePosition: null, [2: {price: 10, priceItems: 10, startY: 0, endY: 0}]
        //     priceItems: 0
        // };

        for (const y in this.lineSymbols) {
        // const y = '566';
            if (parseInt(y) >= parseInt(this.totalY)) {
                break;
            }
            const line = this.lineSymbols[y];
            const numberPositions = this.calculatePricePositions(line, y);
            for (const numberPosition of numberPositions) {
                // if (skippedPositions.includes(numberPosition)) {
                //     continue;
                // }
                const {price, priceItems: tryItemsInPrice, endY: tryEndY} = this.getSumNumberForPosition(numberPosition, y);
                if (price == totalPrice && tryItemsInPrice > totalPriceCalculation.priceItems) {
                    totalPriceCalculation.priceItems = tryItemsInPrice;
                    totalPriceCalculation.pricePosition = numberPosition;
                    totalPriceCalculation.startY = y;
                    totalPriceCalculation.price = price;
                    totalPriceCalculation.endY = tryEndY;
                } else if (!priceCalculations[numberPosition] || tryItemsInPrice > priceCalculations[numberPosition].priceItems) {
                    priceCalculations[numberPosition] = {
                        priceItems: tryItemsInPrice,
                        pricePosition: numberPosition,
                        startY: y,
                        price,
                        endY: tryEndY
                    };
                }
                skippedPositions.push(numberPosition);
            }
        }

        const maxPriceCalculation = this.getMaxPriceCalculationsByPriceItemsAndPrice(priceCalculations);
        const priceItems = maxPriceCalculation ? maxPriceCalculation.priceItems : 0;
        if (totalPriceCalculation.priceItems >= priceItems) {
            return this.getPositionsFromCalculation(totalPriceCalculation, priceCalculations);
        }

        if (!maxPriceCalculation) {
            return this.getPositionsFromCalculation(totalPriceCalculation);
        }
        return this.getPositionsFromCalculation(maxPriceCalculation, priceCalculations);
    }

    getMaxPriceCalculationsByPriceItemsAndPrice(priceCalculations) {
        return priceCalculations.reduce((maxPriceCalculation, priceCalculation) => {
            if (!maxPriceCalculation) {
                return priceCalculation;
            }
            if (priceCalculation.priceItems < maxPriceCalculation.priceItems) {
                return maxPriceCalculation;
            }
            if (priceCalculation.price < maxPriceCalculation.price) {
                return maxPriceCalculation;
            }
            return priceCalculation;
        }, null);
    }

    isNotNumber(x) {
        return !isNaN(parseInt(x)) && x != '.' && x != ',';
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

    getTextBeforePosition (line, pricePosition, countPosition) {
        let nearestPriceX = this.getMaxPreviousX(line, pricePosition, this.isNotNumber);
        if (!nearestPriceX) {
            nearestPriceX = line.length;
        }
        let nearestCountX = Object.values(line).length;
        let endedCountX = nearestCountX;
        if (countPosition) {
            nearestCountX = parseInt(this.getMaxPreviousX(line, countPosition, this.isNotNumber)) || nearestCountX;
            endedCountX = parseInt(this.getEndedCountX(line, nearestCountX));
        }

        let string = '';

        const xKeys = Object.keys(line);
        let xIndex = xKeys.indexOf(nearestPriceX.toString());
        for (let i = 0; i < xIndex; i++) {
            const x = parseInt(xKeys[i]);
            const char = line[x];
            if (x > endedCountX || x < nearestCountX) {
                string += char;
            }
        }
        return string;
    }

    getTextAfterPosition (line, pricePosition, countPosition) {
        let nearestPriceX = this.getMaxPreviousX(line, pricePosition, this.isNotNumber);
        let endedPriceX = this.getEndedCountX(line, nearestPriceX);
        if (!endedPriceX) {
            endedPriceX = line.length;
        }
        let endedCountX = Object.values(line).length;
        let nearestCountX = endedCountX;
        if (countPosition) {
            nearestCountX = this.getMaxPreviousX(line, countPosition, this.isNotNumber) || nearestCountX;
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

    getTextFromPricePosition(line, pricePosition, countPosition) {
        const textBefore = this.getTextBeforePosition(line, pricePosition, countPosition);
        const textAfter = this.getTextAfterPosition(line, pricePosition, countPosition);
        return (textAfter.length > textBefore.length) ? textAfter : textBefore;
    }

    getItems (pricePosition, countPosition, startY, endY) {
        const items = [];
        for (const y in this.lineSymbols) {
            if (y < startY || y > endY) {
                continue;
            }
            const line = this.lineSymbols[y];

            const price = this.getPriceFromPosition(line, pricePosition);
            if (!price) {
                // если разница между текущей строчкой и предудущей строкой = 1 - соединяем их
                this.joinCurrentRowWithNext(y);
                continue;
            }

            let count;
            if (countPosition) {
                count = this.getPriceFromPosition(line, countPosition);
            }
            const text = this.getTextFromPricePosition(line, pricePosition, countPosition);

            items.push({
                price,
                count,
                text
            })
        }
        return items;
    }

    processText() {
        const totalPrice = this.getTotalPrice();

        const {pricePosition, countPosition, startY, endY} = this.getPricePosition(totalPrice);
        const items = this.getItems(pricePosition, countPosition, startY, endY);


        return {
            items,
            totalPrice
        };
    }
}
