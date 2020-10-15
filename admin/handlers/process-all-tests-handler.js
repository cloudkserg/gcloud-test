const Process = require('../../models/Process');
const TryRecord = require('../../models/TryRecord');
const ProcessAllTestsCommand = require('../commands/process-all-tests-command');
function formatDate(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var sec = date.getSeconds();
    minutes = minutes < 10 ? '0'+minutes : minutes;
    sec = sec < 10 ? '0'+sec : sec;
    var strTime = hours + ':' + minutes + ':' + sec;
    return (date.getMonth()+1) + "." + date.getDate() + "." + date.getFullYear() + "  " + strTime;
}
module.exports = {
    index: async (req, res) => {
        const process = await Process.findOne({order: [['createdAt', 'DESC']]});
        const firstRecord = await TryRecord.findOne({ order: [['id', 'ASC']]});
        const fullCount = await TryRecord.count();
        res.render('process-all-tests/index.ejs', {
            process,
            fullCount,
            formatDate,
            startId: firstRecord ? firstRecord.id : 0
        });
    },

    create: async (req, res) => {
        const params = req.body;
        const process = await Process.create({
            createdAt: new Date(),
            startId: params.startId,
            processedCount: 0,
            fullCount: params.fullCount,
            finishedAt: null
        });


        const processCommand = new ProcessAllTestsCommand(process);
        console.log('STARTED PROCESS #' + process.id);
        processCommand.start().then(() => {
            console.log('FINISHED PROCESS #' + process.id);
        });
        return res.redirect('/admin/process-all-tests');
    }

};
