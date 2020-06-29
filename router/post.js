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
    console.log('post connect error = ' + err);
  } else {
    console.log('post mysql connected!');
  }
});

//checkmate_schema

//자신이속한 그룹 게시물 가져오기
router.get('/post/:group_id/:count/:offset',function(req,res,next){
    // console.log("/post/:group_id/:count/:offset - 들어옴");

    var group_id=req.params.group_id*1;
    var count=req.params.count*1;
    var offset=req.params.offset*1;

    var query='select * from checkmate_schema.post  where group_id = ? order by time asc limit ? offset ?'
    var params=[group_id,count,offset];
    connection.query(query,params,function(err,rows,fields){
        if(err){throw err;}
        var jsonObject=new Array();
        for(i=rows.length-1;i>=0;i--){
            jsonObject.push(new Object(rows[i]));
        }
        // console.log("/post/:group_id/:count/:offset - jsonObject :",jsonObject);
        res.status(200).json(jsonObject);
    });
});

//게시글 등록
router.post('/post/create',function(req,res,next){
    // console.log("/post/create - 호출");
    var group_id;
    var content;
    var userEmail;
    var time;
    var Nickname;

    var files = new Array();
    var form=new multiparty.Form();

    form.on('field',function(name,value){
        console.log('/post/create field - '+name+" : "+value);
        if(name=="group_id"){group_id=value;}
        if(name=="content"){content=value.substring(1,value.length-1);}
        if(name=="userEmail"){userEmail=value.substring(1,value.length-1);}
        if(name=="time"){time=value;}
        if(name=="Nickname"){Nickname=value.substring(1,value.length-1);}
    });
    form.on('part',function(part){
        var filename = part.name;
        var writeStream;
        files.push(part.name);
        console.log('/post/create part - filename : '+filename);
        // mkdirp(__dirname+'/../save/post',function(err){
        //     if(err)console.log('already exist dir');
        //     writeStream = fs.createWriteStream(__dirname+'/../save/post/'+part.name);
        //     writeStream.filename = part.name;
        //     part.pipe(writeStream);
        // });

        var dirPath = __dirname + "/../save/post/";
        //fsExtra.emptyDirSync(dirPath);
        fs.mkdirSync(dirPath, {
          recursive: true
        });
        writeStream = fs.createWriteStream(dirPath + '/' + filename);
        writeStream.filename = filename;
        part.pipe(writeStream); // 파일 쓰는 부분

        part.on('end',function(){
            console.log('/post/create part end - Part read complete:',filename);
            writeStream.end();
        });
    });
    form.on('close',function(){
        // console.log('/post/create part close - 호출');

        var query='insert into checkmate_schema.post (group_id,content,userEmail,time,Nickname) values(?,?,?,?,?)';
        var params=[group_id,content,userEmail,time,Nickname];

        connection.query(query,params,function(err,result){
            if(err){throw err;}

            var selectQuery='SELECT * FROM checkmate_schema.post WHERE _id = ?'
            var selectParams=[result.insertId]; // result 에
            // console.log('/post/create part close - result :',result);
            console.log('/post/create part close - selectParams :',selectParams);
            console.log('/post/create part close - files :',files);

            var insertQuery="INSERT INTO checkmate_schema.postimage(post_id,filename) VALUES";
            for(i=0;i<files.length;i++){
                // insertQuery+="INSERT INTO checkmate_schema.postimage(post_id,filename) VALUES("+result.insertId+",'"+files[i]+"');";
                insertQuery+="("+result.insertId+",'"+files[i]+"')";
                if(i == files.length-1){
                  insertQuery+=";";
                }else{
                  insertQuery+=",";
                }
            }
            // console.log('/post/create part close - insertQuery :',insertQuery);

            if(insertQuery==""){ // 파일이 없을 때
              console.log('/post/create part close 1- insertQuery==비었음 ');
              // res.status(200).send('post Upload complete 1');
                connection.query(selectQuery,selectParams,function(err,rows,fields){
                    if(err){
                      console.log('/post/create part close 1- err ####################################');
                      throw err;
                    }
                    res.status(200).json(new Object(rows[0]));
                    console.log('/post/create part close 1- rows[0] :',rows[0]);
                    // console.log('/post/create part close 1- rows :',rows);
                    // console.log('/post/create part close 1- fields :',fields);
                });
            }else{

                // connection.query(insertQuery,function(err,rows,fields){
                //     if(err){throw err;}
                //     connection.query(selectQuery,selectParams,function(err,rows,fields){
                //         if(err){throw err;}
                //         res.status(200).json(new Object(rows[0]));
                //         console.log('/post/create part close 2- rows[0] :',rows[0]);
                //         // console.log('/post/create part close - rows :',rows);
                //         // console.log('/post/create part close - fields :',fields);
                //     });
                // });
                connection.query(insertQuery,function(err,rows,fields){
                  if(err){
                    console.log('/post/create part close 2- err ####################################');
                    throw err;
                  }
                    console.log('/post/create part close 2- rows :',rows);
                    //console.log('/post/create part close 2- rows[0] :',rows[0]); // undefined
                    // res.status(200).send('post Upload complete 2');
                    res.status(200).json(new Object(rows[0]));
                });
            }

        });

    });
    form.parse(req);
});

//댓글 등록
router.post('/post/add_comment', function (req, res, next) {
    // console.log("/post/add_comment - 호출");

    var post_id = req.body.post_id;
    var content = req.body.content;
    var userEmail = req.body.userEmail;
    var time = req.body.time;
    var Nickname = req.body.Nickname;
    // console.log("/post/add_comment - post_id:",post_id);
    // console.log("/post/add_comment - content:",content);
    // console.log("/post/add_comment - userEmail:",userEmail);
    // console.log("/post/add_comment - time:",time);
    // console.log("/post/add_comment - Nickname:",Nickname);

    var query = 'insert into checkmate_schema.comment (post_id,content,userEmail,time,Nickname) values(?,?,?,?,?)';
    var params = [post_id, content, userEmail, time,Nickname];
    connection.query(query, params, function (err, rows, fields) {
        if (err){ throw err;}
        res.status(200).send(true);
    });
});

//대댓글 등록
router.post('/post/add_comment_reply', function (req, res, next) {
    // console.log("/post/add_comment_reply - 호출");
    //var post_id = req.body.post_id;
    var comment_id = req.body.comment_id;
    var content = req.body.content;
    var target_userEmail = req.body.target_userEmail;
    var userEmail = req.body.userEmail;
    var time = req.body.time;
    var target_Nickname = req.body.target_Nickname;
    var Nickname = req.body.Nickname;

    // console.log("/post/add_comment_reply - comment_id:",comment_id);
    // console.log("/post/add_comment_reply - content:",content);
    // console.log("/post/add_comment_reply - target_userEmail:",target_userEmail);
    // console.log("/post/add_comment_reply - userEmail:",userEmail);
    // console.log("/post/add_comment_reply - time:",time);
    // console.log("/post/add_comment_reply - target_Nickname:",target_Nickname);
    // console.log("/post/add_comment_reply - Nickname:",Nickname);

    var query = 'insert into checkmate_schema.comment_reply (comment_id, content, target_userEmail, userEmail,time,target_Nickname,Nickname) values(?,?,?,?,?,?,?)';
    var params = [comment_id, content, target_userEmail, userEmail, time,target_Nickname,Nickname];
    connection.query(query, params, function (err, rows, fields) {
        if (err) {throw err;}
        res.status(200).send(true);
    });
});

//댓글 가져오기
router.get('/post/comment/:post_id/:count/:offset', function (req, res, next) {
    // console.log("/post/comment/:post_id/:count/:offset - 호출");

    var post_id = req.params.post_id * 1;
    var count = req.params.count * 1;
    var offset = req.params.offset * 1;
    // console.log("/post/comment/:post_id/:count/:offset - post_id:",post_id);
    // console.log("/post/comment/:post_id/:count/:offset - count:",count);
    // console.log("/post/comment/:post_id/:count/:offset - offset:",offset);

    var query = 'select * from checkmate_schema.comment where post_id =? limit ? offset ?'
    var params = [post_id, count, offset];

    connection.query(query, params, function (err, rows, fields) {
        if (err) {throw err;}
        var jsonObject = new Array();
        for (i = 0; i < rows.length; i++) {
            jsonObject.push(new Object(rows[i]));
            // console.log("/post/comment/:post_id/:count/:offset - rows["+i+"] :",rows[i]);
        }
        // console.log("/post/comment/:post_id/:count/:offset - jsonObject:",jsonObject);
        res.status(200).json(jsonObject);
    });
});

//대댓글 가져오기
router.get('/post/comment_reply/:comment_id/:count/:offset', function (req, res, next) {
    // console.log("/post/comment_reply/:comment_id/:count/:offset - 호출");

    // var post_id = req.params.post_id * 1;
    var comment_id = req.params.comment_id * 1;
    var count = req.params.count * 1;
    var offset = req.params.offset * 1;
    // console.log("/post/comment_reply/:comment_id/:count/:offset - comment_id :",comment_id);

    var query = 'select * from checkmate_schema.comment_reply where comment_id =? limit ? offset ?'
    var params = [comment_id, count, offset];
    connection.query(query, params, function (err, rows, fields) {
        if (err) {throw err;}
        var jsonObject = new Array();
        for (i = 0; i < rows.length; i++) {
            jsonObject.push(new Object(rows[i]));
            // console.log("/post/comment_reply/:comment_id/:count/:offset - rows["+i+"] =",jsonObject);
        }
        // console.log("/post/comment_reply/:comment_id/:count/:offset - jsonObject :",jsonObject);
        res.status(200).json(jsonObject);
    });
});

//댓글 삭제
router.get('/post/delete_comment/:id', function (req, res, next) {
    var id = req.params.id;
    console.log("/post/delete_comment/:id - id = ",id);
    var query = 'DELETE FROM checkmate_schema.comment WHERE _id=?';
    var params = [id];
    connection.query(query, params, function (err, rows, fields) {
        if (err) {
            console.log("/post/delete_comment/:id - 댓글 Delete 오류");
            res.status(404).send("comment delete error");
        } else {
            console.log("/post/delete_comment/:id - 댓글 Delete 성공");
            res.status(200).send("comment delete success");
        }
    })

    var query2 = 'DELETE FROM checkmate_schema.comment_reply WHERE comment_id=?';
    var params2 = [id];
    connection.query(query2, params2, function (err, rows, fields) {
        if (err) {
            console.log("/post/delete_comment/:id - 대댓글 Delete 오류");
        } else {
            console.log("/post/delete_comment/:id - 대댓글 Delete 성공");
        }
    })

});

//대댓글 삭제
router.get('/post/delete_reply/:id', function (req, res, next) {
    var id = req.params.id;
    console.log("/post/delete_reply/:id - id =",id);
    var query = 'DELETE FROM checkmate_schema.comment_reply WHERE _id=?';
    var params = [id];
    connection.query(query, params, function (err, rows, fields) {
        if (err) {
            console.log("/post/delete_reply/:id - 대댓글 Delete 오류");
            res.status(404).send("comment of comment delete error");
        } else {
            console.log("/post/delete_reply/:id - 대댓글 Delete 성공");
            res.status(200).send("comment of comment delete success");
        }
    })
});

//게시물 삭제
router.delete('/post/delete/:post_id',function(req,res,next){
    // console.log("/post/delete/:post_id - 호출");

    // var post_id=req.params.post_id*1;
    var post_id=req.params.post_id;
    console.log("/post/delete/:post_id - post_id :",post_id);

    var query='DELETE FROM checkmate_schema.post  WHERE _id = ?'
    var params=[post_id];

    connection.query(query,params,function(err,rows,fields){
        if(err){
          console.log("/post/delete/:post_id - err");
          throw err;
        }
        var jsonObject=new Object();
        jsonObject.right=true;
        res.status(200).json(jsonObject);
    });

    // 대댓글 삭제
    var query6 = 'DELETE FROM checkmate_schema.comment_reply'+
    ' WHERE comment_id IN ( select _id from checkmate_schema.comment where post_id =? )';
    var params6 = [post_id];
    connection.query(query6,params6, function (err, rows, fields) {
        if (err) {
            console.log("/post/delete/:post_id - 대댓글 Delete 오류");
            throw err;
        } else {
            console.log("/post/delete/:post_id - 대댓글 Delete 성공");
        }
    })

    // 댓글 삭제 , 대댓글 먼저 지워야 함
    var query2 = 'DELETE FROM checkmate_schema.comment WHERE post_id=?';
    var params2 = [post_id];
    connection.query(query2, params2, function (err, rows, fields) {
        if (err) {
            console.log("/post/delete/:post_id - 댓글 Delete 오류");
            throw err;
        } else {
            console.log("/post/delete/:post_id - 댓글 Delete 성공");
        }
    })


    // postimage 도 제거
    var query4 = 'DELETE FROM checkmate_schema.postimage WHERE post_id=?';
    var params4 = [post_id];
    connection.query(query4, params4, function (err, rows, fields) {
        if (err) {
            console.log("/post/delete/:post_id - 포스트이미지 Delete 오류");
            throw err;
        } else {
            console.log("/post/delete/:post_id - 포스트이미지 Delete 성공");
        }
    })




});

//게시물 수정 , post각각에 있는 이미지 정보
router.get('/post/images/:post_id',function(req,res,next){
    var post_id=req.params.post_id*1;
    // console.log("/post/images/:post_id - post_id = ",post_id);

    var query='select * from checkmate_schema.postImage where post_id=?';
    var params=[post_id];

    connection.query(query,params,function(err,rows,fields){
        if(err) {throw err;}

        var jsonObject=new Array();
        for(i=0;i<rows.length;i++){
            jsonObject.push(new Object(rows[i]));
        }
        // console.log("/post/images/:post_id - jsonObject = ",jsonObject);
        res.status(200).json(jsonObject);
    });
});

//게시물 update
router.put('/post/update',function(req,res,next){
    console.log("/post/update - 호출 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    var post_id;
    var content;
    var deleteList;
    var files=new Array();
    var form=new multiparty.Form();
    // var IsfileSaved = false;

    form.on('field',function(name,value){
        console.log('/post/update field - '+name+" : "+value);
        if(name=="postID"){post_id=value;}
        if(name=="content"){content=value.substring(1,value.length-1);}
        // if(name=="userEmail"){userEmail=value.substring(1,value.length-1);}
        // if(name=="time"){time=value;}
        if(name=="deleteList"){
            deleteList=JSON.parse(value);
            // console.log("/post/update field - JSON : ",JSON.parse(value)[0]);
            // console.log("/post/update field C - deleteList : ",deleteList);

        }
    });
    form.on('part',function(part){
        files.push(part.name);
        // var filename;
        var writeStream;
        console.log("/post/update part - filename : ",part.name);
        // if(part.filename){ // 파일일 경우 실행되는 부분
        //       filename=part.filename; // 확장자포함
        //   }else{ // 파일 아닐경우 처리 넘기기
        //       part.resume();
        //   }

        // mkdirp(__dirname+'/../save/post',function(err){
        //     if(err)console.log('already exist dir');
        //     writeStream = fs.createWriteStream(__dirname+'/../save/post/'+part.name);
        //     writeStream.filename = part.name;
        //     part.pipe(writeStream);
        // });
        var dirPath =__dirname+"/../save/post";
        //fsExtra.emptyDirSync(dirPath) // 기존 이미지 삭제 후 다시 쓰기 , 충돌문제 해결!
        fs.mkdirSync( dirPath, { recursive: true } );
        writeStream = fs.createWriteStream(dirPath+'/'+part.name);
        writeStream.filename = part.name;
        part.pipe(writeStream); // 파일 쓰는 부분

        part.on('end',function(){
            console.log('/post/update Part end - Part read complete, filename = ',part.name);
            writeStream.end();
        });
    });
    form.on('close',function(){
        // console.log('/post/update close - 호출 ############################');
        var query='update checkmate_schema.post set content = ? where _id=?'
        var params=[content,post_id];

        connection.query(query,params,function(err,result){
          // content 만 변경하고
            if(err){
              console.log('/post/update close - 에러A');
              throw err;
            }

            // var deleteQuery="";
            var deleteQuery="delete from checkmate_schema.postImage where _id in (";
            console.log('/post/update close - deleteList.length :',deleteList.length);
            // for(i=0;i<deleteList.length;i++){
            //     console.log('/post/update close - deleteList[',i,'] = ',deleteList[i]);
            //     deleteQuery+='delete from checkmate_schema.postImage where _id ='+deleteList[i]+';';
            // }
            // 해당 이미지만 삭제해야하니까 개별 id가 필요하다.
            for(i=0;i<deleteList.length;i++){
                console.log('/post/update close - deleteList[',i,'] = ',deleteList[i]);
                deleteQuery+=deleteList[i]
                if(i == deleteList.length-1){
                  deleteQuery+=");";
                }else{
                  deleteQuery+=",";
                }
            }

            var selectQuery='select * from checkmate_schema.post where _id = ?'
            var selectParams=[post_id];

            // var insertQuery="";
            console.log('/post/update close - files.length :',files.length);
            // for(i=0;i<files.length;i++){
            //     console.log('/post/update close - files[',i,'] = ',files[i]);
            //     insertQuery+="insert into checkmate_schema.postimage(post_id,filename) values("+post_id+",'"+files[i]+"');";
            // }
            var insertQuery="INSERT INTO checkmate_schema.postimage(post_id,filename) VALUES";
            for(i=0;i<files.length;i++){
                console.log('/post/update close - files[',i,'] = ',files[i]);
                insertQuery+="("+post_id+",'"+files[i]+"')";
                if(i == files.length-1){
                  insertQuery+=";";
                }else{
                  insertQuery+=",";
                }
            }

            if(deleteQuery==""){
                console.log("/post/update close 1 - deleteQuery empty");
                console.log("/post/update close 1 - insertQuery = ",insertQuery);

                 if(files.length!=0){ // 추가된 파일 존재
                   connection.query(insertQuery,function(err,rows,fields){
                     // postimage 테이블에 데이터 추가
                     if(err){
                       console.log('/post/update close 1-1 - 에러B');
                       throw err;
                     }
                        connection.query(selectQuery,selectParams,function(err,rows,fields){
                          if(err){
                            console.log('/post/update close 1-1 - 에러C');
                            throw err;
                          }
                            //console.log('/post/update close 1-1 - rows :',rows); // '[',']' 가 포함되어진다.
                            console.log('/post/update close 1-1 - rows[0] :',rows[0]);
                            res.status(200).json(new Object(rows[0]));
                       });
                    });
                 }else{ // 결과 리턴만 한다. 삭제X , 추가 X
                     connection.query(selectQuery,selectParams,function(err,rows,fields){
                       if(err){
                         console.log('/post/update close 1-2 - 에러H');
                         throw err;
                       }
                         // console.log('/post/update close 1-2 - rows :',rows);
                         console.log('/post/update close 1-2 - rows[0] :',rows[0]);
                         res.status(200).json(new Object(rows[0]));
                     });
                 }

            }else{ // 삭제할 Query 존재
                console.log("/post/update close 2 - deleteQuery = ",deleteQuery);
                console.log("/post/update close 2 - insertQuery = ",insertQuery);

                connection.query(deleteQuery,function(err,rows,fields){
                  // postimage 테이블에 데이터 삭제
                  if(err){
                    console.log('/post/update close 2 - 에러D');
                    throw err;
                  }

                    if(files.length!=0){ // 추가된 파일 존재

                        connection.query(insertQuery,function(err,rows,fields){
                        // postimage 테이블에 데이터 삭제 후 삽입
                          if(err){
                            console.log('/post/update close 2-1 - 에러E');
                            throw err;
                          }
                            connection.query(selectQuery,selectParams,function(err,rows,fields){
                                // 안드로이드에 결과 리턴
                              if(err){
                                console.log('/post/update close 2-1 - 에러F');
                                throw err;
                              }
                                // console.log('/post/update close 2-1 - rows :',rows);
                                console.log('/post/update close 2-1 - rows[0] :',rows[0]);
                                res.status(200).json(new Object(rows[0]));
                            });
                        });
                    }else{
                        connection.query(selectQuery,selectParams,function(err,rows,fields){
                          //postimage 테이블에 데이터 삭제 후  안드로이드에 결과 리턴
                          if(err){
                            console.log('/post/update close 2-2 - 에러G');
                            throw err;
                          }
                            // console.log('/post/update close 2-2 - rows :',rows);
                            console.log('/post/update close 2-2 - rows[0] :',rows[0]);
                            res.status(200).json(new Object(rows[0]));
                        });
                    }

                });
            }

        });

    });
    form.parse(req);
});

module.exports = router;
