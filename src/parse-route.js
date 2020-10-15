const parseRecord = require('./parse-record');
const fs = require('fs');

module.exports = async (req, res, next) => {

    try {
        const result  = await parseRecord(req.file.path);
        await fs.unlinkSync(req.file.path);
        res.json(result);
     } catch (err) {
         console.error(err);
         res.end('Cloud Vision Error: ' + err.toString());
         return;
     }
};
