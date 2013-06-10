var doc = document,
    oForm = doc.getElementById('form1'),
    oTable = oForm.getElementsByTagName('table')[1],
    oTbody = oTable.tBodies[0],
    oTr = oTbody.rows,
    oTr_len = oTr.length,
    i = 0, m = 0;

for ( ; i < oTr_len; i++ ) {
    var oTd = oTr[i].cells,
        oTd_len = oTd.length, j = 0;

    for ( ; j < oTd_len; j++ ) {
        var oSelect = oTd[j].getElementsByTagName('select')[0],
            oInput = oTd[j].getElementsByTagName('input')[0];

        if ( typeof oSelect !== 'undefined' ) {

            if ( oSelect.id.indexOf('_') != -1 ) { // 分开最优0-1和优2-4
                var idx = Math.floor(Math.random()*2 + 1);
                oSelect.options[idx].selected = true;
            } else {
                if ( m < 2 ) {
                    oSelect.options[2].selected = true;
                } else {
                    oSelect.options[3].selected = true;
                }
            }
        }

        // 有hidden的input
        if ( typeof oInput !== 'undefined' && oInput.type === 'text' ) {
            var value = Math.floor(Math.random()*20 + 80);

            // 确保这两种都有,不然只是表面的值变了,提交的值并没有变化!
            oInput.setAttribute('value', value);
            oInput.value = value;
        }
    }
}
oForm.submit();
