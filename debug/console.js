function rightPad(str, padString, length) {
    while (str.length < length)
        str = str + padString;
    return str;
}

var lines = [], commands = [], commandHistory = [], longestCmdName = 0, maxHistory = 10,
visible = 0, font = GetSystemFont(), fontHeight = font.getHeight(), width = GetScreenWidth(),
height = GetScreenHeight() / 2, keyString = '', cursorVisible = true, startTime = GetTime(), hasInput = true,
cursorDelay = 400, cursorPos = 0, upKey = 1, white = CreateColor(255, 255, 255), borderWidth = 4, scrollPos = 0,
arrowUp = GetSystemUpArrow(), arrowDown = GetSystemDownArrow(), showUp = false, showDown = false,
inputHeight = fontHeight + 8, colors = {
    //trim: CreateColor(90, 90, 90, 200),
    background: CreateColor(0, 0, 0, 200),
    border: CreateColor(0, 0, 0, 200),
    //inputBackground: CreateColor(0, 0, 0, 215),
    //borderDark: CreateColor(35, 35, 35, 200),
    //borderLight: CreateColor(158, 158, 158, 200),
    message: CreateColor(255, 255, 255),
    info: CreateColor(26, 117, 230),  // a pleasant blue
    success: CreateColor(0, 255, 0),
    warning: CreateColor(255, 255, 0),
    error: CreateColor(255, 0, 0)
};

exports.__defineGetter__('hasInput', function () hasInput);
exports.__defineSetter__('hasInput', function (value) { hasInput = value; });

function addLine(line, indent, color) {
    var pad = indent ? ' ' : '', i = 0, l;

    Array.from(line).each(function (line) {
	lines.push({text: pad + line, color: color || colors.message});
    });
}

function addCmdHistory(line) {
    if (commandHistory.length == maxHistory)
        commandHistory.shift();
    commandHistory.push(line);
}

function doCommand(command) {
    var parms = command.trim().split(' '), cmd = commands[parms[0]], result;

    if (cmd) {
        result = cmd.action.apply(null, parms.slice(1));
        if (result !== undefined)
	    addLine(result, true);
    }
    else {
        try {
	    result = eval(command);
        }
        catch (e) {
	    result = e.toString();
        }
        addLine(result, true);
    }

    scrollPos = 0;

    if (lines.length > Math.floor(height / fontHeight) - 5)
	showUp = true;
}

function addCommand(cmd, desc, usage, action) {
    if (cmd.length > longestCmdName)
        longestCmdName = cmd.length;
    commands[cmd.toLowerCase()] = {command: cmd, desc: desc, usage: usage, action: action};
}
exports.addCommand = addCommand;

exports.getCommand = function (cmd) {
    return commands[cmd.toLowerCase()];
};

exports.init = function (fake) {
    if (fake) {
	exports.toggle = exports.render = exports.update = exports.addCommand =
	    exports.info = exports.success = exports.warning = exports.error = function () { };
    }
    else {
	require('Arq/debug/console-commands');
	KeyHooks.f3.add(toggle);
	UpdateHooks.add(update);
	RenderHooks.add(render);
    }
    Arq.console = exports;
};

function toggle() {
    visible = visible.wrap(0, 2);
    if (visible == 1)
	height = GetScreenHeight() / 2;
    else if (visible == 2)
	height = 40 + inputHeight - borderWidth;
    hasInput = true;
}
exports.toggle = toggle;

function render() {
    if (!visible)
        return;

    /*Rectangle(0, 0, 8, height - 40, colors.trim);
      Rectangle(8, 0, 1, height - 40, colors.borderDark);	
      Rectangle(9, 0, width - 18, height - 41, colors.background);
      Rectangle(width - 9, 0, 1, height - 40, colors.borderLight);
      Rectangle(width - 8, 0, 8,  height - 40, colors.trim);
      Rectangle(width - 8, height - 32, 8, 24, colors.trim);
      Rectangle(width - 9, height - 32, 1, 24, colors.borderLight);
      Rectangle(9, height - 41, width - 18, 1,  colors.borderLight);
      Rectangle(9, height - 32, width - 18, 23, colors.inputBackground);
      Rectangle(9, height - 9, width - 18, 1, colors.borderLight);
      Rectangle(0, height - 40, width, 8, colors.trim);
      Rectangle(0, height - 8, width, 8, colors.trim);
      Rectangle(0, height - 32, 8, 24, colors.trim);
      Rectangle(8, height - 32, 1, 24, colors.borderDark);*/

    Rectangle(0, 0, borderWidth, height - 40, colors.border);
    Rectangle(borderWidth, 0, width - borderWidth * 2, height - 40 - borderWidth - inputHeight, colors.background);
    Rectangle(width - borderWidth, 0, borderWidth, height - 40, colors.border);
    Rectangle(borderWidth, height - 40 - borderWidth - inputHeight, width - borderWidth * 2, borderWidth, colors.border);
    Rectangle(borderWidth, height - 40 - inputHeight, width - borderWidth * 2, inputHeight, colors.background);
    Rectangle(0, height - 40, width, borderWidth, colors.border);

    if (showUp)
	arrowUp.blit(width - borderWidth - arrowUp.width, 10);
    if (showDown)
	arrowDown.blit(width - borderWidth - arrowDown.width, height - 50 - arrowDown.height);

    var line = height - fontHeight - 40 - inputHeight, l = lines.length - 1 + scrollPos;

    if (l * fontHeight < line)
        line = l * fontHeight;

    for (; l >= 0; --l) {
	line -= fontHeight;
	font.setColorMask(lines[l].color);
	font.drawText(10, line + fontHeight, lines[l].text);
	font.setColorMask(white);
    }

    if (hasInput)
	font.drawText(borderWidth + 1, height - fontHeight - 40, keyString);

    if (hasInput && cursorVisible)
        font.drawText(borderWidth + 1 + font.getStringWidth(keyString.substr(0, cursorPos)), height - fontHeight - 40, '|');
}
exports.render = render;

function update() {
    if (!visible || !hasInput)
        return;

    // Update cursor state
    if (GetTime() > startTime + cursorDelay) {
        startTime = GetTime();
        cursorVisible = !cursorVisible;
    }

    if (AreKeysLeft()) {
        var key = GetKey(), temp;
        switch (key) {
	case KEY_BACKSPACE: {
	    /*keyString = keyString.split('');
	      keyString.splice((cursorPos - 1).max(0), 1);
	      keyString = keyString.join('');*/
	    keyString = keyString.substr(0, keyString.length - 1);
	    break;
	}
	case KEY_UP: {
	    if (visible == 1) {
		if (commandHistory.length > 0) {
		    keyString = commandHistory[commandHistory.length - upKey];
		    cursorPos = keyString.length;
		}
		if (upKey < commandHistory.length)
		    upKey++;
	    }
	    break;
	}
	case KEY_DOWN: {
	    if (visible == 1) {
		if (commandHistory.length > 0) {
		    keyString = commandHistory[commandHistory.length - upKey];
		    cursorPos = keyString.length;
		}
		if (upKey > 1)
		    upKey--;
	    }
	    break;
	}
	case KEY_ENTER: {
	    cursorPos = 0;
	    upKey = 1;
	    addLine(keyString);
	    addCmdHistory(keyString);
	    try {
		doCommand(keyString);
	    }
	    catch (e) {
		addLine(' ' + e);
	    }
	    keyString = '';
	    break;
	}
	case KEY_LEFT: {
	    if (cursorPos > 0)
		cursorPos--;
	    break;
	}
	case KEY_RIGHT: {
	    if (cursorPos < keyString.length)
		cursorPos++;
	    break;
	}
	case KEY_HOME: {
	    cursorPos = 0;
	    break;
	}
	case KEY_END: {
	    cursorPos = keyString.length;
	    break;
	}
	case KEY_PAGEUP: {
	    var top = lines.length - 1 + scrollPos - (Math.floor(height / fontHeight) - 6);
	    if (top > 0) {
		--scrollPos;
		showDown = true;
		if (top == 1)
		    showUp = false;
	    }
	    else
		showUp = false;
	    break;
	}
	case KEY_PAGEDOWN: {
	    if (scrollPos + 1 < 1) {
		++scrollPos;
		showUp = true;
		if (scrollPos == 0)
		    showDown = false;
	    }
	    else
		showDown = false;
	    break;
	}
	default: {
	    temp = keyString.substr(cursorPos, keyString.length);
	    keyString = keyString.substr(0, cursorPos);
	    keyString += GetKeyString(key, IsKeyPressed(KEY_SHIFT));
	    keyString += temp;
	    cursorPos++;
	    break;
	}
	}
    }
}
exports.update = update;

exports.info = function (string) {
    addLine(string, false, colors.info);
};

exports.success = function (string) {
    addLine(string, false, colors.success);
};

exports.warn = function (string) {
    addLine(string, false, colors.warning);
};

exports.error = function (string) {
    var location, line, file, fn;
    // Cool trick from Radnen to get the line number and file.
    try { location = (new Error).stack.split('\n')[2]; } catch (e) { }
    line = location.reverse().split(':', 1)[0].reverse();
    file = location.split('@')[1];
    file = file.slice(0, file.indexOf(':'));
    addLine(string + ' (' + file + ', line ' + line + ')', false, colors.error);
};

addCommand('Help', 'Lists all commands or info for a particular command', 'help [command]', function (data) {
    var cmd, cmds = [], i;
    if (data && commands[data.toLowerCase()]) {
        cmd = commands[data.toLowerCase()];
        return [cmd.desc, 'Usage: ' + cmd.usage];
    }
    for (i in commands) {
        if (commands.hasOwnProperty(i))
	    cmds.push(rightPad(commands[i].command, ' ', longestCmdName + 4) + commands[i].desc);
    }
    return cmds;
});

addCommand('Clear', 'Clears console', 'clear', function () {
    lines = [];
    return false;
});

addCommand('Dump', 'Dumps console output to a file', 'dump [file]', function (filename) {
    filename = filename || 'console_dump.txt';
    filename = filename.startsWith('~/') ? filename : '~/other/' + filename;
    var dump = lines.map(function (l) l.text).join('\n'), file = OpenRawFile(filename, true);
    try {
	file.write(CreateByteArrayFromString(dump));
    }
    catch (e) {
	return 'Couldn\'t dump to "' + filename + '": ' + e;
    }
    finally {
	file.close();
    }
    return 'Wrote ~' + (dump.sizeInBytes() / 1000).toFixed(2) + 'kb to "' + filename + '"';
});
