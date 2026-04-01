(function() {
    var dialog = document.getElementById('settings-dialog');
    var overlay = document.getElementById('settings-overlay');
    var btn = document.getElementById('settings-btn');

    function activate(attr, val) {
        document.querySelectorAll('[data-' + attr + ']').forEach(function(b) {
            b.classList.toggle('active', b.dataset[attr] === val);
        });
    }

    function setTheme(t) {
        document.body.className = document.body.className.replace(/theme-\S+/g, '');
        if (t !== 'light') document.body.classList.add('theme-' + t);
        var fs = localStorage.getItem('84ms-fsize') || 'fs-m';
        document.body.classList.add(fs);
        localStorage.setItem('84ms-theme', t);
        activate('theme', t);
    }

    function setFont(f) {
        document.body.style.fontFamily = f;
        localStorage.setItem('84ms-font', f);
        activate('font', f);
    }

    function setFontSize(s) {
        document.body.className = document.body.className.replace(/fs-\S+/g, '');
        document.body.classList.add(s);
        localStorage.setItem('84ms-fsize', s);
        var t = localStorage.getItem('84ms-theme') || 'auto';
        if (t !== 'light') document.body.classList.add('theme-' + t);
        activate('fsize', s);
    }

    setTheme(localStorage.getItem('84ms-theme') || 'auto');
    setFont(localStorage.getItem('84ms-font') || 'Georgia, serif');
    setFontSize(localStorage.getItem('84ms-fsize') || 'fs-m');

    document.querySelectorAll('[data-theme]').forEach(function(b) {
        b.addEventListener('click', function() { setTheme(b.dataset.theme); });
    });
    document.querySelectorAll('[data-font]').forEach(function(b) {
        b.addEventListener('click', function() { setFont(b.dataset.font); });
    });
    document.querySelectorAll('[data-fsize]').forEach(function(b) {
        b.addEventListener('click', function() { setFontSize(b.dataset.fsize); });
    });

    function close() {
        dialog.style.display = 'none';
        overlay.style.display = 'none';
    }
    btn.addEventListener('click', function() {
        var show = dialog.style.display === 'none';
        dialog.style.display = show ? '' : 'none';
        overlay.style.display = show ? '' : 'none';
    });
    overlay.addEventListener('click', close);
})();