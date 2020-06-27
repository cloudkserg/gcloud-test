const StopWord = require('../../models/StopWord');
module.exports = {
    index: async (req, res) => {
        const words = await StopWord.findAll();
        res.render('stop-words/index.ejs', {
            words
        });
    },

    create: async (req, res) => {
        const params = req.body;
        await StopWord.create({
            name: params.name
        });
        return res.redirect('/admin/stop-words');
    },
    delete: async (req, res) => {
        const itemId = req.body.id;
        await StopWord.destroy({
            where: {
                id: itemId
            }
        });
        return res.redirect('/admin/stop-words');
    }

};
