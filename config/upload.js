const aws = require('aws-sdk');
const multerS3 = require('multer-s3-transform');
const multer = require('multer');
const util = require('util');
const sharp = require('sharp');

const imageWidth = 300;

aws.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.REGION 
});

const s3 = new aws.S3();

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
}

let uploadConfig = {
    upload: multer({
        storage: multerS3({
            s3,
            bucket: 'scrum-cademint-storage',
            acl: 'public-read',
            shouldTransform: function (req, file, cb) {
                cb(null, /^image/i.test(file.mimetype))
            },
            transforms: [{
                id: 'original',
                key(req, file, cb) {
                    let fileName = new Date().toISOString() + file.originalname;
                    console.log(fileName.replace(":", "_").replace(":", "_").replace(" ", "_"))
                    cb(null, fileName.replace(":", "_").replace(":", "_").replace(" ", "_"));
                },
                transform: function (req, file, cb) {
                    cb(null, sharp().resize(imageWidth).jpeg());
                }
            }],
        }),
        limits: {
            fileSize: 1024 * 1024 * 2
        },
        fileFilter: fileFilter
    }),
    deleteFromS3: async function (attachmentId) {
        return s3.deleteObject({ Bucket: "scrum-cademint-storage", Key: attachmentId }).promise();
    }
}

module.exports = uploadConfig;



