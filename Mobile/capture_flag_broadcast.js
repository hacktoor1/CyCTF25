// capture_flag_broadcast.js  
Java.perform(function(){  
    var Context = Java.use('android.content.ContextWrapper');
    var ContextBase = null;  
    try { ContextBase = Java.use('android.content.Context'); } catch(e){}  
  
    function hookSendBroadcast(clsName) {  
        try {  
            var C = Java.use(clsName);  
            C.sendBroadcast.overload('android.content.Intent').implementation = function(intent) {  
                try {  
                    var extras = intent.getExtras();  
                    if (extras !== null) {  
                        var flagObj = extras.getString('flag');  
                        if (flagObj !== null) {  
                            send("[FLAG_CAPTURE] Intent action=" + intent.getAction() + "  flag=" + flagObj);  
                        } else {  
                            // also try other getExtra forms:  
                            var keys = extras.keySet().toArray();  
                            for (var i=0;i<keys.length;i++){  
                                var k = keys[i].toString();  
                                if (k.toLowerCase().indexOf("flag") !== -1) {  
                                    send("[FLAG_CAPTURE] found extra key="+k+" val="+extras.get(k));  
                                }  
                            }  
                        }  
                    } else {  
                        // no extras  
                    }  
                } catch(e) {  
                    send("[FLAG_CAPTURE][err] " + e);  
                }  
                return this.sendBroadcast.call(this, intent);  
            };  
            send("[+] Hooked " + clsName + ".sendBroadcast(Intent)");  
        } catch(e){  
            send("[-] Hook failed for " + clsName + ": " + e);  
        }  
    }  
  
    // Hook Activity/Context variants  
    hookSendBroadcast('android.app.Activity');  
    hookSendBroadcast('android.content.ContextWrapper');  
    // fallback: try Context (if available)  
    try { if (ContextBase) hookSendBroadcast('android.content.Context'); } catch(e){}  
  
    try {  
        var CW = Java.use('android.content.ContextWrapper');  
        CW.sendBroadcast.overload('android.content.Intent','java.lang.String').implementation = function(intent, perm) {  
            try {  
                var extras = intent.getExtras();  
                if (extras !== null) {  
                    var flagObj = extras.getString('flag');  
                    if (flagObj) send("[FLAG_CAPTURE] (perm) action=" + intent.getAction() + " flag=" + flagObj);  
                }  
            } catch(e){}  
            return this.sendBroadcast.overload('android.content.Intent','java.lang.String').call(this, intent, perm);  
        };  
        send("[+] Hooked ContextWrapper.sendBroadcast(Intent, String)");  
    } catch(e){}  
});
