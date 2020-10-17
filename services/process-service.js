
const Process = require('../models/Process')

module.exports = class ProcessService {

    async getAllProcesses() {
        return Process.findAll();
    }

    async getItem(processId) {
        return Process.findOne({
            where: [{"id": processId}],
        });
    }

};
