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
    console.log('friend connect error = ' + err);
  } else {
    console.log('friend mysql connected!');
  }
});
//checkmate_schema

// 친구 요청 목록 가져오기
router.get('/user/:userEmail/:state',function(req,res){
    // console.log("friend user/:userEmail/:state - 호출");

    var to=req.params.userEmail;
    var state=req.params.state;
    var temp=escape(to); // 유니코드 형태로 인코딩 수행
    // console.log("friend user/:userEmail/:state - to:",to);
    // console.log("friend user/:userEmail/:state - state:",state);
    // console.log("friend user/:userEmail/:state - temp:",temp);


    var query='SELECT * FROM checkmate_schema.profile '+
    'where user_email=any(SELECT sender FROM checkmate_schema.friendlog where receiver=?)'
    var params=[temp];

    connection.query(query,params,function(err,rows,fields){
        if(err){
            console.log("friend user/:userEmail/:state - 데이터 select 오류 : "+err);
            res.status(404);
        }else{
            // console.log("friend user/:userEmail/:state - 데이터 select 성공 ");
            // console.log("friend user/:userEmail/:state - rows.length : "+rows.length);
            var jsonObject=new Array();
            for(i=0;i<rows.length;i++){
                var temp=new Object();
                // temp._id=rows[i]._id;
                temp.userEmail=rows[i].user_email;
                temp.profileImageUrl=rows[i].profile_image_url;
                temp.userNickname=rows[i].Nickname;
                jsonObject.push(temp);
                // console.log("friend user/:userEmail/:state - temp"+"["+i+"] = "+temp);
            }

            res.status(200).json(jsonObject);

        }
    })
});

// 채팅방에 친구 목록 가져오기
router.post('/friend/select',function(req,res,next){

    var userEmail=req.body.userEmail;
    // console.log('/friend/select - userEmail =',userEmail);

    var query='SELECT * FROM checkmate_schema.profile '+
    'WHERE user_email = any(SELECT friend_email FROM checkmate_schema.friend WHERE user_email = ?)';
    var params=[userEmail];

    connection.query(query,params,function(err,rows,fields){
        if(err){
            console.log('/friend/select - 실패'+err);
            throw err;
        }else{
            // console.log('/friend/select - 완료');
            var jsonObject=new Array();
            for(i=0;i<rows.length;i++){
                var temp=new Object();
                temp._id=rows[i]._id;
                temp.userEmail=rows[i].user_email;
                temp.profileImageUrl=rows[i].profile_image_url;
                jsonObject.push(temp);
            }
            // console.log('/friend/select - jsonObject =',jsonObject);
            res.status(200).json(jsonObject);
        }
    });
});

// 유저 프로필 사진 업데이트
router.post('/user/profile/upload',function(req,res,next){
    // console.log('/user/profile/upload - 호출');

    var form=new multiparty.Form();
    var userEmail;

    form.on('field',function(name,value){
        if(name=='userEmail'){
            userEmail=value;
            console.log('/user/profile/upload field- userEmail: ',userEmail);
        }
    });
    form.on('part',function(part){
        console.log('field : '+part);
        // console.log('/user/profile/upload part- part = ',part);
        if(part.filename){
            filename=part.filename;
            //size=part.byteCount;

            console.log('/user/profile/upload part- part.name : '+part.name);
            console.log('/user/profile/upload part- filename : '+filename);
        }else{
            part.resume();
        }

        // var query='UPDATE checkmate_schema.profile SET profile_image_url = ? WHERE user_email = ?';
        // 임시로
        var query = 'insert into checkmate_schema.profile (user_email,profile_image_url) values(?,?)';
        // var params = [part.name, userEmail];
        var params = [userEmail,filename];

        connection.query(query, params, function (err, rows, fields) {
            // 제(정지승) 쪽에서는 mkdirp 가 모듈설치 되어있음에도 에러가 납니다. 버전 1.0.4
            // mkdirp(__dirname + '/../profile', function (err) {
            //     if(err)console.log('already exist dir');
            //     writeStream = fs.createWriteStream(__dirname+'/../profile/'+part.name+'.jpg');
            //     writeStream.filename = filename;
            //     part.pipe(writeStream);
            //     console.log(writeStream);
            // });
            var dirPath = __dirname + "/../save/profile";
            //fsExtra.emptyDirSync(dirPath)
            fs.mkdirSync(dirPath, {
              recursive: true
            });
            writeStream = fs.createWriteStream(dirPath + '/' + filename);
            writeStream.filename = filename;
            part.pipe(writeStream); // 파일 쓰는 부분
        })

         part.on('end',function(){
            console.log("/user/profile/upload end- Part read complete :",filename);
            writeStream.end();
        });
    })

    form.on('close',function(){
        console.log('/user/profile/upload close - 호출');
        res.status(200).send('profile Upload complete');

    });
    form.parse(req);
});

// 친구 수락 OR 거절
router.post('/friend/update',function(req,res,next){
    console.log('/friend/update - 호출');

    var sender=req.body.sender;
    var receiver=req.body.receiver;
    var state=req.body.state;
    console.log('/friend/update - sender :',sender);
    console.log('/friend/update - receiver :',receiver);
    console.log('/friend/update - state :',state);

    var deleteQuery='DELETE FROM checkmate_schema.friendlog where sender = ? and receiver = ?';
    var params=[sender,receiver];
    var params2=[receiver,sender];

    // connection.query(deleteQuery,params,function(err,rows,fields){
    //     if(err){
    //         console.log('/friend/update - 친구거절실패 :'+err);
    //         throw err;
    //     }else{
    //         console.log('/friend/update - 친구거절성공');
    //         res.status(200).send(true); // 이 부분이 겹쳐서 if 로 그냥 분기하자
    //     }
    // });

    if(state==0){
        //친구 요청 거절
        connection.query(deleteQuery,params,function(err,rows,fields){
            if(err){
                console.log('/friend/update - 친구거절실패 :'+err);
                throw err;
            }else{
                console.log('/friend/update - 친구거절성공');
                res.status(200).send(true);
            }
        });
    }else if(state==1){
        //친구 요청 승인

        // 2개를 해야하는구나
        // 이거 압축 가능 근데 이게 더 이해하기 쉽네
        var insertQuery1='INSERT INTO checkmate_schema.friend (user_email,friend_email) VALUES(?,?)';
        var insertQuery2='INSERT INTO checkmate_schema.friend (friend_email,user_email) VALUES(?,?)';

        connection.query(insertQuery1,params,function(err,rows,fields){
            if(err){
                console.log('/friend/update - 친구승인실패 A :'+err);
                throw err;
            }else{
                connection.query(insertQuery2,params2,function(err,rows,fields){
                    if(err){
                        console.log('/friend/update - 친구승인실패 B :'+err);
                        throw err;
                    }else{
                      console.log('/friend/update - 친구승인 성공');

                      // 위에서 해주면 된다. 어차피 state 0,1 모두 해야되는 부분이다.
                      connection.query(deleteQuery,params,function(err,rows,fields){
                        // 친구가 되었다면 `friendlog` 테이블에서 제거한다.
                          if(err){
                              console.log('/friend/update - 친구로그 삭제 실패 C :'+err);
                              throw err;
                          }else{
                              console.log('/friend/update - 친구로그 삭제 성공');
                              res.status(200).send(true);
                          }
                      });

                    }



                });

            }
        });



    }

});








module.exports = router;
