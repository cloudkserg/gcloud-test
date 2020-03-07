const _ = require('lodash');

const MAX_DIFF_NEAREST_Y = 12;
module.exports = class LineProcessor {

    constructor () {
        this.currentLine = "";
        this.currentSymbols = {};
        this.lineSymbols = {};
        this.startYs = {};
    }

    getLineSymbols() {
        return this.lineSymbols;
    }

    getSymbolsX(y) {
        return this.lineSymbols[y];
    }

    findExistedYWithMinDiff (y) {
        const diffs = _.range(0, MAX_DIFF_NEAREST_Y);
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
            if (startY <= prevEndY) {
                return prevEndY;
            }
        }

        return null;
    }

    findNearestY (startY, endY) {
        const existedYWithMinDiff = this.findExistedYWithMinDiff(endY);
        if (existedYWithMinDiff) {
            return existedYWithMinDiff;
        }
        const existedYByStartYsWithMinDiff = this.findExistedEndYByStartYsWithMinDiff(startY);
        if (existedYByStartYsWithMinDiff) {
            return existedYByStartYsWithMinDiff;
        }

        const nextEndY = this.findNextYThatClosedToThisY(endY);
        if (nextEndY) {
            return nextEndY;
        }

        const prevEndY = this.findPrevYThatClosedToThisStartY(startY, endY);
        if (prevEndY) {
            return prevEndY;
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

    saveNewCurrentLine(symbol, currentSymbols) {
        const vertice = symbol.boundingBox.vertices[3];
        const endY = vertice.y;
        const verticeStart = symbol.boundingBox.vertices[0];
        const startY = verticeStart.y;

        this.lineSymbols[endY] = currentSymbols;
        this.startYs[endY] =  startY;
    }

    addSymbolsToNearestLine(nearestLine, currentSymbols) {
        for (let compareX in currentSymbols) {
            if (!nearestLine[compareX]) {
                nearestLine[compareX] = currentSymbols[compareX];
            } else {
                let tryCompareX = compareX + 1;
                while (!!nearestLine[tryCompareX]) {
                    tryCompareX = tryCompareX + 1;
                }
                nearestLine[tryCompareX] = currentSymbols[compareX];
            }
        }
        return nearestLine;
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
        const vertice = symbol.boundingBox.vertices[3];
        const endY = vertice.y;
        const verticeStart = symbol.boundingBox.vertices[0];
        const startY = verticeStart.y;

        const newEndY = this.updateEndYForCurrentLine(endY, findedY, nearestLine);
        this.updateStartYForCurrentLine(newEndY, findedY, startY);
    }

    finishCurrentLine (symbol) {
        const vertice = symbol.boundingBox.vertices[3];
        const endY = vertice.y;
        const verticeStart = symbol.boundingBox.vertices[0];
        const startY = verticeStart.y;

        const findedY = this.findNearestY(startY, endY);
        if (findedY) {
            let nearestLine = this.lineSymbols[findedY];
            nearestLine = this.addSymbolsToNearestLine(nearestLine, this.currentSymbols);
            this.updateCurrentLine(symbol, nearestLine, findedY);
        } else {
            this.saveNewCurrentLine(symbol, this.currentSymbols);
        }
        this.currentLine = "";
        this.currentSymbols = {};
    }

    parseBreakSymbol(symbol) {
        const SYMBOL_TYPES = {
            'SPACE': (symbol) => this.addSymbolToLine(" ", symbol.boundingBox.vertices[3].x),
            'EOL_SURE_SPACE': (symbol) => this.finishCurrentLine(symbol),
            'LINE_BREAK': (symbol) => this.finishCurrentLine(symbol)
        };

        const detectedBreak = symbol.property.detectedBreak.type;
        if (!SYMBOL_TYPES[detectedBreak]) {
            throw new Error('Not right symbol ' + require('util').inspect(symbol, {depth: 10}));
        }
        return SYMBOL_TYPES[detectedBreak](symbol);
    }

    addSymbolToCurrentSymbols(symbol, x) {
        if (!this.currentSymbols[x]) {
            this.currentSymbols[x] = symbol;
        } else {
            this.addSymbolToCurrentSymbols(symbol, x+1);
        }
    }

    addSymbolToLine(symbol, x) {
        this.currentLine += symbol;
        this.addSymbolToCurrentSymbols(symbol, x);
    }

    clearCurrentLine() {
        this.currentLine = "";
    }



    getLines(page) {
      page.blocks.forEach(block => {
          block.paragraphs.forEach(paragraph => {
              this.clearCurrentLine();
              paragraph.words.forEach(word => {
                  let prevSymbol = null;
                  word.symbols.forEach(symbol => {
                      const vertice = symbol.boundingBox.vertices[3];
                      if (prevSymbol && prevSymbol.boundingBox.vertices[3].y != vertice.y) {
                          this.finishCurrentLine(prevSymbol);
                      }
                      prevSymbol = symbol;
                      this.addSymbolToLine(symbol.text, symbol.boundingBox.vertices[3].x);
                      if (symbol.property && symbol.property.detectedBreak) {
                          this.parseBreakSymbol(symbol);
                      }
                  });
                  if (prevSymbol && this.currentLine.length > 0) {
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

    getFlatLines() {
        const lines = {};
        for (let y in this.lineSymbols) {
            lines[y] = Object.values(this.lineSymbols[y]).join('');
        }
        return lines;
    }
};
