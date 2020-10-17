
const TryRecord = require('../models/TryRecord')
const ProcessService = require('./process-service')
const {Op} = require('sequelize')
const fs = require('fs');
const path = require('path');

const getDateFilter = async (processId) => {
  const processService = new ProcessService();
  const process = await processService.getItem(processId);
  if (!process) {
      return [new Date(), new Date()];
  }
  return [process.createdAt, process.finishedAt];
};

const getTotalRows = (rows) => {
    const rowsString = JSON.parse(rows);
    if (!rowsString) {
        return 0;
    }
    return parseFloat(rowsString.reduce((sum, row) => {
        return sum + parseFloat(row.price);
    }, 0));
};

const isNotTotalRows = (total, rows) => {
    const totalRows  = getTotalRows(rows);
    return parseFloat(totalRows).toFixed(2) != parseFloat(total).toFixed(2);
};

const applyDateFilter = async (dates) => {
  return {
      [Op.and]: [
          {createdAt: {[Op.gte]: dates[0]}},
          {createdAt: {[Op.lte]: dates[1]||new Date() }}
      ]
  }
};

const filterBadRow = (row) => {
    return isNotTotalRows(row.total, row.rows);
};

const getRecordIdsByTypeRecord = async (typeRecord) => {
    const rows = await TryRecord.findAll();
    if (typeRecord === 'bad') {
      return rows.filter(filterBadRow).map(row => row.id);
     }
    if (typeRecord === 'success') {
        return rows.filter(row => !filterBadRow(row)).map(row => row.id);
    }
    return rows.map(row => row.id);
};

const applyTypeRecord = async (typeRecord) => {
    const rowIds = await getRecordIdsByTypeRecord(typeRecord);
    return {
        "id": {[Op.in]: rowIds},
    };
}

const TYPE_RECORDS = [
    'all',
    'bad',
    'success'
];

module.exports = class TryRecordService {
    static isNotTotalRows(total, rows) {
        return isNotTotalRows(total, rows);
    }

    static getTypeRecords() {
     return TYPE_RECORDS;
    }

    static getTotalRows(rows) {
        return getTotalRows(rows);
    }

    async getRowsForPage(filter, currentPage, PAGE_SIZE) {
        const whereConditions = [];
        if (filter.typeRecord) {
            whereConditions.push(await applyTypeRecord(filter.typeRecord));
        }
        if (filter.processId && filter.processId > 0) {
            const dateFilter = await getDateFilter(filter.processId);
            whereConditions.push(await applyDateFilter(dateFilter));
        }
        return TryRecord.findAll({
            where: {
                [Op.and]: whereConditions
            },
            order: [['id', 'DESC']],
            offset: +(currentPage*PAGE_SIZE || 0),
            limit: PAGE_SIZE
        });
    }

    async addRecord(filepath, total, rows, googleJson, speed, google_speed) {
        const file = this.copyImage(filepath);
        await TryRecord.create({
            file,
            total,
            speed,
            google_speed,
	        result: false,
            rows: JSON.stringify(rows),
            json: JSON.stringify(googleJson)
        });
    }

    static getFilePath(file) {
        return __dirname + '/../public/try-files/' + file;
    }

    static getPublicPath(file) {
        return '/try-files/' + file;
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    // static getInputPath(filepath) {
    //     return __dirname + '/../uploads/' +filepath;
    // }
    //
    copyImage(filepath) {
        const pathDir = path.dirname(filepath);
        const randNumber = this.getRandomInt(1000);
        const newFilepath = pathDir + '/' + Date.now() + '_' + randNumber +  '.jpg';

        fs.copyFileSync(filepath, newFilepath);
        return path.basename(newFilepath);
    }
};
