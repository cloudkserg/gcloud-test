const TotalWord = require('../../models/TotalWord');
module.exports = {
    index: async (req, res) => {
        const words = await TotalWord.findAll();
        res.render('total-words/index.ejs', {
            words
        });
    },

    create: async (req, res) => {
        const params = req.body;
        await TotalWord.create({
            name: params.name
        });
        return res.redirect('/admin/total-words');
    },
    delete: async (req, res) => {
        const itemId = req.body.id;
        await TotalWord.destroy({
            where: {
                id: itemId
            }
        });
        return res.redirect('/admin/total-words');
    }

};
