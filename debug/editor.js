var {Input} = require('Arq/controls/input');

Object.merge(exports, (function () {

var running = false, Editor = {
    tileOutlineColor: CreateColor(0x1d, 0x77, 0xfe),
    
    showInput: function (initial, onEnter) {
        var input = new Input({
            x: GetScreenWidth() / 2 - 100,
            y: GetScreenHeight() / 2,
            width: 200,
            height: 20,
            text: initial,
            onEnter: onEnter
        }),
        windowStyle = GetSystemWindowStyle();
        KeyHooks.escape.add(function () {
            input.finish();
        }, 10);
        UpdateHooks.add(function () {
            input.update();
            while (AreKeysLeft())
                input.handleInput(GetKey());
            return input.done;
        });
        RenderHooks.add(function () {
            windowStyle.drawWindow(input.x - 10, input.y - 10, input.width + 20, input.height + 20);
            input.render();
            return input.done;
        });
    },
    
    saveMap: function () {
        Editor.showInput(GetCurrentMap().slice(0, -4) + '-new.rmp', function (text) {
            GetMapEngine().save(text);
        });
    },
    
    changeLayer: function () {
        Editor.showInput('' + Editor.layer, function (text) {
            Editor.layer = isNaN(+text) ? Editor.layer : Math.floor(+text);
            if (Editor.layer > GetNumLayers() - 1)
                Editor.layer = GetNumLayers() - 1;
            else if (Editor.layer < 0)
                Editor.layer = 0;
        });
    },
    
    changeTile: function () {
        Editor.showInput('' + (Editor.tile || 0), function (text) {
            Editor.tile = isNaN(+text) ? Editor.tile : Math.floor(+text);
            if (Editor.tile > GetNumTiles() - 1)
                Editor.tile = GetNumTiles() - 1;
            else if (Editor.tile < 0)
                Editor.tile = 0;
        });
    },

    init: function (fake) {
        if (fake)
            Editor.toggle = Editor.on = Editor.off = function () { };
        else
            KeyHooks.f7.add(Editor.toggle);
    },
    
    toggle: function () {
        if (running)
            Editor.off();
        else
            Editor.on();
    },
    
    on: function () {
        if (running)
            return;
        var width = GetTileWidth(), height = GetTileHeight(), leftIdle = true, rightIdle = true, middleIdle = true;
        if (Editor.layer == null)
            Editor.layer = GetPersonLayer(Arq.config.player);
        running = true;
        KeyHooks.s.add(Editor.saveMap, 1, 'mapeditor_savemap');
        KeyHooks.l.add(Editor.changeLayer, 1, 'mapeditor_changelayer');
        KeyHooks.t.add(Editor.changeTile, 1, 'mapeditor_changetile');
        RenderHooks.add(function () {
            var x = Math.floor(ScreenToMapX(Editor.layer, GetMouseX()) / width),
                y = Math.floor(ScreenToMapY(Editor.layer, GetMouseY()) / height), tile;
            OutlinedRectangle(MapToScreenX(Editor.layer, x * width), MapToScreenY(Editor.layer, y * height),
                width, height, Editor.tileOutlineColor);
            if (!IsMouseButtonPressed(MOUSE_LEFT))
                leftIdle = true;
            if (!IsMouseButtonPressed(MOUSE_RIGHT))
                rightIdle = true;
            if (!IsMouseButtonPressed(MOUSE_MIDDLE))
                middleIdle = true;
            if (IsMouseButtonPressed(MOUSE_LEFT) && leftIdle) {
                leftIdle = false;
                tile = GetTile(x, y, Editor.layer) - 1;
                if (tile < 0)
                    tile = GetNumTiles() - 1;
                SetTile(x, y, Editor.layer, tile);
            }
            if (IsMouseButtonPressed(MOUSE_RIGHT) && rightIdle) {
                rightIdle = false;
                tile = GetTile(x, y, Editor.layer) + 1;
                if (tile > GetNumTiles() - 1)
                    tile = 0;
                SetTile(x, y, Editor.layer, tile);
            }
            if (IsMouseButtonPressed(MOUSE_MIDDLE) && middleIdle) {
                middleIdle = false;
                SetTile(x, y, Editor.layer, Editor.tile || 0);
            }
            return !running;
        });
    },
    
    off: function () {
        KeyHooks.s.remove('mapeditor_savemap');
        KeyHooks.l.remove('mapeditor_changelayer');
        KeyHooks.t.remove('mapeditor_changetile');
        running = false;
    }
};

return Editor;

})());
