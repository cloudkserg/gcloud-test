const _ = require('lodash');

const MAX_DIFF_NEAREST_Y = 12;
module.exports = class LineProcessor {

    constructor () {
        this.currentLine = "";
        this.currentSymbols = {};
        this.lineSymbols = {};
    }

    getLineSymbols() {
        return this.lineSymbols;
    }

    getSymbolsX(y) {
        return this.lineSymbols[y];
    }

    findNearestY (y) {
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

    finishCurrentLine (symbol) {
        const vertice = symbol.boundingBox.vertices[3];
        const currentY = vertice.y;
        const findedY = this.findNearestY(currentY);
        if (findedY) {
            const nearestLine = this.lineSymbols[findedY];
            for (let compareX in this.currentSymbols) {
                if (!nearestLine[compareX]) {
                    nearestLine[compareX] = this.currentSymbols[compareX];
                } else {
                    let tryCompareX = compareX + 1;
                    while (!!nearestLine[tryCompareX]) {
                        tryCompareX = tryCompareX + 1;
                    }
                    nearestLine[tryCompareX] = this.currentSymbols[compareX];
                }
            }

        } else {
            this.lineSymbols[currentY] = this.currentSymbols;
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
                      if (vertice.y < 883) {
                          return;
                      }
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
