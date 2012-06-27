var console = require('Arq/debug/console'), {Quest, finish} = require('Arq/modules/quest'),
Party = require('Arq/modules/party').PartyMember.all, {mixSprite} = require('Arq/modules/party-view');

function toBool(str) {
    if (str == null)
        return;
    return str === 'true' || str === 'on' || str === 'yes';
}

console.addCommand('Map', 'Changes to a specified map', 'map [mapName]', function (map) {
    if (map)
	Arq.goTo(map);
    else
	return GetCurrentMap();
});

console.addCommand('Quest', 'Finishes a quest', 'quest questName', function (quest) {
    quest = quest.camelCase();
    Quest.all[quest].depends.each(function (d) d.finish());
    finish(quest);
});

console.addCommand('Quests', 'Lists all quests', 'quests [searchTerm]', function (search) {
    search = RegExp(search || '', 'i');
    var quests = Object.values(Quest.all).filter(function (q) search.test(q.id.hyphenate())).map(function (q) {
        return q.id.hyphenate() + ': ' + (q.isFinished() ? 'done' : 'not done');
    });
    return quests.length ? quests : 'no quests matching "' + search.source + '"';
});

console.addCommand('Ghost', 'Toggles ignoring tile obstructions', 'ghost [on|off]', function (mode) {
    mode = toBool(mode);
    var player = Arq.config.player;
    IgnoreTileObstructions(player, [mode, !IsIgnoringTileObstructions(player)].pick());
    IgnorePersonObstructions(player, [mode, !IsIgnoringPersonObstructions(player)].pick());
});

console.addCommand('Nuke', 'Removes one or more persons from the map', 'nuke personName', function (person) {
    person = RegExp(person || '^(?!' + Arq.config.player + '$)', 'i');
    GetPersonList().each(function (p) {
        if (person.test(p))
            DestroyPerson(p);
    });
});

console.addCommand('Clone', 'Makes a bunch of clones follow a person', 'clone num spriteset [baseName] [personName] [distance]',
function (amount, sprite, base, person, distance) {
    base = base || sprite;
    person = person || Arq.config.player;
    distance = !isNaN(+distance) ? +distance : 30;
    amount = +amount;
    CreatePerson(base + '_0', sprite, false);
    FollowPerson(base + '_0', person, distance);
    (amount - 1).times(function (i) {
	++i;
	CreatePerson(base + '_' + i, sprite, false);
	FollowPerson(base + '_' + i, base + '_' + (i - 1), distance);
    });
});

console.addCommand('Spin', 'Spins one or more persons', 'spin [personName] [degrees] [rate] [direction] [frame]',
function (person, degrees, rate, direction, frame) {
    person = RegExp(person || '', 'i');
    degrees = !isNaN(+degrees) ? +degrees : 360;
    rate = parseFloat(rate) || 1;
    frame = !isNaN(+frame) ? +frame : null;
    GetPersonList().each(function (name) {
	var initial, angle, negate;
	if (person.test(name)) {
	    initial = angle = GetPersonAngle(name);
	    negate = degrees < angle;
	    UpdateHooks.add(function () {
		angle += negate ? -rate : rate;
		SetPersonAngle(name, angle.toRadians());
		if (direction)
		    SetPersonDirection(name, direction);
		if (frame != null)
		    SetPersonFrame(name, frame);
		if (negate ? angle <= degrees : angle >= degrees) {
		    SetPersonAngle(name, initial);
		    return true;
		}
	    });
	}
    });
});

console.addCommand('Fly', 'Moves the camera independant of the player', 'fly [on|off] [speed]', function (mode, speed) {
    speed = (speed || '4').toFloat();
    if (isNaN(speed)) speed = 4;
    if ([toBool(mode), IsCameraAttached()].pick()) {
	DetachCamera();
	DetachInput();
	RenderHooks.add(function () {
	    var x = GetCameraX(), y = GetCameraY();
	    if (IsKeyPressed(KEY_LEFT))
		SetCameraX(x - speed);
	    if (IsKeyPressed(KEY_RIGHT))
		SetCameraX(x + speed);
	    if (IsKeyPressed(KEY_UP))
		SetCameraY(y - speed);
	    if (IsKeyPressed(KEY_DOWN))
		SetCameraY(y + speed);
	}, 0, 'arq_consolecommands_fly');
    }
    else {
	AttachCamera(Arq.config.player);
	AttachInput(Arq.config.player);
	RenderHooks.remove('arq_consolecommands_fly');
    }
});

console.addCommand('Resolution', 'Changes the game resolution', 'resolution [width] [height]', function (width, height) {
    width = width && width.toInt();
    height = height && height.toInt();
    if (width && height) {
	var project = OpenFile('~/game.sgm'), lastSave = OpenRawFile('lastsave', true);
	project.write('screen_width', width);
	project.write('screen_height', height);
	project.flush();
	project.close();
	lastSave.write(CreateByteArrayFromString('' + Arq.global.saveSlot));
	lastSave.close();
	Arq.save();
	RestartGame();
    }
    else
	return GetScreenWidth() + 'x' + GetScreenHeight();
});

console.addCommand('Stat', "Displays or modifies a person's stats", 'stat personName statName [newValue]', function (person, stat, value) {
    person = Party[person.toLowerCase().capitalize()];
    if (value != null) {
	value = value.toFloat();
	if (!isNaN(value)) {
	    person[stat].current = value.max(0);
	    if (value > person[stat].max)
		person[stat].max = value;
	}
    }
    else
	return person[stat].current + '/' + person[stat].max;
});

console.addCommand('Mix', "Remixes a person's spriteset", 'mix personName', function (person) {
    mixSprite(Party[person.toLowerCase().capitalize()]);
});

console.addCommand('Input', 'Toggles console input', 'input [on|off]', function (state) {
    console.hasInput = [toBool(state), !console.hasInput].pick();
});
