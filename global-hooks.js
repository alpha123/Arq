var HookList = require('hook-list').HookList;
keys =
// Yeah, I typed all these in manually.
['escape', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11',
 'f12', 'tilde', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'minus',
 'equals', 'backspace', 'tab', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
 'shift', 'capslock', 'numlock', 'scrollock', 'ctrl', 'alt', 'space',
 'openbrace', 'closebrace', 'semicolon', 'apostrophe', 'comma', 'period',
 'slash', 'backslash', 'enter', 'insert', 'delete', 'pageup', 'pagedown', 'up',
 'right', 'down', 'left', 'num_0', 'num_1', 'num_2', 'num_3', 'num_4', 'num_5',
 'num_6', 'num_7', 'num_8', 'num_9'];


exports.init = function (config) {
    global.UpdateHooks = HookList();
    global.RenderHooks = HookList();

    var script = config.debug ?
	'try{%0()}catch(e){Arq.console.error("Error in %1 script: see arq.log");Arq.logError("In %1 script: "+e+"\\n"+e.stack)}' :
	'%0()';

    ['Update', 'Render'].each(function (scriptType) {
	global['Set' + scriptType + 'Script'](script.replace(/%0/g, scriptType + 'Hooks').replace(/%1/g, scriptType.toLowerCase()));
    });

    global.KeyHooks = {};

    keys.each(function (key) {
	// Only bind keys when requested
	global.KeyHooks.__defineGetter__(key, function () {
	    function doBindKey() {
		BindKey(global['KEY_' + key.toUpperCase()], script.replace(/%0/g, 'KeyHooks["' + key + '"]').replace(/%1/g, 'KEY_' + key.toUpperCase()), '');
	    }

	    delete global.KeyHooks[key];  // This will remove the getter/setter
	    doBindKey();

	    var hooks = global.KeyHooks[key] = HookList(), add = hooks.add, remove = hooks.remove, clear = hooks.clear, isBound = false;
	    hooks.add = function () {
		add.apply(this, arguments);
		if (!isBound) {
		    BindKey(global['KEY_' + key.toUpperCase()], script.replace(/%0/g, 'KeyHooks["' + key + '"]')
			    .replace(/%1/g, 'KEY_' + key.toUpperCase()), '');
		    isBound = true;
		}
	    };
	    hooks.remove = function () {
		remove.apply(this, arguments);
		if (!hooks.hooks.length && isBound) {
		    UnbindKey(global['KEY_' + key.toUpperCase()]);
		    isBound = false;
		}
	    };
	    hooks.clear = function () {
		clear.apply(this, arguments);
		hooks.remove(null);  // Call the unbinding code above.
	    }
	    return hooks;
	});
	global.KeyHooks.__defineSetter__(key, function (newValue) {
	    global.KeyHooks.__lookupGetter__(key)();
	    global.KeyHooks[key] = newValue;
	});
    });
};

exports.kill = function () {
    UpdateHooks.clear();
    RenderHooks.clear();
    Object.invoke(KeyHooks, 'clear');
};

exports.keys = keys;
