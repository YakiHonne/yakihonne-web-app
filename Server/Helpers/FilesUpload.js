const AWS = require("aws-sdk");
const dotenv = require("dotenv");

dotenv.config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

const uploadFile = async (file, dir, subdir) => {
  try {
    console.log(dir, subdir);
    let fileName = `${new Date().getTime()}-YAKIHONNES3.${
      file.file.name.split(".")[file.file.name.split(".").length - 1]
    }`;
    let fullFileName = `${dir}/${subdir}/${fileName}`;
    let uploadedFile = await s3
      .putObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fullFileName,
        Body: Buffer.from(file.file.data, "binary"),
      })
      .promise();
    return `https://${process.env.AWS_BUCKET_NAME}.s3.ap-east-1.amazonaws.com/${fullFileName}`;
  } catch (err) {
    console.log(err);
    return false;
  }
};
const deleteFile = async (path) => {
  try {
    let deletedImage = await s3
      .deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: path.split("amazonaws.com/")[1],
      })
      .promise();
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

module.exports = { uploadFile, deleteFile };
