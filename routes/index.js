var express = require('express');
var router = express.Router();
const Bitrix = require("../utils/bitrix");
const Db = require("../utils/db");

const bitrix = new Bitrix();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
