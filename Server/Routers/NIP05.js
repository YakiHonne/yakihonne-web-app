const express = require("express");
const router = express.Router();
const fs = require("fs");

router.get("/.well-known/nostr.json", (req, res) => {
  try {
    const raw_data = fs.readFileSync("./.well-known/nostr.json");
    const names = JSON.parse(raw_data).names;
    let name = req.query.name;

    let is_name = { names: { [name]: names[name] } };

    res.send(is_name);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server error" });
  }
});

router.post("/.well-known/nostr.json", (req, res) => {
  try {
    
console.log(req.baseUrl)
    res.send({});
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server error" });
  }
});


module.exports = router;
