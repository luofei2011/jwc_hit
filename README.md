关于
====

哈工大教务处快速评教JS脚本。

## USE

登陆到教务处，然后进入评教页面。

复制如下代码到浏览器地址栏：

```js
javascript:(function () {
  var newScript = document.createElement('script');
  newScript.type = 'text/javascript';
  newScript.src = 'https://raw.github.com/luofei2011/jwc_hit/master/pingjiao.js';
  document.getElementsByTagName('body')[0].appendChild(newScript);
})();

```
