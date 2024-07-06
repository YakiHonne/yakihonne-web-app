const express = require("express");
const app = express();
const path = require("path");
const NIP05 = require("./Routers/NIP05")
const UploadFiles = require("./Routers/UploadFiles")
const fileupload = require('express-fileupload')

const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(fileupload())

app.use("/", UploadFiles)
app.use("/", NIP05)

// app.use(express.static("build"));
// app.get("*", (req, res) => {
//   res.sendFile(path.resolve(__dirname, "build", "index.html"));
// });
app.use(
  require("prerender-node").set("prerenderToken", "6pWKlK16TlpJIRtzeTjo")
);
app.listen(PORT);
