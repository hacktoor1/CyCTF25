// hook_gtm.js
if (Java.available) {
    Java.perform(function () {
        try {
            var Main = Java.use('com.ctf.gtm.MainActivity');

            // 1) Hook getDecryptionKey() to log and return the known key (optional)
            try {
                var orig_getKey = Main.getDecryptionKey;
                Main.getDecryptionKey.implementation = function () {
                    var k = "Wh@T_A_Thi3f!!!!";
                    send("[*] getDecryptionKey() called -> returning: " + k);
                    return k;
                };
            } catch (e) {
                send("[!] Failed hooking getDecryptionKey: " + e);
            }

            // 2) Hook decrypt(String base64, String key)
            try {
                var decOver = Main.decrypt.overload('java.lang.String', 'java.lang.String');
                var orig_dec = decOver;
                decOver.implementation = function (base64Cipher, key) {
                    send("[*] decrypt() called");
                    send("    base64Cipher = " + base64Cipher);
                    send("    key = " + key);
                    // Call original implementation
                    var plain = orig_dec.call(this, base64Cipher, key);
                    send("    decrypted -> " + plain);
                    return plain;
                };
            } catch (e) {
                send("[!] Failed hooking decrypt(): " + e);
            }

            try {
                var lambdaName = "m68lambda$onCreate$0$comctfgtmMainActivity";
                if (Main[lambdaName]) {
                    var lambdaOver = Main[lambdaName].overload('android.view.View');
                    lambdaOver.implementation = function (v) {
                        send("[*] onClick lambda called");
                        try {
                            var et = this.nameInput; // EditText instance
                            var txt = et.getText().toString().trim();
                            send("    username (input) -> " + txt);
                        } catch (readErr) {
                            send("    Failed to read nameInput: " + readErr);
                        }
                        return lambdaOver.call(this, v);
                    };
                } else {
                    send("[!] Lambda method not found: " + lambdaName);
                }
            } catch (e) {
                send("[!] Failed hooking lambda onClick: " + e);
            }

            try {
                var sf = Main.sendFlag.overload('android.content.Context');
                sf.implementation = function (ctx) {
                    send("[*] sendFlag() called! Context: " + ctx);
                    return sf.call(this, ctx);
                };
            } catch (e) {
                send("[!] Failed hooking sendFlag: " + e);
            }

            send("[*] Hooks installed.");
        } catch (globalErr) {
            send("[!] Top-level error: " + globalErr);
        }
    });
} else {
    console.log("Java not available");
}
