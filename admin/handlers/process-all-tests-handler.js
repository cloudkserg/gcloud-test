const Process = require('../../models/Process');
const TryRecord = require('../../models/TryRecord');
const TryRecordService = require('../../services/try-record-service');
const { Op } = require("sequelize");
const ProcessAllTestsCommand = require('../commands/process-all-tests-command');
function formatDate(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var sec = date.getSeconds();
    minutes = minutes < 10 ? '0'+minutes : minutes;
    sec = sec < 10 ? '0'+sec : sec;
    var strTime = hours + ':' + minutes + ':' + sec;
    return date.getDate()  + "." + (date.getMonth()+1) + "." + date.getFullYear() + "  " + strTime;
}

const getSuccessTests = async (startId, fullCount) => {
    const records = await TryRecord.findAll({
        order: [['id', 'ASC']],
        limit: fullCount > 10000 ? 10000 : fullCount,
        where: {
            id: {[Op.gte]: startId}
        }
    });
    return records.reduce((sum, record) => {
        if (!TryRecordService.isNotTotalRows(record.total, record.rows)) {
            return sum + 1;
        }
        return sum;
    }, 0);
};

module.exports = {
    index: async (req, res) => {
        const process = await Process.findOne({order: [['createdAt', 'DESC']]});
        const prevProcess = await Process.findOne({offset: 1, order: [['createdAt', 'DESC']]});
        const firstRecord = await TryRecord.findOne({ order: [['id', 'ASC']]});
        const fullCount = await TryRecord.count();
        let successTestsCount = null;
        if (process) {
            successTestsCount = await getSuccessTests(process.startId, process.fullCount);
        }

        let prevSuccessTestsCount = null;
        if (prevProcess) {
            prevSuccessTestsCount = await getSuccessTests(prevProcess.startId, prevProcess.fullCount);
        }
        res.render('process-all-tests/index.ejs', {
            process,
            prevProcess,
            fullCount,
            formatDate,
            successTestsCount,
            prevSuccessTestsCount,
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
