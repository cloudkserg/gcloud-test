const routes = require('express').Router();
const wrap = require("express-async-route");

const totalWordHandler = require('./handlers/total-word-handler');

routes.get('/total-words', wrap(totalWordHandler.index));
routes.post('/total-words', wrap(totalWordHandler.create));
routes.post('/total-words/delete', wrap(totalWordHandler.delete));

const stopWordHandler = require('./handlers/stop-word-handler');

routes.get('/stop-words', wrap(stopWordHandler.index));
routes.post('/stop-words', wrap(stopWordHandler.create));
routes.post('/stop-words/delete', wrap(stopWordHandler.delete));

const tryRecordHandler = require('./handlers/try-record-handler');
routes.get('/', tryRecordHandler.index);
routes.post('/try-records/delete', tryRecordHandler.delete);
routes.post('/try-records/success', tryRecordHandler.success);

module.exports = routes;
