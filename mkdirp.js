const mkdirp=require('mkdirp');
const fs = require('fs');
const path=require('path');



// mkdirp(__dirname+'/f1/f2').then(made =>
//   console.log(`made directories, starting with ${made}`)
// )

// fs.mkdir('0313',function(err){
//   if(err){
//     console.log('mkdirp.js - fs.mkdir exist dir :',err);
//   }
//   else{
//     console.log('mkdirp.js - create fs.mkdir');
//   }
// })

//console.log('mkdirp.js - __dirname : ',__dirname)

function jsmkdir( dirPath ) {
    const isExists = fs.existsSync( dirPath );
    console.log('mkdirp.js - isExists = ',isExists);
    if( !isExists ) { // dir if not exist
        fs.mkdirSync( dirPath, { recursive: true } );
        console.log('mkdirp.js - create jsmkdir');
    }else{
      console.log('mkdirp.js - already exist');
    }
}

//jsmkdir( './f1/f2/f3' ); // 현재 디렉에 생성
jsmkdir( '/f1/f2/f3' ); // root에 생성
jsmkdir( 'c1/c2/c3' ); // current directory
