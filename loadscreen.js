function random() {
    var rnd = Math.random();
    return rnd * +(1 + Array(('' + rnd).length).join(0));
}

function hexString(font, width) {
    for (var str = '', split, line = '', i = 0, n = Math.floor(Math.random() * 2 + 80); i < n; ++i)
        str += random().toString(16);
    split = str.toUpperCase().split('');
    str = '';
    for (i = 0, n = split.length; i < n; ++i) {
        if (i % 2 == 0) {
            if (line)
                line += '    ';
            line += '0x';
        }
        line += split[i];
        if (font.getStringWidth(line) >= width) {
            str += line + '\n';
            line = '';
        }
    }
    return str;
}

var text = [], white = CreateColor(255, 255, 255), LoadScreen = {
    x: 6,
    y: 6,
    width: GetScreenWidth() - 12,
    font: GetSystemFont(),
    enabled: true,
    enable: function () { LoadScreen.enabled = true; },
    disable: function () { LoadScreen.enabled = false; },
    
    text: function (string, color) {
        text.push({string: string, color: color});
	if (LoadScreen.enabled) {
            for (var y = LoadScreen.y, height, t, i = 0; t = text[i]; ++i) { // Can't use forEach because Sphere < 1.6 doesn't have it
		height = LoadScreen.font.getStringHeight(t.string, LoadScreen.width);
		if (t.color)
                    LoadScreen.font.setColorMask(t.color);
		LoadScreen.font.drawTextBox(LoadScreen.x, y, LoadScreen.width, height, 0, t.string);
		if (t.color)
                    LoadScreen.font.setColorMask(white);
		y += height + 2;
            }
            FlipScreen();
	}
    },
    
    loading: function (string) {
        LoadScreen.text('Loading ' + string + '...');
    },
    
    warning: function (string) {
        LoadScreen.text('Warning: ' + string, CreateColor(255, 255, 0));
    },
    
    error: function (string) {
        var red = CreateColor(255, 0, 0), blue = CreateColor(0, 0, 255), font = LoadScreen.font, width = GetScreenWidth(), 
        w = width - 400, start, time, hex, hexHeight, dots1 = '', dots2;
        LoadScreen.text('Error: ' + string, red);
        LoadScreen.text('Fatal error, cannot continue', red);
        LoadScreen.text('Press any key to abort', red);
        while (AreKeysLeft()) GetKey();
        GetKey();
        // The following code is purely for dramatic effect. It's pretty neat.
        start = GetTime();
        while ((time = GetTime()) - start < 8000) {
            if (time % 3 == 0 && dots1.length < w)
                dots1 += '.';
            if (dots2 != null && time % 7 == 0 && dots2.length < w)
                dots2 += '.';
            ApplyColorMask(blue);
            font.drawText(0, 0, 'Collecting data' + dots1);
            if (dots1.length == w) {
                if (dots2 == null)
                    dots2 = '';
                font.drawText(0, 10, 'Generating core dump' + dots2);
            }
            if (dots2 && dots2.length == w) {
                if (!hex) {
                    hex = hexString(font, width);
                    hexHeight = font.getStringHeight(hex, width);
                }
                font.drawTextBox(0, 30, width, hexHeight, 0, hex);
                font.drawText(0, 20, 'Die in ' + Math.floor((8000 - (time - start)) / 1000));
            }
            FlipScreen();
        }
        MapEngine(Array(1e3).join(0), 1); // If this doesn't crash Sphere on your computer, please let me know.
    }
};

Object.merge(exports, LoadScreen);
