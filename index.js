require('dotenv').config();

const express = require('express'),
	multer = require('multer'),
	storageConfig = multer.diskStorage({
		destination: (req, file, cb) =>{
			cb(null, "uploads");
		},
		filename: (req, file, cb) =>{
			cb(null, file.originalname);
		}
	}),
	upload = multer({storage:storageConfig});
const parseRoute = require('./src/parse-route');
const path = require('path'),
	json = require('express-json');


const app = express();
app.use(json());
app.use('/', express.static(__dirname + '/public'));
app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname+'/public/index.html'));
});
app.post('/upload', upload.single('image'), parseRoute);

app.listen(8089);;
console.log('Server Started on port 8089');


