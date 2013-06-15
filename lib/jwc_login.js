var http=require("http");
var querystring=require("querystring");
var fs = require('fs');

// 创建cookie文件
//fs.open('cookies', 'w');

var contents=querystring.stringify({
    uid: "",
    pwd: ""
});

var options={
	host:"xscj.hit.edu.cn",
	path:"/hitjwgl/xs/Login.asp",
	method:"post",
	headers:{
		"Content-Type":"application/x-www-form-urlencoded; charset=utf8",
		"Content-Length":contents.length,		
        "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	
        "Accept-Encoding": "gzip,deflate,sdch",
		"Accept-Language":"zh-CN, zh;q=0.8",
		"Cache-Control":"max-age=0",
		"Connection":"Keep-Alive",	
	    "Host":"xscj.hit.edu.cn",
        "Origin":"http://xscj.hit.edu.cn",
        "Referer":"http://xscj.hit.edu.cn/hitjwgl/xs/",
        "User-Agent":"Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.92 Safari/537.1 LBBROWSER"

	}
};

var req=http.request(options,function(res){
	res.setEncoding("utf8");

    var result = "",
        resData = "",
        headers = res.headers,
        cookies = headers["set-cookie"];

    cookies.forEach(function(cookie) {
        //console.log('c: ' + cookie.replace(/path=\//g,''));
        result += cookie.replace(/path=\//g,'');
    });

    fs.appendFile("./cookies", result, 'utf8', function(e) {
    });

    
	res.on("data",function(data){
        resData += data;
	});
    res.on("end", function() {
        console.log(querystring.parse(resData));
    });
});


req.write(contents);
req.end();
