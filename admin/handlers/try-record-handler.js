const TryRecord = require('../../models/TryRecord');
const TryRecordService = require('../../src/try-record-service');
const PAGE_SIZE = 10;
const getPages = async () => {
    const rowsCount = await TryRecord.count();
    let pagesCount = parseInt(rowsCount / PAGE_SIZE);
    if (rowsCount % PAGE_SIZE > 0) {
        pagesCount += 1;
    }
    const pages =  [...Array(pagesCount).keys()].map(v => v);
    return pages;
};

const formatTotalRows = (rows) => {
    return rows.toFixed(2);
};
const formatRows = (rows) => {
    const rowsString = JSON.parse(rows);
    if (!rowsString) {
        return '';
    }
    return rowsString.map(row => {
        return '<tr>' +
            '<td>' + row.text + '</td>' +
            '<td>' + row.price + '</td>' +
            '</tr>';
    });
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
module.exports = {
    isNotTotalRows,
    getTotalRows,
    index: async (req, res) => {
        const currentPage =  +(req.query.page || 0);
        const items = await TryRecord.findAll({
            order: [['id', 'DESC']],
            offset: +(currentPage*PAGE_SIZE || 0),
            limit: PAGE_SIZE
        });
        const pages = await getPages();

        res.render('try-records/index.ejs', {
            items,
            pages,
            currentPage,
            getPublicPath: (name) => TryRecordService.getPublicPath(name),
            formatRows,
            isNotTotalRows,
            formatTotalRows: formatTotalRows,
            getTotalRows: getTotalRows
        });
    },
    success: async (req, res) => {
        const itemId = req.body.id;
        const result = req.body.result || 0;
        await TryRecord.update({
            result
        }, {
            where: {
                id: itemId
            },
        });
        return res.redirect('/admin/');
    },
    delete: async (req, res) => {
        const itemId = req.body.id;
        await TryRecord.destroy({
            where: {
                id: itemId
            }
        });
        return res.redirect('/admin/');
    }

};
