;(function( win ) {
    var doc = document,
        oForm = doc.getElementById('form1'),
        oSelect = doc.getElementsByTagName('select'),
        oInput = doc.getElementsByTagName('input'),
        i_len = oInput.length,
        arr = [99,90,80],
        s_len = oSelect.length, i = 0, idx = 0;

    for ( ; i < i_len; i++ ) {
        if ( oInput[i].type.toLowerCase() === 'text' ) {
            idx = Math.floor(Math.random()*2 + 1);
            oInput[i].value = arr[idx-1];
            oInput[i].setAttribute('value',arr[idx-1]);
        }
    }

    for ( i = 0; i < s_len; i++ ) {
        idx = Math.floor(Math.random()*2 + 1);
        oSelect[i].options[idx].selected = true;
    }

    oForm.submit();
})(window);
