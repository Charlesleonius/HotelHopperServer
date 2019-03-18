const express = require('express');
const router = express.Router();
const fs = require('fs');
const multer = require('multer');
const AWS = require('aws-sdk');

router.use(express.json());

// s3 upload requirements
var storage = multer.memoryStorage()
var upload = multer({ storage: storage });

// s3 instance 
const s3Client = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.REGION
});

/**
 * 
 */
router.get('/', (req, res) => {
    s3Client.listObjects({Bucket : process.env.Bucket}, (err, data) => {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            var cityAndLink = {};
            const dlLink = "https://s3.amazonaws.com/hotel-hopper-bucket1/";
            const contents = data.Contents;
            const length = data.Contents.length;
            for(var i = 0; i < length; i++) {
                var city = contents[i].Key;
                city = city.replace('-', ' ');
                city = city.replace('.png', '');
                city = city.replace(/\b\w/g, l => l.toUpperCase());
                cityAndLink[city] = dlLink + contents[i].Key;
            }
            res.send(cityAndLink);
            return;
        }
    });
});

/**
 * 
 */
router.post('/upload', upload.single('file'), (req, res) => {
    const uploadParams = {
        Bucket: process.env.Bucket,
        Key: req.file.originalname, // pass key
        Body: req.file.buffer // pass file body
    };

    s3Client.upload(uploadParams, (err, data) => {
        if (err) {
            res.status(500).json({ error: "Error -> " + err });
        }
        res.json({ message: 'File uploaded successfully! -> keyname = ' + req.file.originalname });
    });
});

/**
 * 
 */
router.get('/:cityName', (req, res) => {
    const city = req.params.cityName;

    // TODO: validation

    const getParams = {
        Bucket: process.env.Bucket,
        Key: city
    }

    var fileStream = s3Client.getObject(getParams).createReadStream();
    if (fileStream) {
        fileStream.pipe(res);
        return;
    }
});

module.exports = router