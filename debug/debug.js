Object.merge(exports, (function () {

function basicMode(key) {
    return (function (running) {
        return {
            condition: function () running,
            toggle: function () { running = !running; },
            key: key
        };
    })(true);
}

var running = false, log = OpenLog('debug.log'), Debug = {
    modes: {
        bases: (function (r) {
            return {
                condition: function () r,
                toggle: function () r = !r,
                color: CreateColor(0xf4, 0xfa, 0x21),
                draw: function (people) {
                    people.each(function (person) {
                        // "Borrowed" from the Lithonite 2.0 tech demo
                        var base = GetPersonBase(person), layer = GetPersonLayer(person),
                        dx = base.x2 - base.x1 + 1, dy = base.y2 - base.y1 + 1;
                        OutlinedRectangle(MapToScreenX(layer, GetPersonX(person) - (dx >> 1) + 1),
                                          MapToScreenY(layer, GetPersonY(person)) - (dy >> 1),
                                          dx, dy, Debug.modes.bases.color);
                    });
                },
                on: function () {
                    RenderHooks.add(function () {
                        if (r)
                            Debug.modes.bases.draw(GetPersonList());
                        return !running;
                    });
                }
            };
        })(true),
        logging: basicMode(),
        layers: Object.merge(basicMode('a'), {
            on: function () {
                GetNumLayers().times(function (i) {
                    Debug.modes[i] = Debug.basicMode();
                    var toggle = Debug.modes[i].toggle;
                    Debug.modes[i].toggle = function () {
                        toggle();
                        SetLayerVisible(i, !IsLayerVisible(i));
                    };
                });
            },
            off: function () {
                GetNumLayers().times(function (i) { delete Debug.modes[i]; });
            }
        }),
        console: basicMode()
    },
    
    doBind: function (fn) {
        Object.each(Debug.modes, function (mode, name) {
            fn(mode.key || name.charAt(0).toLowerCase(), name, mode);
        });
    },
    
    bindAll: function () {
        Debug.doBind(function (key, mode) {
	    KeyHooks[key].add(Debug.modes[mode].toggle, 1, 'debug_mode_' + mode);
        });
    },
    
    unbindAll: function () {
        Debug.doBind(function (key, mode) {
	    KeyHooks[key].remove('debug_mode_' + mode);
	});
    },
    
    toggle: function () {
        if (running)
            Debug.off();
        else
            Debug.on();
    },
    
    on: function () {
        if (running)
            return;
        running = true;
        Debug.doBind(function (_0, _1, mode) {
            if (typeof mode.on == 'function')
                mode.on();
        });
        Debug.bindAll();
    },
    
    off: function () {
        running = false;
        Debug.unbindAll();
        Debug.doBind(function (_0, _1, mode) {
            if (typeof mode.off == 'function')
                mode.off();
        });
    },
    
    log: function (text) {
        if (Debug.modes.logging.condition())
            log.write(text);
    }
};

Debug.console = {
};

Debug.basicMode = basicMode;

return Debug;

})());
