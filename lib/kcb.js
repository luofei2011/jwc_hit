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
    jsdom = require('jsdom'),
    mysql = require('mysql'),
    fs = require('fs');

// 搭建一个服务器, 接收get请求.
function onRequest(req, res) {
    var lessons = {},  // 考试未结束的科目
        // 获取请求url中的数据
        query = url.parse(req.url).query,
        uClass = querystring.parse(query).CID, // 从get参数中获取到用户班级
        uClass2 = querystring.parse(query).CID2 || ""; // 从get参数中获取到用户班级

    if (uClass) {
        test(res, uClass, uClass2);
    // 班号不合法的时候直接响应信息
    } else {
        lessons['status'] = 15;
        lessons.data = "";
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write(JSON.stringify(lessons));
        res.end();
    }
}

http.createServer(onRequest).listen(6440);

// 内部私有函数, 根据班号创建一个http请求. 获得用户课程表信息 
function test(response, uClass, uClass2) {
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
            var status, kcb = [], todayCourse = [];
            arr = (new iconv('GBK', 'UTF-8')).convert(new Buffer(buffers, 'binary')).toString();

            jsdom.env(arr, function(err, win) {
                var doc = win.document,
                    oTableArr = doc.getElementsByTagName('table') || [], // 不行换这个方法border = 1
                    i, j, oTable;

                // 没有课程表的情况直接结束
                if (oTableArr.length == 0) {
                    responseData(response, kcb);
                    return;
                }

                oTable = oTableArr[2]; // 不知以后结构会不会更改或者学号不同而不同

                // 上面得到了包含课程表的table
                var oTrs = oTable.rows,
                    oTds, oTd, oSpans, spanHTML, lessArr = [],

                // 先计算出当前的周数, 以及进行是星期几
                nowWeek = Math.ceil(Math.floor((new Date().getTime() - new Date('2/25/2013').getTime()) / (1000*3600*24)) / 7),
                now = new Date().getDay(),
                now = (now == 0) ? 7 : now;

                // 这样得到的是上课时间, 1-2, 3-4节等. 从下标1开始到5
                for ( i = 1; i < 6; i++ ) {
                    oTds = oTrs[i].cells;   // 0号是节数

                    for ( j = 1; j < 8; j++ ) { // 一星期七天
                        oTd = oTds[j]; // 如星期一的第1-2节课.
                        oSpans = oTd.getElementsByTagName('span');

                        for ( var item = 0; item < oSpans.length; item++ ) {
                            spanHTML = oSpans[item].innerHTML || "";
                            if (spanHTML.length == 0 || spanHTML.indexOf('考试') != -1)
                                continue;
                            if (item % 3 == 0) {
                                // cid 0
                                lessArr.push(uClass + '_' + uClass2);
                                // kc_name 1
                                lessArr.push(spanHTML);
                            }
                            if (item % 3 == 1) {
                                // address 2
                                lessArr.push(spanHTML.split(/\s+/).pop());
                            }
                            if (item % 3 == 2) {
                                spanHTML = spanHTML.replace(/周/,'').split('-');
                                // s_week 3
                                lessArr.push(parseInt(spanHTML[0]));
                                // e_week 4
                                lessArr.push(parseInt(spanHTML[1]));
                                // time 5
                                lessArr.push(i);
                                // day 6
                                lessArr.push(j);
                                // 今天的课程
                                if (parseInt(spanHTML[0]) <= nowWeek && parseInt(spanHTML[1]) >= nowWeek && j == now) {
                                    todayCourse.push(lessArr);
                                }

                                // 一门课程结束
                                kcb.push(lessArr);
                                lessArr = [];
                            }
                        }
                    }
                }
                //console.log(kcb);
                //responseData(response, kcb);
                var resData = {};
                if (todayCourse.length) {
                    resData.status = 14;
                    resData.data = todayCourse;
                } else {
                    resData.status = 15;
                    resData.data = "";
                }
                responseData(response, resData);

                // 存入数据库
                //var client = connectSQL();

                //for ( i = 0; i < kcb.length; i++ ) {
                    //console.log(kcb[i]);
                    //sqlInsert(client, kcb[0]);
                    //console.log('finish');
                //}
                //console.log('end');
                //client.end();
            });
        });
    });

    req.write(contents);
    req.end();
}

function connectSQL() {
    var client = mysql.createConnection({
        //host: '192.168.17.61',
        host: 'localhost',
        user: 'root',
        port: 6440,
        password: '******'
    });
    client.query('USE hit_jwc', function(e, result) {
        if(e) {
            console.log(e.message);
            client.end();
            return;
        }
        console.log(result);
    });
    return client;
}

function sqlInsert(client, data) {
    client.query(
        'INSERT INTO kcb ' +
        'SET cid = ?, kc_name = ?, address = ?, s_week = ?, e_week = ?, time = ?, day = ?',
        data    // {Array}
    );
}

function sqlSelect(client, condition) {
    client.query(
        'SELECT * FROM kcb',
        function selectCb(err, results, fields) {
            if (err)
                throw err;
            console.log(results);
            client.end();
        }
    );
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

function responseData(res, lessons) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write(JSON.stringify(lessons));
    res.end();
}
