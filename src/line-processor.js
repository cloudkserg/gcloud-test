const _ = require('lodash');

const MAX_DIFF_NEAREST_Y = 5;
const SPACE_SYMBOL = 'SPACE';
module.exports = class LineProcessor {

    constructor () {
        this.lineSymbols = {};
        this.startYs = {};
        this.debug = {};
        this.transformations = {};
        this.widths = {};
    }

    getLineSymbols() {
        return this.lineSymbols;
    }

    getSymbolsX(y) {
        return this.lineSymbols[y];
    }

    findExistedYWithMinDiff (y, height) {
        const diffs = _.range(0, height * 0.5 > MAX_DIFF_NEAREST_Y ? height * 0.5 : MAX_DIFF_NEAREST_Y);
        const candidates =  _.chain(diffs)
            .map(diff => [y + diff, y-diff])
            .flatten()
            .filter(diff => !!this.lineSymbols[diff])
            .value();
        //find with min diff line
        return _.reduce(candidates, (minCandidate, candidate) => {
            if (!minCandidate) {
                return candidate;
            }
            const minDiff = Math.abs(minCandidate - y)
            const currDiff = Math.abs(candidate - y);
            return currDiff < minDiff ? candidate : minCandidate;
        }, null);
    }

    findExistedEndYByStartYsWithMinDiff (startY) {
        const diffs = _.range(0, MAX_DIFF_NEAREST_Y);
        const endYs = _.invert(this.startYs);
        const candidates =  _.chain(diffs)
            .map(diff => [startY + diff, startY-diff])
            .flatten()
            .filter(diff => !!endYs[diff])
            .value();
        //find with min diff line
        const existedStartY =  _.reduce(candidates, (minCandidate, candidate) => {
            if (!minCandidate) {
                return candidate;
            }
            const minDiff = Math.abs(minCandidate - startY)
            const currDiff = Math.abs(candidate - startY);
            return currDiff < minDiff ? candidate : minCandidate;
        }, null);
        if (!existedStartY) {
            return null;
        }
        return endYs[existedStartY];
    }

    findNextYThatClosedToThisY (endY) {
        const nextEndY = this.getNextYForNotExist(endY);
        if (nextEndY) {
            const nextStartY = this.startYs[nextEndY];
            if (nextStartY <= endY) {
                return nextEndY;
            }
        }
        return null;
    }

    findPrevYThatClosedToThisStartY (startY, endY) {
        const prevEndY = this.getPrevYForNotExist(endY);
        if (prevEndY) {
            if (startY < prevEndY && prevEndY - startY > 2) {
                return prevEndY;
            }
        }

        return null;
    }


    findYWithDiff(startY, endY) {
        let maxCrossPoints = 0;
        let savedPrevEndY = null;
        for (let prevEndY in this.startYs) {
            let prevStartY = parseInt(this.startYs[prevEndY]);
            prevEndY = parseInt(prevEndY);

            const tryMaxCrossPoints = Math.abs(this.getCrossLength(
                {start: parseInt(startY), end: parseInt(endY)},
                {start: parseInt(prevStartY), end: parseInt(prevEndY)}
            ));
            const heightOfChar = endY - startY;
            const minCrossing = 0.2 * heightOfChar;
            if (tryMaxCrossPoints > maxCrossPoints && tryMaxCrossPoints >= minCrossing) {
                maxCrossPoints = tryMaxCrossPoints;
                savedPrevEndY = prevEndY;
            }
        }
        return savedPrevEndY;
    }


    findNearestY (startY, endY, width) {
        const yWithDiff = this.findYWithDiff(startY, endY);
        if (yWithDiff) {
            return yWithDiff;
        }
        const nextEndY = this.findNextYThatClosedToThisY(endY);
        if (nextEndY) {
            return nextEndY;
        }

        const prevEndY = this.findPrevYThatClosedToThisStartY(startY, endY);
        if (prevEndY) {
            return prevEndY;
        }

        const existedYWithMinDiff = this.findExistedYWithMinDiff(endY, endY - startY);
        if (existedYWithMinDiff) {
            return existedYWithMinDiff;
        }
        const existedYByStartYsWithMinDiff = this.findExistedEndYByStartYsWithMinDiff(startY);
        if (existedYByStartYsWithMinDiff) {
            return existedYByStartYsWithMinDiff;
        }


        return null;
    }

    getNextYForNotExist(y) {
        let ys = Object.keys(this.lineSymbols);
        const minMaxY =_.chain(ys)
            .filter(existedY => existedY >= y)
            .min()
            .value();
        return minMaxY;
    }

    getPrevYForNotExist(y) {
        let ys = Object.keys(this.lineSymbols);
        const maxMinY =_.chain(ys)
            .filter(existedY => existedY < y)
            .max()
            .value();
        return maxMinY;
    }

    getWidth(vertices) {
        const minX = _.min(vertices.map(vertice => vertice.x));
        const maxX = _.max(vertices.map(vertice => vertice.x));
        return maxX - minX;
    }

    saveNewCurrentLine(vertices, currentSymbols) {
        const vertice = vertices[2];
        const endY = vertice.y;
        this.lineSymbols[endY] = currentSymbols;

        const verticeStart = vertices[0];
        const startY = verticeStart.y;
        this.startYs[endY] =  startY;

        return endY;
    }

    saveNewCurrentWidths(endY, currentWidths) {
        this.widths[endY] = currentWidths;
    }

    updateNewCurrentWidths(oldEndY, endY, newCurrentWidths) {
        delete this.widths[oldEndY];
        this.widths[endY] = newCurrentWidths;
    }

    addSymbolsToNearestLine(nearestLine, nearestWidths, currentSymbols, currentWidths, findedY) {
        for (let compareX in currentSymbols) {
            if (!nearestLine[compareX]) {
                nearestLine[compareX] = currentSymbols[compareX];
                nearestWidths[compareX] = currentWidths[compareX];
            } else {
                let tryCompareX = +compareX + 1;
                while (!!nearestLine[tryCompareX]) {
                    tryCompareX = +tryCompareX + 1;
                }
                if (tryCompareX != compareX) {
                    this.addTransformationDebug(findedY, tryCompareX, compareX)
                }
                nearestLine[tryCompareX] = currentSymbols[compareX];
                nearestWidths[tryCompareX] = currentWidths[compareX];
            }
        }
        return {nearestLine, nearestWidths};
    }

    updateEndYForCurrentLine(currentY, nearestY, nearestLine) {
        let newEndY = nearestY;
        if (currentY > nearestY) {
            newEndY = currentY;
            delete this.lineSymbols[nearestY];
            this.lineSymbols[newEndY] = nearestLine;
        }
        return newEndY;
    }

    updateStartYForCurrentLine(newEndY, oldEndY, newStartY) {
        const oldStartY = this.startYs[oldEndY];
         let updatedY = oldStartY;
         if (newStartY < oldStartY) {
             updatedY = newStartY;
         }
        delete this.startYs[oldEndY];
        this.startYs[newEndY] = updatedY;
    }

    updateCurrentLine (vertices, nearestLine, findedY) {
        const vertice = vertices[2];
        const endY = vertice.y;
        const verticeStart = vertices[0];
        const startY = verticeStart.y;


        //todo: may be or may not
        //const newEndY = this.updateEndYForCurrentLine(endY, findedY, nearestLine);
        //this.updateStartYForCurrentLine(newEndY, findedY, startY);
        //return newEndY;

        return findedY;
    }

    addTransformationDebug(y, newX, prevX) {
        if (!this.transformations[y]) {
            this.transformations[y] = [];
        }
        this.transformations[y].push(`${prevX} => ${newX}`);
    }

    addDebug(symbol) {
        const verticeStart = symbol.boundingBox.vertices[0];
        const vertice = symbol.boundingBox.vertices[2];
        if (!this.debug[verticeStart.y]) {
            this.debug[verticeStart.y] = [];
        }
        this.debug[verticeStart.y].push(
            `${symbol.text} - y(${verticeStart.y}->${vertice.y})` +
             `, x(${verticeStart.x}->${vertice.x})`
             );
    }

    finishCurrentLine (text, width, vertices) {
        const vertice = vertices[2];
        const endY = vertice.y;
        const verticeStart = vertices[0];
        const startY = verticeStart.y;

        const currentSymbols = {};
        currentSymbols[vertice.x] = text;
        const currentWidths = {};
        currentWidths[vertice.x] = width;


        const findedY = this.findNearestY(startY, endY, this.getWidth(vertices));
        if (findedY) {
            let nearestLine = this.lineSymbols[findedY];
            let nearestWidths = this.widths[findedY];

            currentSymbols[vertice.x] = ' ' + text;
            const {nearestLine: newNearestLine, nearestWidths: newNearestWidths} = this.addSymbolsToNearestLine(
                nearestLine, nearestWidths,
                currentSymbols, currentWidths,
                findedY
            );
            let newEndY = this.updateCurrentLine(vertices, newNearestLine, findedY);
            this.updateNewCurrentWidths(findedY, newEndY, newNearestWidths);
        } else {
            let newEndY = this.saveNewCurrentLine(vertices, currentSymbols);
            this.saveNewCurrentWidths(newEndY, currentWidths);
        }
    }

    endY(symbol) {
        return symbol.boundingBox.vertices[2].y
    }


    getCrossLength(lineOne, lineSecond) {
        if (lineOne.start - MAX_DIFF_NEAREST_Y > lineSecond.end) {
            return 0;
        }
        if (lineOne.end + MAX_DIFF_NEAREST_Y  < lineSecond.start) {
            return 0;
        }

        //first situation - one started after second
        if (lineOne.start >= lineSecond.start) {
            //first - one - one almost in second
            if (lineOne.end <= lineSecond.end) {
                return lineOne.end - lineOne.start;
            } else {
                return lineSecond.end - lineOne.start;
            }
        }
        //second situation - one started before second
        if (lineOne.start <= lineSecond.start) {
            //first - second - second almost in one
            if (lineSecond.end <= lineOne.end) {
                return lineSecond.end - lineSecond.start;
            } else {
                return lineOne.end - lineSecond.start;
            }
        }
        return 1;
    }


    getLines(segments) {
      segments.forEach(segment => {
          const verticeTop = segment.boundingPoly.vertices[0];
          const verticeDown = segment.boundingPoly.vertices[3];

          const endY = verticeDown.y;
          const endX = verticeDown.x;
          const width = this.getWidth(segment.boundingPoly.vertices);
          this.finishCurrentLine(segment.description, width, segment.boundingPoly.vertices);


      });

      return _.chain(this.getFlatLines())
          .toPairs()
          .sortBy(0)
          .fromPairs()
          .value();
    }

    getFlatLines() {
        const lines = {};
        for (let y in this.lineSymbols) {
            lines[y] = Object.values(this.lineSymbols[y]).join(' ');
        }
        return lines;
    }

    getWidths() {
        return this.widths;
    }

    getDebug() {
        const debug = {};
        for (let y in this.lineSymbols) {
            const line = this.lineSymbols[y];
            const debugLine = {}
            for (const x in line) {
                const char = line[x];
                const startX = x - this.widths[y][x];
                debugLine[x] = `${char}(${startX}->${x})`;
            }
            debug[y] = debugLine;
        }
        return debug;
    }
};
