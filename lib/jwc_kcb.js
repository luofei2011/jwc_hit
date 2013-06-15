var http=require("http"),
    querystring=require("querystring"),
    iconv = require('iconv').Iconv,
    START_DATE = new Date('2013-02-25'),    // 校历开始的时候
    num_week = {"一": 0, "二": 1, "三": 2, "四": 3, "五": 4, "六": 5, "日": 6};

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

// 私有函数, 返回数字周数
/* 这样做不如hash来得快...
function get_num_week(str) {
    var ch_week = str.replace(/周/,'');
    switch(ch_week) {
        case "一":
            return 1;
        case "二":
            return 2;
        case "三":
            return 3;
        case "四":
            return 4;
        case "五":
            return 5;
        case "六":
            return 6;
        case "日":
            return 7;
        default:
            break;
    }
}
*/

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
                              
                              var d1 = (parseInt(le[0].replace(/(第)|(周)/,'')) - 1) * 7 + num_week[le[1].replace(/周/,'')];
                              var d2 = Math.floor((new Date().getTime() - START_DATE.getTime()) / (24*3600*1000));

                              if (d1 > d2) {    // 代表考试未进行
                                  lessons.push({
                                      name: le[4],
                                      d_day: d1 - d2
                                  });
                              }

                              /*
                              lessons.push({ // 压入考试信息数组
                                  week: le[0], // 第几周
                                  day: le[1], // 周几
                                  time: le[2], // 什么时间考试
                                  address: le[3], // 考试地点
                                  name: le[4] // 考试科目
                              });*/
                          });
                      }
                  });
        console.log(lessons);
    });
});


req.write(contents);
req.end();
