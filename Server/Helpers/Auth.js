const auth_data = (req, res, next) => {
  let apikey = req.headers["yakihonne-api-key"];

  if (apikey && apikey === process.env.FS_API_KEY) {
    next();
  } else {
    if (!apikey) return res.status(401).send({ message: "Missing API KEY" });
    return res.status(401).send({ message: "Invalid API KEY" });
  }
};

module.exports = {
  auth_data,
};
