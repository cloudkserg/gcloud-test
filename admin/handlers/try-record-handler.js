const TryRecord = require('../../models/TryRecord');
const TryRecordService = require('../../src/try-record-service');
const PAGE_SIZE = 10;
const getPages = async () => {
    const totalRows = await TryRecord.count();
    let totalPages = parseInt(totalRows / PAGE_SIZE);
    if (totalRows % PAGE_SIZE > 0) {
        totalPages += 1;
    }
    return [...Array(totalPages).keys()].map(v => v+1);
};
const getTotalRows = (rows) => {
    const rowsString = JSON.parse(rows);
    if (!rowsString) {
        return 0;
    }
    return rowsString.reduce((sum, row) => {
        return sum + parseFloat(row.price);
    }, 0);
};
module.exports = {
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
            formatRows: (rows) => {
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
            },
            isNotTotalRows: (total, rows) => {
              const totalRows  = getTotalRows(rows);
              return totalRows != total;
            },
            formatTotalRows: getTotalRows
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
