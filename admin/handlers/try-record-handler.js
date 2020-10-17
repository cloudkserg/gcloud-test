const TryRecord = require('../../models/TryRecord');
const TryRecordService = require('../../services/try-record-service');
const ProcessService = require('../../services/process-service');
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

const  formatDate = (date) => {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var sec = date.getSeconds();
    minutes = minutes < 10 ? '0'+minutes : minutes;
    sec = sec < 10 ? '0'+sec : sec;
    var strTime = hours + ':' + minutes + ':' + sec;
    return (date.getMonth()+1) + "." + date.getDate() + "." + date.getFullYear() + "  " + strTime;
};



module.exports = {
    index: async (req, res) => {
        const currentPage =  +(req.query.page || 0);
        const filter = req.query;
        const items = await new TryRecordService().getRowsForPage(filter, currentPage, PAGE_SIZE);
        const pages = await getPages();
        const processes = await (new ProcessService).getAllProcesses();

        res.render('try-records/index.ejs', {
            items,
            pages,
            currentPage,
            getPublicPath: (name) => TryRecordService.getPublicPath(name),
            formatRows,
            selectedTypeRecord: req.query.typeRecord || null,
            selectedProcessId: req.query.processId || null,
            typeRecords: TryRecordService.getTypeRecords(),
            processes,
            isNotTotalRows: TryRecordService.isNotTotalRows,
            formatTotalRows,
            formatDate,
            getTotalRows: TryRecordService.getTotalRows
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
