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
    console.log('wordcloud connect error = ' + err);
  } else {
    console.log('wordcloud mysql connected!');
  }
});
//checkmate_schema

router.get('/search_keyword/:keyword', function (req, res, next) {
    var Keyword = req.params.keyword;
    var query = "SELECT _id,user_email,title,response_cnt,time FROM checkmate_schema.survey_storage WHERE title LIKE " +
     connection.escape('%' + req.params.keyword + '%');
     // escape 보안 용
    var params = [Keyword];
    connection.query(query, params, function (err, rows, fields) {
        if (err) {
            console.log("search_keyword keyword -데이터 select 오류");
        } else {
          console.log("search_keyword keyword -데이터 select 성공");

            var jsonObject = new Array();
            for (i = 0; i < rows.length; i++) {
                var temp = new Object();
                temp._id = rows[i]._id;
                temp.title = rows[i].title;
                temp.response_cnt = rows[i].response_cnt;
                temp.time = rows[i].time;

                jsonObject.push(temp);
            }
            console.log("search_keyword keyword - jsonObject :",jsonObject);
            res.status(200).json(jsonObject);
        }

    });
});













module.exports = router;
