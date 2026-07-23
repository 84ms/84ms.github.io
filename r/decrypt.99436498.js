(function() {
    var ITER = 100000;
    var gate = document.getElementById('password-gate');
    var content = document.getElementById('encrypted-content');
    if (!content) return;
    var data = content.dataset.enc;

    async function decrypt(password) {
        var raw = Uint8Array.from(atob(data), function(c) { return c.charCodeAt(0); });
        var salt = raw.slice(0, 16);
        var ct = raw.slice(16);
        var pwKey = await crypto.subtle.importKey(
            'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
        );
        var aesKey = await crypto.subtle.deriveKey(
            {name: 'PBKDF2', salt: salt, iterations: ITER, hash: 'SHA-256'},
            pwKey, {name: 'HMAC', hash: 'SHA-256', length: 256}, false, ['sign']
        );
        var result = new Uint8Array(ct.length);
        var offset = 0;
        var block = 0;
        while (offset < ct.length) {
            var blockData = new Uint8Array(salt.length + 4);
            blockData.set(salt);
            blockData[salt.length] = (block >> 24) & 0xff;
            blockData[salt.length+1] = (block >> 16) & 0xff;
            blockData[salt.length+2] = (block >> 8) & 0xff;
            blockData[salt.length+3] = block & 0xff;
            var sig = await crypto.subtle.sign('HMAC', aesKey, blockData);
            var ks = new Uint8Array(sig);
            for (var j = 0; j < ks.length && offset < ct.length; j++, offset++) {
                result[offset] = ct[offset] ^ ks[j];
            }
            block++;
        }
        var text = new TextDecoder().decode(result);
        if (text.indexOf('<div') === -1) throw new Error('bad password');
        return text;
    }

    async function tryPassword(pw) {
        try {
            var html = await decrypt(pw);
            localStorage.setItem('84ms-key', pw);
            gate.style.display = 'none';
            document.getElementById('page-content').innerHTML = html;
            document.getElementById('page-content').style.display = '';
            var h1 = document.querySelector('#page-content h1');
            if (h1) document.title = h1.textContent;
            window.dispatchEvent(new Event('content-ready'));
            return true;
        } catch(e) { return false; }
    }

    var saved = localStorage.getItem('84ms-key');
    if (saved) {
        tryPassword(saved).then(function(ok) {
            if (!ok) {
                localStorage.removeItem('84ms-key');
                gate.style.display = '';
            }
        });
    } else {
        gate.style.display = '';
    }

    document.getElementById('pw-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var pw = document.getElementById('pw-input').value;
        var err = document.getElementById('pw-error');
        err.textContent = '';
        tryPassword(pw).then(function(ok) {
            if (!ok) err.textContent = 'Невірний пароль';
        });
    });
})();