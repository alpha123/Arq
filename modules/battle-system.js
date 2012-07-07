var {HUD, hudFont, hudColor} = require('Arq/battle-system/hud'),
{BattleController} = require('Arq/battle-system/battle-controller'),
party = require('Arq/modules/party').PartyMember.active,
monsters = require('Arq/modules/monster').Monster.all,
loadFile = require('Arq/loadable').Loadable.load,
activeBattle = null,
symbols = {}, cache = {}, floor = Math.floor, hasOwn = Object.prototype.hasOwnProperty;

function showResult(text) {
    var screenHeight = GetScreenHeight(), screenWidth = GetScreenWidth(),
        offset = floor(screenHeight * 0.025), width = floor(screenWidth * 0.6),
        height = offset + hudFont.getStringHeight(text, width - offset).max(floor(screenHeight * 0.35)),
        x = floor((screenWidth - width) / 2), y = floor((screenHeight - height) / 2),
        inputPerson = GetInputPerson(), counter = 0, frames = GetMapEngineFrameRate() / 2, hide = false;

    DetachInput();
    while (AreKeysLeft()) GetKey();

    UpdateHooks.add(function () hide = ++counter > frames && IsAnyKeyPressed());

    RenderHooks.add(function () {
	Rectangle(x, y, width, height, hudColor);
	hudFont.drawTextBox(x + offset, y + offset, width - offset * 2, height - offset * 2, 0, text);
	if (hide) {
	    AttachInput(inputPerson);
	    return true;
	}
    });
}

function startBattle(attacker) {
    Arq.pauseSaving();
    if (Arq.hasModule('dialogue'))
	Arq.getModule('dialogue').enabled = false;

    activeBattle = new BattleController(party, attacker);
    activeBattle.addEvent('finish', function () {
	hud.hide();

	Object.each(Arq.map(), function (thing, name) {
	    if (thing && thing.monsterInstance && activeBattle.allMonsters.contains(thing.monsterInstance))
		delete thing.monsterInstance;
	});

	activeBattle = null;
	KeyHooks.space.remove(boundUseWeapon);

	Arq.resumeSaving();
	if (Arq.hasModule('dialogue'))
	    Arq.getModule('dialogue').enabled = true;
    });
    activeBattle.addEvent('win', function (expGain, cashGain, collectedItems) {
	var text = 'Gained ' + expGain + ' experience.';
	if (Arq.hasModule('cash'))
	    text = text.slice(0, -1) + ' and $' + cashGain + '.';
	if (collectedItems.length)
	    text += '\n\nFound:\n' + Object.values(Object.map(collectedItems, function (i) i.item.name + ' x' + i.amount)).join('\n');
	showResult(text);
    });
    activeBattle.addEvent('lose', function (expLoss) {
	showResult('Lost ' + expLoss + ' experience.');
    });

    var hud = new HUD(party), boundUseWeapon = function () { activeBattle.useWeapon(activeBattle.activeMember); };

    hud.addEvent('selectItem', function (item) {
	activeBattle.useItem(activeBattle.activeMember, item);
    });
    hud.addEvent('selectPartyMember', activeBattle.setActivePartyMember.bind(activeBattle));
    hud.show();

    KeyHooks.space.add(boundUseWeapon);
}

function execute(battleData, attacker, name) {
    attacker.movementPaused = true;

    if (!activeBattle)
	startBattle(attacker.monsterInstance);
    else
	activeBattle.addMonsters(attacker.monsterInstance);

   attacker.monsterInstance.ai.start(name, activeBattle);

    activeBattle.addEvent('finish', function () {
	delete attacker.movementPaused;
	attacker.monsterInstance.ai.stop();
    });
}

function loadBattles(map) {
    map = map.slice(0, -4);
    if (hasOwn.call(cache, map))
	return cache[map];

    var scriptFile = '~/scripts/battles/' + map + '.js';
    if (Arq.fileExists(scriptFile))
	return cache[map] = loadFile(scriptFile, symbols);
    return cache[map] = {};
}

exports.init = function () {
    var added = {};

    Arq.hooks.mapLoad.add(function (mapName) {
	Arq.logNote('Battle system: Loading battles for ' + mapName);
	var map = Arq.map(mapName);
	Object.each(loadBattles(mapName), function (data, personRegex) {
	    Arq.peopleMatching(personRegex).each(function (person) {
		if (!hasOwn.call(added, person)) {
		    Arq.logNote('Battle system: Adding touch event for ' + person);
		    added[person] = true;
		    map[person].touch.add(function () {
			if (!map[person].monsterInstance) {
			    map[person].monsterInstance = monsters[map[person].monster].clone();
			    execute(data, map[person], person);
			}
		    });
		}
	    });
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
exports.loadBattles = loadBattles;
exports.__defineGetter__('activeBattle', function () activeBattle);
exports.__defineSetter__('activeBattle', function (battle) { activeBattle = battle; });
