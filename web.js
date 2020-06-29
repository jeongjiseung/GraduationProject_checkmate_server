const express = require('express');
const app = express();
const jsport = 8887;
// http://172.30.1.13:8887/
// http://172.30.1.55:8887/

const path = require('path');
const ejs = require('ejs');

const formRouter=require('./router/form.js');
const wordRouter = require('./router/wordcloud.js');
const chatRouter = require('./router/chat.js');
const groupRouter = require('./router/group.js');
const postRouter = require('./router/post.js');
const friendRouter = require('./router/friend.js');
const widgetRouter = require('./router/widget.js');

app.use(express.json());
app.use(express.urlencoded()); // ??

app.use('/',formRouter);
app.use('/',wordRouter);
app.use('/',chatRouter);
app.use('/',groupRouter);
app.use('/',postRouter);
app.use('/',friendRouter);
app.use('/',widgetRouter);


//app.use(express.static('save'));
app.use(express.static(__dirname + '/save')); // 보안성 증가
//app.use('/static',express.static(__dirname + '/save')); // /survey/:form_id 는 가상주소이다.


app.set('views',path.join(__dirname,'views'));
app.set("view engine","ejs");

app.get('/', function(req, res) {
  console.log('web root - called !');
  // res.sendFile(__dirname + '/main.html');
  res.sendFile(__dirname + '/imgsrc.html');
  // res.send('TRY 0228')
});


app.listen(jsport, function() {
  console.log(`js server start! on port ${jsport} !`);
});
