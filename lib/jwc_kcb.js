var http=require("http");
var querystring=require("querystring");
var iconv = require('iconv').Iconv;
//var iconv_lite = require('iconv-lite');
var fs = require('fs');

// 固定的请求信息, 只有在学期变的时候才会进行更改
var contents="xq=2013%B4%BA%BC%BE&KBLX=1&Xiaoqu=%D2%BB%C7%F8&Submit=%CF%C2%D2%BB%B2%BD";

var options={
	host:"xscj.hit.edu.cn",
	path:"/hitjwgl/xs/kbcx_bx.asp",
	method:"post",
	headers:{
		"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8",
		"Content-Length":contents.length,		
        "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	
        "Accept-Encoding": "gzip,deflate,sdch",
		"Accept-Language":"zh-CN, zh;q=0.8",
		"Cache-Control":"max-age=0",
		"Connection":"Keep-Alive",	
	    "Host":"xscj.hit.edu.cn",
        "Origin":"http://xscj.hit.edu.cn",
        "Referer":"http://xscj.hit.edu.cn/hitjwgl/xs/kbcx.asp",
        "User-Agent":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.5 Safari/537.22",
        "Cookie":"UserType=studentLogin; HitXueQi=2013%B4%BA%BC%BE; UserXueZhi=4; UserClass=1003106; UserZYBH=031; UserID=1100300828; ASPSESSIONIDCQAAQQAS=AHMPINBCFCLIDLMHONJPAIFM; UserClass2=%2D; UserName=%C2%E6%B7%C9"
	}
};

var req=http.request(options,function(res){
    res.setEncoding('binary');

    var buffers = "",
        arr = [], lessons = [],
        resBody = res.body;

    res.on('data', function(chunk) {
        buffers += chunk;
    });

    res.on('end', function() {
        // 得到正确的gbk数据
        arr = (new iconv('GBK', 'UTF-8')).convert(new Buffer(buffers, 'binary')).toString()
                  .split('<strong>考') // 这步截取到考试信息
                  .pop().split('<td ') // 截取到每门考试
                  .forEach(function(buf) { // 遍历各种考试, 得到其信息
                      if ( /第\d+周/.test(buf) ) { // 判断是否含有考试信息
                          buf.match(/<span>.+<\/span>/g).forEach(function(le) { // 利用match得到匹配的考试源信息
                              le = le.replace(/(<span>)|(<\/span>)/g,'').split(/\s+/); // 按空格截取每科考试的时间及地点等信息
                              lessons.push({ // 压入考试信息数组
                                  week: le[0],
                                  day: le[1],
                                  time: le[2],
                                  address: le[3],
                                  name: le[4]
                              });
                          });
                      }
                  });
        console.log(lessons);
    });
});


req.write(contents);
req.end();
