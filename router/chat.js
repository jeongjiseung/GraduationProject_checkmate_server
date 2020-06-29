const express = require('express');
const router = express.Router();
const multiparty = require('multiparty');
const fs = require('fs');
const path=require('path');
const fsExtra = require('fs-extra')
const mkdirp=require('mkdirp');

const mysql = require('mysql');
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'noruk0219',
  datebase: 'checkmateJSS',
  charset: 'utf8_bin' // ok
});
connection.connect(function(err) {
  if (err) {
    console.log('chat connect error = ' + err);
  } else {
    console.log('chat mysql connected!');
  }
});
//checkmate_schema




router.get('/chat/rooms/:userEmail',function(req,res,next){
  // console.log('/chat/rooms/:userEmail - called');

    //모든 채팅방 정보 얻기
    var userEmail=req.params.userEmail;

    var query='SELECT * FROM checkmate_schema.roomlist '+
    'WHERE roomkey = any(SELECT roomkey FROM checkmate_schema.roomlist WHERE user_email = ?)';
    // roomkey 는 개설자 이메일
    var params=[userEmail];

    connection.query(query,params,function(err,rows,fields){
        var jsonObject=new Array();
        // console.log('/chat/rooms/:userEmail - rows length :'+rows.length);
        for(i=0;i<rows.length;i++){
            var room=new Object();
            room.roomKey=rows[i].roomkey;
            room.userEmail=rows[i].user_email;
            room.userNickname=rows[i].user_Nickname;
            jsonObject.push(room);
        }
        res.status(200).json(jsonObject);
    });
});

router.post('/chat/create',function(req,res,next){
    console.log('/chat/create - called');

    //각 인원들을 채팅방에 추가하기
    var friendEmails=JSON.parse(req.body.friends);
    var userEmail=req.body.userEmail;
    var roomkey=req.body.pk;
    console.log('/chat/create - friendEmails : '+friendEmails);
    console.log('/chat/create - userEmail : '+userEmail);
    console.log('/chat/create - roomkey : '+roomkey);
    // console.log(friendEmails[0]);

    var query='INSERT INTO checkmate_schema.roomlist (user_email,roomkey) VALUES ?;';
    var items=[];
    items.push([userEmail,roomkey]);

    for(var i=0;i<friendEmails.length;i++){
        items.push([friendEmails[i],roomkey]);
    }

    connection.query(query,[items],function(err,rows,fields){
        if(err){
            console.log('/chat/create - 채팅방 개설 실패 :',err);
            throw err;
        }
        res.status(200).send(true);
    });

});

router.get('/chat/rooms/:roomKey/:count/:offset',function(req,res,next){
    // console.log('/chat/rooms/:roomKey/:count/:offset - called');

    //해당 키에속하는 방의 모든 메세지,혹은 일부 메세지 요청
    var roomkey=req.params.roomKey;
    var count=Number(req.params.count);
    var offset=Number(req.params.offset);
    console.log('/chat/rooms/:roomKey/:count/:offset - roomkey ='+roomkey);
    console.log('/chat/rooms/:roomKey/:count/:offset - count ='+count);
    console.log('/chat/rooms/:roomKey/:count/:offset - offset ='+offset);

    // var query='SELECT * FROM checkmate_schema.chatlog WHERE roomkey = ? order by date ASC LIMIT ? OFFSET ?';
    var query='SELECT * FROM checkmate_schema.chatlog WHERE roomkey = ? LIMIT ? OFFSET ?';
    var params=[roomkey,count,offset];

    connection.query(query,params,function(err,rows,fields){
        if(err){
          console.log('/chat/rooms/:roomKey/:count/:offset - query 오류 = '+err);
            throw err;
        }
        var jsonObject=new Array();
        for(i=0;i<rows.length;i++){
            var msg=new Object();
            msg.roomKey=rows[i].roomkey;
            msg.message=rows[i].message;
            msg.userEmail=rows[i].user_email;
            msg.date=rows[i].date;
            // 또 닉네임..?
            // console.log('/chat/rooms/:roomKey/:count/:offset - Object = '+msg);

            jsonObject.push(msg);
        }
        // console.log('/chat/rooms/:roomKey/:count/:offset - jsonObject = '+jsonObject);
        res.status(200).json(jsonObject);
    });
});










module.exports = router;
