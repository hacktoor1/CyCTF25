// hook_getPartB_native_fixed.js
setImmediate(function () {
    Java.perform(function () {
        console.log("[*] Frida script started");

        // 1) Try to hook the JNI export if available
        try {
            var moduleName = "libvaultraider.so";
            var symbol = "Java_com_ctf_vaultraider_MainActivity_getPartB";
            var addr = null;
            try {
                addr = Module.findExportByName(moduleName, symbol);
            } catch (e) {
                addr = null;
            }
            if (addr) {
                console.log("[+] Found JNI symbol", symbol, "at", addr);
                Interceptor.attach(addr, {
                    onEnter: function (args) {
                        // args[2] is jstring (jni env, this, jstring)
                        this.jstring_ptr = args[2];
                    },
                    onLeave: function (retval) {
                        // retval is a jstring created by NewStringUTF; fallback below will likely capture it
                        console.log("[+] JNI function returned (raw ptr):", retval);
                    }
                });
                return;
            } else {
                console.log("[-] JNI export not found:", symbol, " — will fallback to hooking NewStringUTF");
            }
        } catch (e) {
            console.log("[!] Error while trying to hook JNI symbol:", e);
        }

        // 2) Fallback: hook NewStringUTF (commonly used to create jstring from C string)
        // Try several candidate modules, then global lookup
        var tried = [];
        var newStringAddr = null;
        var candidates = [null, "libart.so", "libandroid_runtime.so", "libc.so", "libdl.so"];
        for (var i = 0; i < candidates.length; i++) {
            try {
                var mod = candidates[i];
                var a = Module.findExportByName(mod, "NewStringUTF");
                if (a) {
                    newStringAddr = a;
                    console.log("[+] Found NewStringUTF in", mod, "at", a);
                    break;
                }
            } catch (e) {
                // ignore
            }
        }

        if (!newStringAddr) {
            console.log("[-] NewStringUTF not found via Module.findExportByName. Attempting heuristic: enumerate exports for libart");
            try {
                var m = Process.findModuleByName("libart.so");
                if (m) {
                    console.log("[*] libart.so base:", m.base);
                    // attempt to find a symbol that contains "NewStringUTF" in its name
                    var exports = m.enumerateExports();
                    for (var i = 0; i < exports.length; i++) {
                        var e = exports[i];
                        if (e.name && e.name.indexOf("NewStringUTF") !== -1) {
                            newStringAddr = e.address;
                            console.log("[+] Heuristic found", e.name, "at", e.address);
                            break;
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        }

        if (!newStringAddr) {
            console.log("[!] Could not find NewStringUTF reliably. Still attempting to intercept exports globally for strings (less reliable).");
        } else {
            Interceptor.attach(newStringAddr, {
                onEnter: function (args) {
                    // depending on ABI and runtime, args index for const char* may differ; we try common positions
                    try {
                        // Try args[1] then args[0] then args[2]
                        var cstr = null;
                        try { cstr = args[1].readCString(); } catch (e) {}
                        if (!cstr) {
                            try { cstr = args[0].readCString(); } catch (e) {}
                        }
                        if (!cstr) {
                            try { cstr = args[2].readCString(); } catch (e) {}
                        }
                        if (cstr) {
                            // Filter noise: print only strings that look like partB (adjust heuristics as needed)
                            if (cstr.length >= 4 && cstr.length <= 200) {
                                // Avoid printing very common small strings; you can refine filter here.
                                console.log("[NewStringUTF] ->", cstr);
                            }
                        }
                    } catch (e) {
                        // ignore per-call errors
                    }
                }
            });
            console.log("[*] Hooked NewStringUTF at", newStringAddr);
        }

        // 3) Extra: hook Java method entry to print android_id passed to getPartB
        try {
            var MainActivity = Java.use("com.ctf.vaultraider.MainActivity");
            if (MainActivity && MainActivity.getPartB) {
                MainActivity.getPartB.overload('java.lang.String').implementation = function (s) {
                    console.log("[Java] getPartB called with androidId =", s);
                    // call original native (will call into native), so we forward the call
                    var ret = this.getPartB(s); // may cause recursion if we replaced wrong overload; handle carefully
                    return ret;
                };
            }
        } catch (e) {
            console.log("[!] Could not hook Java getPartB wrapper:", e);
        }

        console.log("[*] Setup complete — waiting for calls...");
    });
});

