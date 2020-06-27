const StopWord = require('../models/StopWord');
const TotalWord = require('../models/TotalWord');
const TryRecord = require('../models/TryRecord');
const main = async () => {
    await StopWord.sync();
    await TotalWord.sync();
    await TryRecord.sync()
};
module.exports = main();
