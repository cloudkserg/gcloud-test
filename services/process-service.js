const {Op} = require('sequelize')
const Process = require('../models/Process')

module.exports = class ProcessService {

    async getAllProcesses() {
        return Process.findAll({
            where: {
                finishedAt: {[Op.not]: null},
            },
            order: [['id', 'DESC']]
        });
    }

    static async create(params) {
        return Process.create({
            createdAt: new Date(),
            startId: params.startId,
            processedCount: 0,
            fullCount: params.fullCount,
            finishedAt: null
        });
    }

    static  async getLastProcess() {
        return Process.findOne({
            order: [['id', 'DESC']]
        });
    }

    static async getPrevLastProcess(lastProcessId) {
        return Process.findOne({
            where: {
                finishedAt: {[Op.not]: null},
                id: {[Op.lt]: lastProcessId}
            },
            order: [['id', 'DESC']]
        });
    }

    async getItem(processId) {
        return Process.findOne({
            where: [{"id": processId}],
        });
    }

};
