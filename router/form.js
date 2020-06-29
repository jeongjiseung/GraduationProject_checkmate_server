const express = require('express');
const router = express.Router();
const multiparty = require('multiparty');
const fs = require('fs');
const mkdirp=require('mkdirp');
const path=require('path');
const fsExtra = require('fs-extra')

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
    console.log('form mysql connect error = ' + err);
  } else {
    console.log('form mysql connected!');
  }
});

//checkmate_schema


// 처음 설문화면 로딩
router.post('/user/forms', function(req, res, next) {
  var userEmail;
  var form = new multiparty.Form();
  form.parse(req);
  form.on('field', function(name, value) {
    //console.log('/user/forms form.on(field) 들어옴');
    if (name == 'userEmail') {
      userEmail = value; // 이메일로 db를 불러온다
      // console.log("value = ",value); // userEmail
    }
  });
  form.on('close', function() {
    var query = 'SELECT _id,title,json,response_cnt,time FROM checkmate_schema.survey_storage WHERE user_email=?';
    var params = [userEmail];
    connection.query(query, params, function(err, rows, fields) {
      if (err) {
        console.log("/user/forms form.on('close') 오류 ", err);
      } else {
        // console.log("/user/forms form.on('close') 성공");
        var jsonObject = new Array();

        for (i = 0; i < rows.length; i++) {
          // 와씨 쩌는스킬이야
          var temp = new Object();
          temp._id = rows[i]._id;
          temp.title = rows[i].title;
          //temp.json = JSON.parse(rows[i].json); // string -> jsonObject , 근데 필요없네
          temp.response_cnt = rows[i].response_cnt; // 응답횟수
          temp.time = rows[i].time;

          jsonObject.push(temp);
        }
        // console.log("/user/forms form.on('close') 성공 - jsonObject = ",jsonObject);
        res.status(200).json(jsonObject); // must send, 항상 string 이 전해져? null 없고?
      }

    });
  });

});

router.post('/save', function(req, res, next) {
  var form = new multiparty.Form();
  var form_id;
  var userEmail;
  // var json;
  var json2;
  var title;
  var description;
  var time;

  form.on('field', function(name, value) {
    // console.log(`came field name = ${name} `);
    //console.log("router.post save field - value  = ", value);
    // console.log("router.post save field - value type = ",typeof value);
    if (name == 'json') {
      var jsonObject = JSON.parse(value);
      userEmail = jsonObject.userEmail;
      title = jsonObject.title;
      description = jsonObject.description;
      //json=value; // form item 들이들어가야해 , 중복싫어
      //json = jsonObject.formComponents; // JSONARRAY 이다
      json2 = JSON.stringify(jsonObject.formComponents);
      time = jsonObject.time;
      // console.log("router.post save field - jsonObject  = ", jsonObject);
      // console.log("router.post save field - userEmail  = ", userEmail);
      // console.log("router.post save field - title  = ", title);
      // console.log("router.post save field - description  = ", description);

      // console.log("router.post save field - json  = ", json);
      // console.log("router.post save field - json type = ", typeof json); // object
      // console.log("router.post save field - json2  = ", json2);
      // console.log("router.post save field - json2 type = ", typeof json2); // string


      var params = [userEmail, title, description, json2, time];
      // table 적어야 하나보지
      // .user는 디비 ,
      // ? 는 params 로 순서에 맞게 치환된다.
      var query = 'INSERT INTO checkmate_schema.survey_storage (user_email,title,description,json,time) VALUES(?,?,?,?,?)';
      connection.query(query, params, function(err, rows, fields) {
        if (err) {
          console.log('router.post save field 저장실패 >> ' + err);
        } else {
          //console.log('router.post save field 저장완료 params >>' + params);
          // console.log('router.post save field 저장완료 rows >>'+rows);
          //console.log('저장완료 fields >>'+fields); //  fields is undefined
        }
      });
    }
  });
  form.on('part',function(part){
      var filename;
      // var size;
      var writeStream;
      if(part.filename){ // 파일일 경우 실행되는 부분
          filename=part.filename; // 확장자 포함
          // size=part.byteCount;
          // console.log('router.post save part - part.headers = '+part.headers);
          // console.log('router.post save part - part.name = '+part.name);
          console.log('router.post save part - part.filename = '+part.filename);
          // console.log('router.post save part - part.byteCount = '+part.byteCount);
      }else{ // 파일 아닐경우 처리 넘기기
          part.resume();
      }

      var splitArray = filename.split('.');  // 확장자 제거
      //console.log("router.post save part - splitArray = ",splitArray);

      // var dirPath =__dirname+"/../save/images/"+splitArray[0];
      // const isExists = fs.existsSync( dirPath );
      // //console.log('router.post save part - isExists = ',isExists);
      // if( !isExists ) { // dir if not exist
      //     fs.mkdirSync( dirPath, { recursive: true } );
      //     writeStream = fs.createWriteStream(dirPath+'/'+filename);
      //     writeStream.filename = filename;
      //     part.pipe(writeStream); // 파일 쓰는 부분
      //     console.log('router.post save part - create jsmkdir');
      // }else{
      //   console.log('router.post save part - already exist');
      // }

      var query='SELECT _id,user_email FROM checkmate_schema.survey_storage ORDER BY _id DESC LIMIT 1';
      connection.query(query,function(err,rows,fields){
          form_id=rows[0]._id;
          userEmail=rows[0].user_email; // field 다음에 실행되는 부분이 아니라서 undefined 나온다.
          console.log('router.post save part query- form_id = ',form_id);
          console.log('router.post save part query- userEmail = ',userEmail);
          // 파일명으로 폴더를 하나만들어서 수정시 사진업로드를 허용하였다.
          var dirPath =__dirname+"/../save/images/"+userEmail+'/'+form_id+'/'+splitArray[0];
          fsExtra.emptyDirSync(dirPath) // work ! , 기존 이미지 삭제 후 다시 쓰기 , 충돌문제 해결!
          // const isExists = fs.existsSync( dirPath ); // if exist return true
          // if( !isExists ) { // dir if not exist
          //     fs.mkdirSync( dirPath, { recursive: true } );
          //     writeStream = fs.createWriteStream(dirPath+'/'+filename);
          //     writeStream.filename = filename;
          //     part.pipe(writeStream); // 파일 쓰는 부분
          //     console.log('router.post save part - create dir');
          // }else{
          //   console.log('router.post save part - already exist');
          // }
          fs.mkdirSync( dirPath, { recursive: true } );
                      writeStream = fs.createWriteStream(dirPath+'/'+filename);
                      writeStream.filename = filename;
                      part.pipe(writeStream); // 파일 쓰는 부분

      })


       part.on('end',function(){
          console.log('router.post save part end - Part read complete, filename = ',filename);
          writeStream.end();
      });
  })
  form.on('close', function() {
    res.status(200).send('post save success');
    //console.log("pass here? form.on('close')"); // always pass
  });
  form.parse(req); // here
});

// 웹주소로 들어가는 곳
router.get('/save/images/:user_email/:form_id/:image_name/:imgfile',function(req,res,next)
// router.get('/save/:para',function(req,res,next)
{
    console.log("웹주소로 들어가는 곳 - req.params = ",req.params);
    var user_email=req.params.user_email; //아 주소에 있는 것이 params 이구나
    var form_id=req.params.form_id;
    var image_name=req.params.image_name;
    var imgfile=req.params.imgfile;
    var dirpath = __dirname+'/../save/images/'+user_email+'/'+form_id+'/'+image_name;
    var readStream=fs.createReadStream(dirpath+'/'+imgfile);

    //var readStream=fs.createReadStream(__dirname+'/../save/변변친친.PNG');
    readStream.pipe(res);

    //console.log('절대경로 : '+__dirname); // router
})

router.get('/load/:form_id', function(req, res, next) {
  var form_id = req.params.form_id; // id는 유니크로 설정해야하나?
  // console.log(`/load/:form_id - form_id = ${form_id}`);
  // id is unique , 즉 1개만 가져옴
  var query = 'SELECT * FROM checkmate_schema.survey_storage WHERE _id=?';
  var params = [form_id];
  //console.log(`/load/:form_id - params = ${params}`);

  connection.query(query, params, function(err, rows, fields) {
    if (err) {
      console.log("/load/:form_id - 오류");
      res.status(404).send("load error"); // 아하
    } else {
      // console.log("/load/:form_id - 성공 rows = ",rows);
      //console.log("/load/:form_id - rows.length = ",rows.length); // 1임
      //console.log("/load/:form_id - rows[0] = ", rows[0]); // rows vs rows[0] [],{} 차이구나

      //console.log("/load/:form_id - rows[1] = ",rows[1]); // undefined , 1이상부터는
      //console.log("/load/:form_id - rows[2] = ",rows[2]); // undefined 네

      //res.status(200).json(JSON.parse(rows[0])); // 이중파서라는군
      // res.status(200).json(rows);
      res.status(200).json(rows[0]);

    }
  })
})

router.get('/survey/:form_id', function(req, res){
  // console.log("router.get(/survey/:form_id - req.params = ",req.params);
  var form_id = req.params.form_id;
  //var page = req.params.page;
  //console.log(typeof form_id); // string

  var userEmail;
  var title;
  var description;
  var json;
  var query = 'SELECT * FROM checkmate_schema.survey_storage WHERE _id=?';
  var params = [form_id];
  connection.query(query, params, function(err, rows, fields) {
    if (err) {
      console.log("router.get(/survey/:form_id - 데이터 select 오류");
      res.status(404);
    } else {
      //console.log("router.get(/survey/:form_id - 데이터 select 성공");
      //console.log("router.get(/survey/:form_id - rows = ",rows);

      userEmail = rows[0].user_email;
      title = rows[0].title; //rows[0].title
      description = rows[0].description;
      json = rows[0].json;

      // HTML 로 보이기
      res.render('main', {
        form_id: form_id,
        user_email: userEmail,
        title: title,
        description: description,
        json: json,
        befoP:"befoBtnOnFunc()",
        nextP:"nextBtnOnFunc()",
      });

      // res.render('main - section error fix_video stop fix', {
      //   form_id: form_id,
      //   user_email: userEmail,
      //   title: title,
      //   description: description,
      //   json: json,
      //   befoP:"befoBtnOnFunc()",
      //   nextP:"nextBtnOnFunc()",
      // });
    }
  });





});

router.post('/update',function(req,res,next){
    var form = new multiparty.Form();
    var form_id;
    var userEmail;
    var title;
    var description;
    var json;

    var IsfileSaved = false;

    form.on('field',function(name,value){

        if(name=='json'){
            var jsonObject = JSON.parse(value);
            title = jsonObject.title;
            description = jsonObject.description;
            json = JSON.stringify(jsonObject.formComponents);
            userEmail = jsonObject.userEmail;

            // console.log('router.post update field - title = ' + title);
            // console.log('router.post update field - description = ' + description);
            // console.log('router.post update field - json = ' + json);
            // console.log('router.post update field - userEmail = ' + userEmail);
        }
        if(name=='form_id'){
            form_id=value;
            // console.log('router.post update field - form_id = ' +form_id);

// 이전 결과들 삭제 , 결과쪽 혼선방지
            var query='DELETE FROM checkmate_schema.result WHERE form_id=?';
            var params = [form_id];
            connection.query(query, params, function(err, rows, fields) {
              if (err) {
                console.log("router.post update field - 데이터 Delete 오류");
                // res.status(404).send("delete error");
              } else {
                // console.log("router.post update field - 데이터 Delete 성공");
                // res.status(200).send("delete success");
              }
            })
        }
    });

    form.on('part',function(part){
        console.log('router.post update part - 호출');
// 개수별 실행
        var filename;
        // var size;
        var writeStream;
        if(part.filename){ // 파일일 경우 실행되는 부분
            filename=part.filename; // 확장자포함
            // size=part.byteCount;
            // console.log('router.post update part - part.headers = '+part.headers);
            // console.log('router.post update part - part.name = '+part.name);
            // console.log('router.post update part - part.filename = '+part.filename);
            // console.log('router.post update part - part.byteCount = '+part.byteCount);
        }else{ // 파일 아닐경우 처리 넘기기
            part.resume();
        }

      var splitArray = filename.split('.');
      // console.log("router.post update part - splitArray = ",splitArray);

      var query='SELECT _id,user_email FROM checkmate_schema.survey_storage ORDER BY _id DESC LIMIT 1';
      connection.query(query,function(err,rows,fields){
          form_id=rows[0]._id;
          userEmail=rows[0].user_email;
          // console.log('router.post update part query - form_id = ',form_id);
          // console.log('router.post update part query - userEmail = ',userEmail);

          var dirPath =__dirname+"/../save/images/"+userEmail+'/'+form_id+'/'+splitArray[0];
          fsExtra.emptyDirSync(dirPath) // 기존 이미지 삭제 후 다시 쓰기 , 충돌문제 해결!

          fs.mkdirSync( dirPath, { recursive: true } );
          writeStream = fs.createWriteStream(dirPath+'/'+filename);
          writeStream.filename = filename;
          part.pipe(writeStream); // 파일 쓰는 부분
          // console.log('router.post update part query - always create =========================================');

      })


       part.on('end',function(){
         // 개수별 실행이면 위에서 닫아도 되는가?

          console.log('router.post update part end !!! - Part read complete, filename = ',filename);

          writeStream.end();
          // console.log('router.post update part end !!! - Part read complete, writeStream = ',writeStream);
          IsfileSaved = true;
          // console.log('router.post update part end !!! - IsfileSaved = ',IsfileSaved);
      });
    })

    form.on('close',function(){
        var params=[title,description,json,form_id];
        var query='UPDATE checkmate_schema.survey_storage SET title=?,description=?,json=? WHERE _id=?';
        connection.query(query,params,function(err,rows,fields){
            if(err){
                console.log('router.post update close- DB update 오류');
                res.status(404).send("update error");
            }else{
                // console.log('router.post update close- DB update 성공');
                res.status(200).send("update success");
            }
        })

        // console.log('router.post update close - form_id = ',form_id);
        // console.log('router.post update close - userEmail = ',userEmail);
        // console.log('router.post update close - IsfileSaved = ',IsfileSaved);
        if(IsfileSaved === false){
          // 이미지 없이 업데이트된 경우, 기존 이미지들 제거
          var dirPath =__dirname+"/../save/images/"+userEmail+'/'+form_id;
          fsExtra.emptyDirSync(dirPath); // 이미지 서버에 쌓이는거 방지
        }
    });
    form.parse(req);
});

router.get('/deleteform/:form_id/:user_email', function(req, res, next) {
  var form_id = req.params.form_id;
  var userEmail = req.params.user_email;
  console.log("router.get(/deleteform/:form_id - form_id = ",form_id);
  console.log("router.get(/deleteform/:form_id - userEmail = ",userEmail);

  var query = 'DELETE FROM checkmate_schema.survey_storage WHERE _id=?';
  var params = [form_id];
  connection.query(query, params, function(err, rows, fields) {
    if (err) {
      console.log("router.get(/deleteform/:form_id - 서베이 Delete 오류");
      // res.status(404).send("delete error");
    } else {
      console.log("router.get(/deleteform/:form_id - 서베이 Delete 성공");
      // res.status(200).send("delete success");
    }
  });

  // 설문 삭제 했다면 , 결과쪽도 삭제하자
              var query2='DELETE FROM checkmate_schema.result WHERE form_id=?';
              var params2 = [form_id];
              connection.query(query2, params2, function(err, rows, fields) {
                if (err) {
                  console.log("router.get(/deleteform/:form_id - 결과 Delete 오류");
                  res.status(404).send("delete error");
                } else {
                  console.log("router.get(/deleteform/:form_id - 결과 Delete 성공");
                  res.status(200).send("delete success");
                }
              });

              var dirPath =__dirname+"/../save/images/"+userEmail+'/'+form_id;
              fsExtra.emptyDirSync(dirPath); // 삭제했다면 이미지도 제거하자


});

router.post('/draftsave', function(req, res, next) {
  // console.log('router.post(/draftsave - __dirname = ' + __dirname);
  // console.log('router.post(/draftsave - __filename = ' + __filename);
  var form = new multiparty.Form();
  var userEmail;
  var json;
  var title;
  var description;
  var time;
  var form_id;
  form.parse(req);
  form.on('field', function(name, value) {
    // console.log(`came field name = ${name} `);
    // console.log("router.post draftsave field - value  = ", value);
    // console.log("router.post save field - value type = ",typeof value);
    if (name == 'json') {
      var jsonObject = JSON.parse(value);
      userEmail = jsonObject.userEmail;
      title = jsonObject.title;
      description = jsonObject.description;
      json = JSON.stringify(jsonObject.formComponents);
      time = jsonObject.time;
      // console.log("router.post draftsave field - jsonObject  = ", jsonObject);

      // console.log("router.post save field - json type = ", typeof json); // object
      // console.log("router.post save field - json2 type = ", typeof json2); // string


      var params = [userEmail, title, description, json, time];
      // table 적어야 하나보지
      // .user는 디비 ,
      // ? 는 params 로 순서에 맞게 치환된다.
      var query = 'INSERT INTO checkmate_schema.draft_storage (user_email,title,description,json,time) VALUES(?,?,?,?,?)';
      connection.query(query, params, function(err, rows, fields) {
        if (err) {
          console.log('router.post draftsave field -저장실패 >> ' + err);
        } else {
          console.log('router.post draftsave field -저장완료');
        }
      });


    }
  });
  form.on('close', function() {
    res.status(200).send('post draftsave success');
    //console.log("pass here? form.on('close')"); // always pass
  });
});
router.post('/user/draftForms', function(req, res, next) {
  var userEmail;
  var form = new multiparty.Form();
  form.parse(req);
  form.on('field', function(name, value) {
    //console.log('/user/draftForms form.on(field) 들어옴');
    if (name == 'userEmail') {
      userEmail = value; // 이메일로 db를 불러온다
      // console.log("value = ",value); // userEmail
    }
  });
  form.on('close', function() {
    var query = 'SELECT _id,title,json,time FROM checkmate_schema.draft_storage WHERE user_email=?';
    var params = [userEmail];
    connection.query(query, params, function(err, rows, fields) {
      if (err) {
        console.log("/user/draftForms form.on('close') 오류 ", err);
      } else {
        // console.log("/user/draftForms form.on('close') 성공");
        var jsonObject = new Array();

        for (i = 0; i < rows.length; i++) {
          // 와씨 쩌는스킬이야
          var temp = new Object();
          temp._id = rows[i]._id;
          temp.title = rows[i].title;
          //temp.json = JSON.parse(rows[i].json); // string -> jsonObject , no need
          temp.time = rows[i].time;

          jsonObject.push(temp);
        }
        // console.log("/user/draftForms form.on('close') 성공 - jsonObject = ",jsonObject);
        res.status(200).json(jsonObject); // must send, 항상 string 이 전해져? null 없고?
      }

    });
  });

});
router.get('/deleteDraftForms/:form_id', function(req, res, next) {
  var form_id = req.params.form_id;
  console.log("router.get(/deleteDraftForms/:form_id - form_id = ",form_id);
  var query = 'DELETE FROM checkmate_schema.draft_storage WHERE _id=?';
  var params = [form_id];
  connection.query(query, params, function(err, rows, fields) {
    if (err) {
      console.log("router.get(/deleteDraftForms/:form_id - 데이터 Delete 오류");
      res.status(404).send("delete error");
    } else {
      console.log("router.get(/deleteDraftForms/:form_id - 데이터 Delete 성공");
      res.status(200).send("success");
    }
  })
});
router.get('/Draftform/:user_email', function(req, res, next) { // 더보기메뉴
  var userEmail = req.params.user_email;
  var query = 'SELECT _id,title,time FROM checkmate_schema.draft_storage WHERE user_email=?';
  var params = [userEmail];
  connection.query(query, params, function(err, rows, fields) {
    if (err) {
      console.log("/Draftform/:user_email 오류 ", err);
    } else {
      console.log("/Draftform/:user_email 성공");
      var jsonObject = new Array();
      for (i = 0; i < rows.length; i++) {
        var temp = new Object();
        temp._id = rows[i]._id;
        temp.title = rows[i].title;
        temp.time = rows[i].time;

        jsonObject.push(temp);
      }
      // console.log("/Draftform/:user_email jsonObject = ", jsonObject);
      res.status(200).json(jsonObject);
    }

  });
});
router.get('/draftload/:form_id', function(req, res, next) {
  var form_id = req.params.form_id; // id는 유니크로 설정해야하나?
  // console.log(`/load/:form_id - form_id = ${form_id}`);
  // id is unique , 즉 1개만 가져옴
  var query = 'SELECT * FROM checkmate_schema.draft_storage WHERE _id=?';
  var params = [form_id];

  connection.query(query, params, function(err, rows, fields) {
    if (err) {
      console.log("/draftload/:form_id - 오류");
      res.status(404).send("draftload error"); // 아하
    } else {
      // console.log("/load/:form_id - 성공 rows = ",rows);
      //console.log("/load/:form_id - rows.length = ",rows.length); // 1임
      console.log("/draftload/:form_id - rows[0] = ", rows[0]); // 그냥 rows와 같고

      //console.log("/load/:form_id - rows[1] = ",rows[1]); // undefined , 1이상부터는
      //console.log("/load/:form_id - rows[2] = ",rows[2]); // undefined 네

      //res.status(200).json(JSON.parse(rows[0])); // 이중파서라는데 ?
      // res.status(200).json(rows); // work ?
      res.status(200).json(rows[0]); // work ?
    }
  })
})
router.post('/draftupdate',function(req,res,next){
    var form = new multiparty.Form();
    var form_id;
    var title;
    var description;
    var json;
    form.parse(req);
    form.on('field',function(name,value){
        if(name=='json'){
            var jsonObject = JSON.parse(value);
            title = jsonObject.title;
            description = jsonObject.description;
            json = JSON.stringify(jsonObject.formComponents);

            console.log('router.post draftupdate field - jsonObject = ' + jsonObject);
            console.log('router.post draftupdate field - json = ' + json);
        }
        if(name=='form_id'){
            form_id=value;
            console.log('router.post draftupdate field - form_id = ' +form_id);
        }
    });
    form.on('close',function(){
        console.log('router.post draftupdate close - 들어옴');
        var params=[title,description,json,form_id];

        var query='UPDATE checkmate_schema.draft_storage SET title=?,description=?,json=? WHERE _id=?';
        connection.query(query,params,function(err,rows,fields){
            if(err){
                console.log('router.post draftupdate close- draftupdate 오류');
                res.status(404).send("draftupdate error");
            }else{
                console.log('router.post draftupdate close- draftupdate 성공');
                res.status(200).send("draftupdate success");
            }
        })


    });
});

router.get('/form/:type/:pages',function(req,res,next){
    //console.log("/form/:type/:pages - 들어옴");
    var type = req.params.type;
    var page = req.params.pages;

    var count = 10; // 10 개 가져옴
    //var offset = (page - 1) * 10; // 어디서부터 가져올것인지
    var offset = page * 10;
    var query;

    if (type == 'all') {
      query = 'SELECT _id,title,response_cnt,time FROM checkmate_schema.survey_storage LIMIT ? OFFSET ?';
    } else if (type == 'recent') {
      query = 'SELECT _id,title,response_cnt,time FROM checkmate_schema.survey_storage ORDER BY time DESC LIMIT ? OFFSET ?';
    } else if (type == 'recommend') {
      query = 'SELECT _id,title,response_cnt,time FROM checkmate_schema.survey_storage ORDER BY response_cnt DESC LIMIT ? OFFSET ?';
    }

        var params=[count,offset];
        connection.query(query,params,function(err,rows,fields){
            if(err){
                console.log("/form/:type/:pages - 페이지데이터 select 오류");
            }else{
                // console.log("/form/:type/:pages - 페이지데이터 select 성공");
                var jsonObject = new Array();
                for (i = 0; i < rows.length; i++) {
                  var temp = new Object();
                  temp._id = rows[i]._id;
                  temp.title = rows[i].title;
                  temp.response_cnt = rows[i].response_cnt;
                  temp.time = rows[i].time;

                  jsonObject.push(temp);
                }
                //console.log("/form/:type/:pages - jsonObject = ",jsonObject);
                res.status(200).json(jsonObject);
            }

        });
});
router.get('/form/:user_email', function(req, res, next) { // 더보기메뉴
  console.log("/form/:user_email - 호출");

  var userEmail = req.params.user_email;

  var query = 'SELECT _id,title,response_cnt,time FROM checkmate_schema.survey_storage WHERE user_email=?';
  var params = [userEmail];
  connection.query(query, params, function(err, rows, fields) {
    if (err) {
      console.log("/form/:user_email 오류 ", err);
    } else {
      console.log("/form/:user_email 성공");
      var jsonObject = new Array();
      for (i = 0; i < rows.length; i++) {
        var temp = new Object();
        temp._id = rows[i]._id;
        temp.title = rows[i].title;
        temp.response_cnt=rows[i].response_cnt;
        temp.time = rows[i].time;

        jsonObject.push(temp);
      }
      console.log("/form/:user_email jsonObject = ", jsonObject);
      res.status(200).json(jsonObject);
    }

  });
});

router.post('/result',function(req,res,next){

    var userEmail=req.body.userEmail;
    var form_id=req.body.form_id;
    var time=new Date().toLocaleString(); // 응답한 시간
    // 여기서 바꾸어주었구나 ..
    var jsonStr=JSON.stringify(req.body);
    // console.log('/result - userEmail = '+userEmail);
    // console.log('/result - form_id = '+form_id);
    // console.log('/result - time = '+time);
    // console.log('/result - jsonStr = '+jsonStr);

    var query='INSERT INTO checkmate_schema.result (user_email,form_id,result,time) VALUES(?,?,?,?)';
    var params=[userEmail,form_id,jsonStr,time];
    connection.query(query,params,function(err,rows,fields){
        if(err){
            console.log('/result - 저장실패 : '+err);
        }else{
            // console.log('/result - 저장완료');

            //response update 및 누군가 설문을 완료했다는 notification보내기
            var query='SELECT COUNT(*) as cnt FROM checkmate_schema.result WHERE form_id=?';
            var params=[form_id];
            connection.query(query,params,function(err,rows,fields){
                if(err){
                    console.log("/result - 데이터 load 오류");
                    res.status(404).send("error");
                }else{
                    // console.log("/result - rows = ",rows);
                    // console.log("/result - rows[0] = ",rows[0]);
                    // console.log("/result - rows[0].cnt = ",rows[0].cnt);

                    var response_cnt=rows[0].cnt;
                    var query='UPDATE checkmate_schema.survey_storage SET response_cnt=? WHERE _id=?';
                    var params=[response_cnt,form_id];
                    connection.query(query,params,function(err,rows,fields){
                        if(err){
                            console.log("/result - 데이터 update 오류");
                            res.status(404).send("result error");
                        }else{
                            console.log("/result - 데이터 update 성공");
                            res.status(200).send('result Upload complete');
                        }
                    })
                }
            })
        }
    });

});

router.post('/load',function(req,res,next){
    var form=new multiparty.Form();
    var userEmail;
    var form_id;
    form.parse(req);

    form.on('field',function(name,value){
        if(name=='userEmail'){
            userEmail=value;
        }
        if(name=='form_id'){
            form_id=value;
        }
    })

    form.on('close',function(){
        var query='SELECT result,time FROM checkmate_schema.result WHERE user_email=? AND form_id=?';
        var params=[userEmail,form_id];
        // console.log("/load close - params = ",params);
        connection.query(query,params,function(err,rows,fields){

            var jsonArray=new Array();
            for(i=0;i<rows.length;i++){
                var jsonObject=new Object();
                jsonObject.surveyResult=rows[i].result;
                jsonObject.time=rows[i].time;
                jsonArray.push(jsonObject);
            }

            // console.log("/load close - jsonArray = ",jsonArray);
            res.status(200).send(jsonArray);
        })
    })
});

router.get('/individual/:form_id',function(req,res){
// console.log("/individual/:form_id - called ");

    var form_id=req.params.form_id;
    var json;
    var query='SELECT * FROM checkmate_schema.survey_storage WHERE _id=?';
    var params=[form_id];
    connection.query(query,params,function(err,rows,fields){
        if(err){
            console.log("/individual/:form_id - 데이터 select 오류");
            res.status(404);
        }else{
            json=rows[0].json;
            //console.log("/individual/:form_id - json = ",json);
            res.status(200).send(json);
        }

    });
});

router.get('/individualChart/:form_id',function(req,res){
// console.log("/individualChart/:form_id - called ");

    var form_id=req.params.form_id;

    var title;
    var description;
    var json;

    var query='SELECT * FROM checkmate_schema.survey_storage WHERE _id=?';
    var params=[form_id];
    connection.query(query,params,function(err,rows,fields){
        if(err){
            console.log("/individualChart/:form_id - 데이터 select 오류");
            res.status(404);
        }else{

            var jsonObject=new Object();
            jsonObject.title=rows[0].title;
            jsonObject.description=rows[0].description;
            jsonObject.json=rows[0].json;

            // console.log("/individualChart/:form_id - jsonObject = ",jsonObject);

            res.status(200).send(jsonObject);
        }

    });
});




module.exports = router;
