const express = require('express');
const router = express.Router();
const multiparty = require('multiparty');
const fs = require('fs');
const path=require('path');
const mysql = require('mysql');
const fsExtra = require('fs-extra')

var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'noruk0219',
  datebase: 'checkmateJSS',
  charset: 'utf8_bin' // ok
});
connection.connect(function(err) {
  if (err) {
    console.log('widget connect error = ' + err);
  } else {
    console.log('widget mysql connected!');
  }
});
//checkmate_schema

router.get('/search_id/:id', function (req, res, next) {
  console.log("/search_id/:id - 호출");
    var Keyword = req.params.id;

    var query = "SELECT _id,title,response_cnt,time FROM checkmate_schema.survey_storage WHERE _id=?"
    var params = [Keyword];
    connection.query(query, params, function (err, rows, fields) {
        if (err) {
            console.log("/search_id/:id - 오류: "+err);
        } else {
            var jsonObject = new Array();
            for (i = 0; i < rows.length; i++) {
                var temp = new Object();
                temp._id = rows[i]._id;
                temp.title = rows[i].title;
                temp.response_cnt = rows[i].response_cnt;
                temp.time = rows[i].time;

                jsonObject.push(temp);
            }
            // console.log(jsonObject[0]);
            console.log("/search_id/:id - jsonObject: "+jsonObject);
            res.status(200).json(jsonObject);
        }

    });
});













module.exports = router;
