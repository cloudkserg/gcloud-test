const StopWord = require('../models/StopWord');
const TotalWord = require('../models/TotalWord');
const TryRecord = require('../models/TryRecord');
const Process = require('../models/Process');
const main = async () => {
    await StopWord.sync();
    await TotalWord.sync();
    await TryRecord.sync();
    await Process.sync();
};
module.exports = main();
