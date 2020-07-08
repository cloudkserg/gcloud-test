const TryRecord = require('../../models/TryRecord');
const TryRecordService = require('../../src/try-record-service');
module.exports = {
    index: async (req, res) => {
        const items = await TryRecord.findAll({
            order: [['id', 'DESC']],
            limit: 50
        });
        res.render('try-records/index.ejs', {
            items,
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
            formatTotalRows: (rows) => {
                const rowsString = JSON.parse(rows);
                if (!rowsString) {
                    return 0;
                }
                return rowsString.reduce((sum, price) => {
                    return sum + parseFloat(row.price);
                }, 0);
            }
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
