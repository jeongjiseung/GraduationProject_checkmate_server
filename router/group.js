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
    console.log('group connect error = ' + err);
  } else {
    console.log('group mysql connected!');
  }
});

//checkmate_schema

//그룹생성
router.post('/group/create',function(req,res,next){
    var title;
    var description;
    var cover;
    var category;
    var authority;
    var author;
    var groupPassword;
    var form=new multiparty.Form();

    form.on('field',function(name,value){
        console.log('/group/create - field : name =' + name + "  value =" + value);
        if(name=="title"){title=value;}
        if(name=="description"){description=value;}
        if(name=="category"){category=value;}
        if(name=="authority"){authority=value;}
        if(name=="author"){author=value;}
        if(name=="groupPassword"){groupPassword=value;}
        // 이미지를 첨부해야만 db에 저장이 된다.
    });
    form.on('part',function(part){
        console.log('/group/create - part.name :',part.name);
        cover=part.name;

        var query='insert into checkmate_schema.group(title,description,category,authority,cover,author,groupPassword) values(?,?,?,?,?,?,?)';
        var params=[title,description,category,authority,cover,author,groupPassword];
        connection.query(query,params,function(err,rows,fields){
            if(err){throw err;}
            else{
                // mkdirp(__dirname+'/../save/group',function(err){
                //     if (err) {
                //       console.log('/group/create -part: already exist dir');
                //     }
                //     writeStream = fs.createWriteStream(__dirname+'/../save/group/'+part.name+'.jpg');
                //     writeStream.filename = part.name;
                //     part.pipe(writeStream);
                //     console.log('/group/create -part: create dir');
                // });

                var dirPath = __dirname + "/../save/group/";
                //fsExtra.emptyDirSync(dirPath) // 비우기
                fs.mkdirSync(dirPath, {
                  recursive: true
                });
                writeStream = fs.createWriteStream(dirPath + '/' + cover);
                writeStream.filename = cover;
                part.pipe(writeStream); // 파일 쓰는 부분
            }
        });

        part.on('end',function(){
            console.log('/group/create -part end: read complete');
            writeStream.end();
        });
    });
    form.on('close',function(){
        console.log('/group/create -close');
        res.status(200).send(true);
    });
    form.parse(req);
});

//가입하지 않은 모든 그룹 가져오기
router.get('/group/all/:userEmail/:count/:offset',function(req,res,next){
  //console.log("/group/all/:userEmail/:count/:offset - 응답");
    var userEmail=req.params.userEmail;
    var count=req.params.count*1;
    var offset=req.params.offset*1;

    var query='select * from checkmate_schema.group '+
    'where _id not in (select group_id from checkmate_schema.mygroup where userEmail = ?) limit ? offset ?';
    var params=[userEmail,count,offset];
    connection.query(query,params,function(err,rows,fields){
        if(err){
            throw err;
        }

        var jsonObject=new Array();
        for(i=0;i<rows.length;i++){
            jsonObject.push(new Object(rows[i]));
            // console.log("/group/all/:userEmail/:count/:offset - rows["+i+"] = ",rows[i]);
        }
        // console.log("/group/all/:userEmail/:count/:offset - jsonObject = ",jsonObject);
        res.status(200).json(jsonObject);
    });
});

//그룹 가입
router.post('/group/join',function(req,res,next){
    console.log("/group/join - entered");

    var group_id=req.body.group_id;
    var userEmail=req.body.userEmail;
    console.log("/group/join - group_id :",group_id);
    console.log("/group/join - userEmail :",userEmail);

    var query='insert into checkmate_schema.mygroup (group_id,userEmail) values(?,?)';
    var params=[group_id,userEmail];
    connection.query(query,params,function(err,rows,fields){
        if(err){throw err;}
        res.status(200).send(true);
    });
});

//비공개 그룹 비밀번호 확인
router.post('/group/passwordCheck',function(req,res,next){
    var groupID=req.body.groupID;
    var password="\""+req.body.password+"\"";
    var userEmail=req.body.userEmail;
    console.log('/group/passwordCheck - groupID : '+groupID);
    console.log('/group/passwordCheck - password : '+password);
    console.log('/group/passwordCheck - userEmail : '+userEmail);

    var query='select groupPassword from checkmate_schema.group where _id = ?';
    var params=[groupID];

    connection.query(query,params,function(err,rows,fields){
        if(err){throw err;}
        else{

            var jsonObject=new Object();
            //jsonObject.right=true;
            if(rows[0].groupPassword == password){
                console.log('/group/passwordCheck - 패스워드 일치');
                jsonObject.right=true;

                var query='insert into checkmate_schema.mygroup (group_id,userEmail) values(?,?)';
                var params=[groupID,userEmail];

                connection.query(query,params,function(err,rows,fields){
                    if(err){throw err;}
                    var updateQuery='update checkmate_schema.group set member_cnt = member_cnt+1 where _id = ?';
                    var updateParams=[groupID]

                    connection.query(updateQuery,updateParams,function(err,rows,fields){
                    if(err){throw err;}
                        res.status(200).json(jsonObject);
                    });

                });

            }else{
                console.log('존재 x');
                jsonObject.right=false;
                res.status(200).json(jsonObject);
            }
        }
    });
});

//자신이 속한 그룹 가져오기
router.get('/group/my/:userEmail',function(req,res,next){
    // console.log("/group/my/:userEmail - entered");
    var userEmail=req.params.userEmail;
    var query='select * from checkmate_schema.group where _id=any(select group_id from checkmate_schema.mygroup where userEmail=?)'
    var params=[userEmail];

    connection.query(query,params,function(err,rows,fields){
        if(err){throw err;}
        var jsonObject=new Array();
        for(i=0;i<rows.length;i++){
            jsonObject.push(new Object(rows[i]));
        }
        // console.log("/group/my/:userEmail - jsonObject :",jsonObject);
        res.status(200).json(jsonObject);
    });

});

//그룹 탈퇴
router.delete('/group/withdraw/:groupID',function(req,res,next){
    var g_id=req.params.groupID;
    var updateQuery='update checkmate_schema.group set member_cnt = member_cnt-1'+
    ' where _id in (select group_id from checkmate_schema.mygroup where _id = ?)';
    // 1개만 고르면 되는구나,나는 한 계정으로 하니까 남은것들이 있는 것이고
    var updateParams=[g_id]

    console.log("/group/withdraw/:groupID - g_id = ",g_id)


    connection.query(updateQuery,updateParams,function(err,rows,fields){
        if(err){throw err;}
        var query='delete from checkmate_schema.mygroup where _id = ?';
        var params=[g_id];
        connection.query(query,params,function(err,rows,fields){
            if(err){throw err;}
            var jsonObject=new Object();
            jsonObject.right=true;
            res.status(200).json(jsonObject);
        });

    });
});

//그룹의 썸네일 가져오기,yet
router.get('/group/image/cover/:id',function(req,res,next){
    var _id=req.params.id;
    var query='select cover from pjh1352.group where _id= ?';
    var params=[_id];
    connection.query(query,params,function(err,rows,fields){
        if(err)throw err;
        fs.stat(__dirname+'/../save/group/'+rows[0].cover+'.jpg',function(err){
            if(err){
                //throw err;
                console.log(err);
                var readStream=fs.createReadStream(__dirname+'/../save/default/default_img.png');
                readStream.pipe(res);
            }else{
                console.log('사진 선택');
                var readStream=fs.createReadStream(__dirname+'/../save/group/'+rows[0].cover+'.jpg')
                readStream.pipe(res);
            }
        })
    });
});

module.exports = router;
