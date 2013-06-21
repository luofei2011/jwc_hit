/*
 * @author luofei (http://poised-flw.com)
 * @function 开启服务器, 根据请求信息(学生班号即可). 获得到其课程表并返回剩余考
 * 试时间
 *
 * @param {object}
 *      START_DAY: {string} 格式'2013-02-25'. 代表校历开始时间, 用于计算周数
 *      xqMsg: {string} 格式'2013春季'. 注意, 此处必须是gbk2312转码, utf8无效
 *
 * */
    // 引入需要的库
var http = require("http"),
    querystring = require("querystring"),
    iconv = require('iconv').Iconv,
    url = require('url'),
    fs = require('fs');

// 搭建一个服务器, 接收get请求.
function onRequest(req, res) {
    var isCached = false, 
        fd,  
        lessons = {},  // 考试未结束的科目
        cacheData = "", // 请求发生时, 即代表cache中没有数据
        // 获取请求url中的数据
        query = url.parse(req.url).query,
        uClass = querystring.parse(query).CID, // 从get参数中获取到用户班级
        uClass2 = querystring.parse(query).CID2 || "", // 从get参数中获取到用户班级
        // 文件名
        cacheFileName = "./cache/" + uClass + "_" + uClass2;

    if (uClass) {
        if ( fs.existsSync(cacheFileName) ) {
            isCached = true;
            fd = fs.readFileSync(cacheFileName, "utf8")
            fd.split('&|&').forEach(function(item) {
                if (item.length) 
                    get_unfinished_lesson(item, lessons);
            });
            lessons['status'] = set_lesson_status(lessons);
            responseData(res, lessons, uClass, cacheData, cacheFileName);
        } else {
            test(res, uClass, uClass2, lessons, cacheData, cacheFileName);
        }
    // 班号不合法的时候直接响应信息
    } else {
        lessons['status'] = 13;
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write(JSON.stringify(lessons));
        res.end();
    }
}

http.createServer(onRequest).listen(6439);

// 内部私有函数, 根据班号创建一个http请求. 获得用户课程表信息 
function test(response, uClass, uClass2, lessons, cacheData, cacheFileName) {
    // 固定的请求信息, 只有在学期变的时候才会进行更改
    var contents = 'xq=2013%B4%BA%BC%BE',  // 必须是gbk2312转码, utf8无效
        options = {
            host:"xscj.hit.edu.cn",
            path:"/hitjwgl/xs/kbcx_bx.asp",
            method:"post",
            encoding: "binary",
            headers:{
                "Content-Type":"application/x-www-form-urlencoded",
                "Content-Length":contents.length,		
                "Cookie":"UserXueZhi=4; UserClass=" + uClass + "; UserClass2=" + uClass2
            }
        };

    var req=http.request(options,function(res){
        var buffers = "",
            arr = [];

        res.setEncoding('binary');
        res.on('data', function(chunk) {
            buffers += chunk;
        });
        res.on('end', function() {
            // 填充响应状态以及信息
            var status;
            arr = (new iconv('GBK', 'UTF-8')).convert(new Buffer(buffers, 'binary')).toString().match(/<span>第\d+[^<>]+<\/span>/g) || [];
            // 还有没有考试安排的情况....
            if (arr.length) {
                arr.forEach(function(item) {
                          item = item.replace(/(<span>)|(<\/span>)/g,'');
                          cacheData += item + "&|&"; // 以'&|&'分割科目
                          console.log(item);
                          get_unfinished_lesson(item, lessons);
                });
            } else {
                status = 13;
            }
            lessons['status'] = set_lesson_status(lessons, status);
            responseData(response, lessons, uClass, cacheData, cacheFileName, false);
        });
    });

    req.write(contents);
    req.end();
}

function set_lesson_status(lessons, status) {
    if ( !isEmptyObj(lessons) ) {
        status = 10;    // 成功 & 还有未结束课程
    } else {
        status = status || 12;    // 成功 & 所有考试均结束
    }
    return status;
}

function get_unfinished_lesson(le, lessons) {
    var num_week = {"一": 0, "二": 1, "三": 2, "四": 3, "五": 4, "六": 5, "日": 6},

        // 另外一种格式: new Date('2013,2,25,00,00,00');
        START_DATE = new Date('2/25/2013 00:00:00'); // 不加时间也行

    le = le.split(/\s+/); // 按空格截取每科考试的时间及地点等信息
    var d1 = (parseInt(le[0].replace(/(第)|(周)/,'')) - 1) * 7 + num_week[le[1].replace(/周/,'')],
    d2 = Math.floor((new Date().getTime() - START_DATE.getTime()) / (24*3600*1000));

    if (d1 > d2) {    // 代表考试未进行
        lessons[le[4]] = d1 - d2;
    }
}

function isEmptyObj(obj) {
    for ( var i in obj ) {
        return false;
    }
    return true;
}

function responseData(res, lessons, uClass, cacheData, cacheFileName, isCached) {
    var res_status = lessons['status']; // 状态为13则不予处理
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write(JSON.stringify(lessons));
    res.end();

    // 响应完用户以后, 若该班级信息未缓存则缓存
    if (!isCached && res_status != 13 && cacheData.length ) { // 状态为13代表出错, 不要创建该班号
        fs.writeFileSync(cacheFileName, cacheData);
    }
}
