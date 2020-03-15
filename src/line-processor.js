const _ = require('lodash');

const MAX_DIFF_NEAREST_Y = 5;
const SPACE_SYMBOL = 'SPACE';
module.exports = class LineProcessor {

    constructor () {
        this.currentLine = "";
        this.currentSymbols = {};
        this.currentWidths = {};
        this.lineSymbols = {};
        this.startYs = {};
        this.debug = {};
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
        for (let prevEndY in this.startYs) {
            let prevStartY = this.startYs[prevEndY];
            if (startY <= prevEndY &&  endY >= prevStartY && prevEndY - endY > MAX_DIFF_NEAREST_Y) {
                return prevEndY;
            }
        }
        return null;
    }

    findNearestY (startY, endY, width) {
        // if (endY == 977) {
        //     const a = 2;
        // }
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

    getWidth(symbol) {
        const vertices = symbol.boundingBox.vertices;
        const minX = _.min(vertices.map(vertice => vertice.x));
        const maxX = _.max(vertices.map(vertice => vertice.x));
        return maxX - minX;
    }

    saveNewCurrentLine(symbol, currentSymbols) {
        const vertice = symbol.boundingBox.vertices[2];
        const endY = vertice.y;
        this.lineSymbols[endY] = currentSymbols;

        const verticeStart = symbol.boundingBox.vertices[0];
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

    addSymbolsToNearestLine(nearestLine, nearestWidths, currentSymbols, currentWidths) {
        for (let compareX in currentSymbols) {
            if (!nearestLine[compareX]) {
                nearestLine[compareX] = currentSymbols[compareX];
                nearestWidths[compareX] = currentWidths[compareX];
            } else {
                let tryCompareX = compareX + 1;
                while (!!nearestLine[tryCompareX]) {
                    tryCompareX = tryCompareX + 1;
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

    updateCurrentLine (symbol, nearestLine, findedY) {
        const vertice = symbol.boundingBox.vertices[2];
        const endY = vertice.y;
        const verticeStart = symbol.boundingBox.vertices[0];
        const startY = verticeStart.y;

        const newEndY = this.updateEndYForCurrentLine(endY, findedY, nearestLine);
        this.updateStartYForCurrentLine(newEndY, findedY, startY);
        return newEndY;
    }

    addDebug(symbol) {
        const verticeStart = symbol.boundingBox.vertices[0];
        const vertice = symbol.boundingBox.vertices[2];
        if (!this.debug[verticeStart.y]) {
            this.debug[verticeStart.y] = [];
        }
        this.debug[verticeStart.y].push(symbol.text + ' - ' + verticeStart.y + '->' + vertice.y);
    }

    finishCurrentLine (symbol) {
        const vertice = symbol.boundingBox.vertices[2];
        const endY = vertice.y;
        const verticeStart = symbol.boundingBox.vertices[0];
        const startY = verticeStart.y;

        const findedY = this.findNearestY(startY, endY, this.getWidth(symbol));
        this.addDebug(symbol);
        if (findedY) {
            let nearestLine = this.lineSymbols[findedY];
            let nearestWidths = this.widths[findedY];

            const {nearestLine: newNearestLine, nearestWidths: newNearestWidths} = this.addSymbolsToNearestLine(
                nearestLine, nearestWidths,
                this.currentSymbols, this.currentWidths
            );
            let newEndY = this.updateCurrentLine(symbol, newNearestLine, findedY);
            this.updateNewCurrentWidths(findedY, newEndY, newNearestWidths);
        } else {
            let newEndY = this.saveNewCurrentLine(symbol, this.currentSymbols);
            this.saveNewCurrentWidths(newEndY, this.currentWidths);
        }
        this.currentSymbols = {};
        this.currentWidths = {};
    }

    parseBreakSymbol(symbol) {
        const endX = symbol.boundingBox.vertices[2].x
        const SYMBOL_TYPES = {
            [`${SPACE_SYMBOL}`]: (symbol) => {
                this.addSymbolToCurrentSymbols(symbol, endX);
                const newSymbol = symbol;
                newSymbol.text = ' ';
                this.addSymbolToCurrentSymbols(newSymbol, endX)
            },
            'EOL_SURE_SPACE': (symbol) => {
                this.addSymbolToCurrentSymbols(symbol, endX);
                const newSymbol = symbol;
                newSymbol.text = ' ';
                this.addSymbolToCurrentSymbols(newSymbol, endX)
                this.finishCurrentLine(symbol);
            },
            'LINE_BREAK': (symbol) => {
                this.addSymbolToCurrentSymbols(symbol, endX);
                this.finishCurrentLine(symbol);
            }
        };

        const detectedBreak = symbol.property.detectedBreak.type;
        if (!SYMBOL_TYPES[detectedBreak]) {
            throw new Error('Not right symbol ' + require('util').inspect(symbol, {depth: 10}));
        }
        return SYMBOL_TYPES[detectedBreak](symbol);
    }

    getTextFromSymbol(symbol) {
        // if (symbol.property && symbol.property.detectedBreak) {
        //     const detectedBreak = symbol.property.detectedBreak.type;
        //     if (detectedBreak === SPACE_SYMBOL) {
        //         return ' ';
        //     }
        //     return '';
        // }
        return symbol.text;
    }

    addSymbolToCurrentSymbols(symbol, x) {
        if (!this.currentSymbols[x]) {
            this.currentSymbols[x] = this.getTextFromSymbol(symbol);
            this.currentWidths[x] = this.getWidth(symbol);
        } else {
            this.addSymbolToCurrentSymbols(symbol, x+1);
        }
    }

    endY(symbol) {
        return symbol.boundingBox.vertices[2].y
    }



    getLines(page) {
      page.blocks.forEach(block => {
          block.paragraphs.forEach(paragraph => {
              paragraph.words.forEach(word => {
                  let prevSymbol = null;
                  word.symbols.forEach(symbol => {
                      const vertice = symbol.boundingBox.vertices[2];
                      const endY = vertice.y;
                      const endX = vertice.x;
                      // if (endY < 933 || endY >= 980) {
                      //     return;
                      // }
                      if (prevSymbol && this.endY(prevSymbol) != endY) {
                          this.finishCurrentLine(prevSymbol);
                      }

                      prevSymbol = symbol;
                      if (symbol.property && symbol.property.detectedBreak) {
                          this.parseBreakSymbol(symbol);
                      } else {
                          this.addSymbolToCurrentSymbols(symbol, endX);
                      }
                  });
                  if (prevSymbol && !this.isEmptyCurrentSymbols()) {
                      this.finishCurrentLine(prevSymbol);
                  }

              });
          });
      });
      return _.chain(this.getFlatLines())
          .toPairs()
          .sortBy(0)
          .fromPairs()
          .value();
    }

    isEmptyCurrentSymbols() {
        return Object.values(this.currentSymbols).length === 0;
    }

    getFlatLines() {
        const lines = {};
        for (let y in this.lineSymbols) {
            lines[y] = Object.values(this.lineSymbols[y]).join('');
        }
        return lines;
    }

    getWidths() {
        return this.widths;
    }
};
