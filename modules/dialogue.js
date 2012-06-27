var {window, options} = require('Arq/text-system'), {Spritesets} = require('Arq/resources'),
{facePerson} = require('Arq/movement'), loadFile = require('Arq/loadable').Loadable.load,
dialogueEnabled = true, symbols = {}, cache = {}, hasOwn = Object.prototype.hasOwnProperty;

function execute(dialogue) {
    var text = typeof dialogue.text == 'function' ? dialogue.text() : dialogue.text,
    choices = typeof dialogue.choices == 'function' ? dialogue.choices() : dialogue.choices;
    if (text) {
        if (typeOf(text) != 'array')
            text = [text];
        text.each(function (text) {
            var talker, ss;
            function findSS(name, spritesets) {
                if (spritesets[name])
                    return spritesets[name];
                for (var keys = Object.keys(spritesets).filter(function (k) /^[A-Z]/.test(k[0])), ss,
                     i = 0, l = keys.length; i < l; ++i) {
                    if (ss = findSS(name, spritesets[keys[i]]))
                        return ss;
                }
                if (!l)
                    return null;
            }
            if (talker = text.match(/^(\w+):\s/)) {
                talker = talker[1];
                ss = findSS(talker[0].toLowerCase() + talker.slice(1), Spritesets);
                if (ss) {
                    text = text.slice(talker.length + 2);
                }
            }
            window(text);
        });
    }
    if (choices) {
        choices = choices.filter(function (c) c.condition ? c.condition() : true);
        if (choices.length) {
            options(choices.map(function (choice) {
                return {
                    text: choice.text,
                    action: function () {
                        if (typeof choice.action == 'function')
                            choice.action();
                        if (choice.response)
                            execute(choice.response);
                    }
                };
            }));
        }
        else if (dialogue.noChoices)
            window(typeof dialogue.noChoices == 'function' ? dialogue.noChoices() : dialogue.noChoices);
    }
}

function loadDialogue(map) {
    map = map.slice(0, -4);
    if (hasOwn.call(cache, map))
	return cache[map];

    var scriptFile = '~/scripts/dialogue/' + map + '.js';
    if (Arq.fileExists(scriptFile))
	return cache[map] = loadFile(scriptFile, symbols);
    return cache[map] = {};
}

exports.init = function () {
    var added = {};

    Arq.hooks.mapLoad.add(function (mapName) {
	Arq.logNote('Dialogue: Loading dialogue for ' + mapName);
	var map = Arq.map(mapName);
	Object.each(loadDialogue(mapName), function (data, person) {
	    if (!hasOwn.call(added, person)) {
		added[person] = true;
		map[person].talk.add(function () {
		    if (dialogueEnabled) {
			var current = GetCurrentPerson(), oldDirection = GetPersonDirection(current);
			facePerson(current);
			RenderMap();
			execute(data);
			SetPersonDirection(current, oldDirection);
		    }
		});
	    }
	});
    });
};

exports.addSymbol = function (name, value) {
    symbols[name] = value;
};

exports.addSymbols = function (syms) {
    Object.append(symbols, syms);
};

exports.removeSymbol = function (name) {
    var value = symbols[name];
    delete symbols[name];
    return value;
};

exports.execute = execute;
exports.loadDialogue = loadDialogue;

exports.__defineGetter__('enabled', function () dialogueEnabled);
exports.__defineSetter__('enabled', function (enabled) { dialogueEnabled = enabled; });
