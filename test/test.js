/*
 * 同时开几个终端进行测试....用此方法模拟连续的http请求.
 * */
var http=require("http");
var querystring=require("querystring");
var fs = require('fs');

// 遍历班号, 做数据缓存
var content = fs.readFileSync('./CID', 'utf8').split('\n');
var i = 0;

var oTimer = setInterval(function() {
    if (i > content.length) 
        clearInterval(oTimer);
    var options={
        host:"localhost",
        path:"/?CID=" + content[i++],
        method:"get",
        port: '6439',
        headers:{
            "Content-Type":"application/x-www-form-urlencoded; charset=utf8",
        }
    };
    var req=http.request(options,function(res){
        var result = "";
        res.setEncoding("utf8");

        res.on("data",function(data){
            result += data;
        });
        res.on("end", function() {
            console.log(result);
        });
    });
    req.end();
}, 4);
