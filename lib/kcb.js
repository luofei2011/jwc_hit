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

    // 数据库配置
    mysqlConfig = {'host': 'localhost', 'user': 'root', 'database': 'hit_jwc', 'password': '101365'},
    mysqlClient = mysql.createConnection(mysqlConfig); 

// 处理发生错误后自动链接
handleDisconnect(mysqlClient);

function handleDisconnect(client) {
    client.on('error', function (error) {
    if (!error.fatal) return;
    if (error.code !== 'PROTOCOL_CONNECTION_LOST') throw err;

    console.error('> Re-connecting lost MySQL connection: ' + error.stack);

    // NOTE: This assignment is to a variable from an outer scope; this is extremely important
    // If this said `client =` it wouldn't do what you want. The assignment here is implicitly changed
    // to `global.mysqlClient =` in node.
    mysqlClient = mysql.createConnection(client.config);
    handleDisconnect(mysqlClient);
    mysqlClient.connect();
    });
};

// 搭建一个服务器, 接收get请求.
function onRequest(req, res) {
    var lessons = {},  // 考试未结束的科目
        // 获取请求url中的数据
        query = querystring.parse(url.parse(req.url).query),
        uClass = query.CID, // 从get参数中获取到用户班级
        uClass2 = query.CID2 || "", // 从get参数中获取到用户班级
        day = query.DAY || "", // 查询课表范围. now_week代表本周, next_week代表下周. 空代表当天
        cid = uClass + '_' + uClass2,
        query,

        // 根据参数判断当前的周数和星期数
        opt = get_day(day);

    if (opt.is_today) {
        query = "SELECT * FROM kcb WHERE cid ='" + cid + 
                "' and day=" + opt.now + " and s_week<=" + opt.nowWeek + " and e_week >=" + opt.nowWeek;
    } else {
        query = "SELECT * FROM kcb WHERE cid ='" + cid + 
                "' and s_week<=" + opt.nowWeek + " and e_week >=" + opt.nowWeek;
    }

    if (uClass) {
        // 首先去查询数据库
        mysqlClient.query(
            query,
            function selectCb(err, rows, fields) {
                if (err) throw err;

                // 查询数据库中是否已经有数据
                if (rows.length) {
                    // 先把rows转化成约定好的格式
                    rows = obj_to_arr(rows);

                    // 得到响应数据
                    var resData = get_kcb(rows, opt);
                    responseData(res, resData);
                } else {
                    // 数据库中不存在信息, 则需要从新去网站爬去数据
                    test(res, uClass, uClass2, opt);
                }
            }
        );
    // 班号不合法的时候直接响应信息
    } else {
        lessons['status'] = 16;
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write(JSON.stringify(lessons));
        res.end();
    }
}

http.createServer(onRequest).listen(6440);

// 内部私有函数, 根据班号创建一个http请求. 获得用户课程表信息 
function test(response, uClass, uClass2, opt) {
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
                    kcb.status = 16;
                    responseData(response, kcb);
                    return;
                }

                oTable = oTableArr[2]; // 不知以后结构会不会更改或者学号不同而不同

                // 上面得到了包含课程表的table
                var oTrs = oTable.rows,
                    oTds, oSpans, spanHTML, lessArr = [],

                    // 先计算出当前的周数, 以及进行是星期几
                    nowWeek = opt.nowWeek,
                    now = opt.now,
                    is_today = opt.is_today;

                // 这样得到的是上课时间, 1-2, 3-4节等. 从下标1开始到5
                for ( i = 1; i < 6; i++ ) {
                    oTds = oTrs[i].cells;   // 0号是节数

                    for ( j = 1; j < 8; j++ ) { // 一星期七天
                        oSpans = oTds[j].getElementsByTagName('span');

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
                                if (parseInt(spanHTML[0]) <= nowWeek && parseInt(spanHTML[1]) >= nowWeek) {
                                    if (j == now && is_today) {
                                        todayCourse.push(lessArr);
                                    } else if (!is_today) {
                                        todayCourse.push(lessArr);
                                    }
                                }

                                // 一门课程结束
                                kcb.push(lessArr);
                                lessArr = [];
                            }
                        }
                    }
                }
                //responseData(response, kcb);
                var resData = get_kcb(todayCourse, opt);
                
                // 给用户响应数据
                responseData(response, resData);

                // 每一次得到的班级课程表都存入数据库
                for ( i = 0; i < kcb.length; i++ ) {
                    mysqlClient.query(
                        'INSERT INTO kcb ' +
                        'SET cid = ?, kc_name = ?, address = ?, s_week = ?, e_week = ?, time = ?, day = ?',
                        kcb[i]    // {Array}
                    );
                }
            });
        });
    });

    req.write(contents);
    req.end();
}

function responseData(res, resData) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write(JSON.stringify(resData));
    res.end();
}

function get_day(week) {
    var week = week || "",
        is_today, nowWeek, now;

    is_today = (week === "") ? true : false;

    // 计算当前的周数
    nowWeek = Math.ceil(Math.floor((new Date().getTime() - new Date('2/25/2013').getTime()) / (1000*3600*24)) / 7);

    // 若传的是"下周"则修正周数
    nowWeek = (week === 'next_week') ? (nowWeek + 1) : nowWeek;

    // 计算今天是星期几
    now = new Date().getDay();
    now = (now == 0) ? 7 : now;

    return {
        nowWeek: nowWeek,
        now: now,
        is_today: is_today
    }
}

function get_kcb(todayCourse, opt) {
    var resData = {},
        i = 0, len = todayCourse.length;
        
    resData.data = [];

    if (todayCourse.length) {
        resData.status = 14;
        if(opt.is_today) {
            resData.data[opt.now] = todayCourse;
        } else {
            for( ; i < len; i++) {
                var day_time = parseInt(todayCourse[i][6]);  // 判断是星期几的课, 数据库中查出来的是字符串...
                resData.data[day_time] = resData.data[day_time] || []; // 避免push不能用的情况
                resData.data[day_time].push(todayCourse[i]);
            }
        }
    // 为空表示当天没有课程
    } else {
        resData.status = 15;
    }
    return resData;
}

function obj_to_arr(arr_warp_obj) {
    var arr = [], tmp = [],
        i = 0, len = arr_warp_obj.length;

    for ( ; i < len; i++ ) {
        for ( var item in arr_warp_obj[i] ) {
            // node.js比较严格..这步必须判断
            if (arr_warp_obj[i].hasOwnProperty(item))
                // 为了保持数据的一致性, id不用处理
                if (item !== 'id')
                    tmp.push(arr_warp_obj[i][item]);
        }
        arr.push(tmp);
        tmp = [];
    }

    return arr;
}
