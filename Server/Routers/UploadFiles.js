const express = require("express");
const { auth_data } = require("../Helpers/Auth");
const { uploadFile, deleteFile } = require("../Helpers/FilesUpload");
const router = express.Router();


router.post("/api/v1/file-upload", auth_data, async (req, res) => {
    try {
      let pubkey = req.body.pubkey;
      if (!pubkey) return res.status(401).send({ message: "Missing params" });
      let uploaded_img = await uploadFile(req.files, `${pubkey}`, "files");
      res.send({ image_path: uploaded_img });
    } catch (err) {
      console.log(err);
      res.status(500).send({ message: "Server Error" });
    }
  });
  
  router.delete("/api/v1/file-upload", auth_data, async (req, res) => {
    try {
      let image_path = req.query.image_path;
      console.log(image_path)
      if (!image_path)
        return res.status(401).send({ message: "Image path is empty" });
      let deleted_img = await deleteFile(image_path);
      res.send({ message: "Image was deleted successfully" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ message: "Server Error" });
    }
  });
  

module.exports = router;
