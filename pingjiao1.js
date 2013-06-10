var doc = document,
    oForm = doc.getElementById('form1'),
    oTable = oForm.getElementsByTagName('table')[1],
    oTbody = oTable.tBodies[0],
    oTr = oTbody.rows,
    oTr_len = oTr.length,
    i = 0;

for ( ; i < oTr_len; i++ ) {
    var oTd = oTr[i].cells,
        oTd_len = oTd.length, j = 0;

    for ( ; j < oTd_len; j++ ) {
        var oSelect = oTd[j].getElementsByTagName('select')[0];
        if ( typeof oSelect !== 'undefined' ) {
            var idx = Math.floor(Math.random()*2+1);
            console.log(idx);
            oSelect.options[idx].selected = true;
        }
    }
}
oForm.submit();
