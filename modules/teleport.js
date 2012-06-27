var Tile = require('Arq/tile').Tile, HookList = require('hook-list').HookList,
before = HookList(), after = HookList(), backCoords = {}, backMap;

function goTo(map, entrance, coords) {
    if (!map.endsWith('.rmp')) map = map + '.rmp';
    if (!coords) coords = {};

    Arq.logNote('Teleporting to "' + map + '" entrance "' + entrance + '"');

    var player = Arq.config.player, oldMap = GetCurrentMap(), oldX = GetPersonX(player), oldY = GetPersonY(player),
    oldLayer = GetPersonLayer(player), entranceCoords = entrance && Arq.map(map).entrances ? Arq.map(map).entrances[entrance] : {};

    if (!entranceCoords)
	Arq.logError('Unknown entrance "' + entrance + '" in "' + map + '"');

    backCoords[oldMap] = {pixelX: oldX, pixelY: oldY, layer: oldLayer};
    backMap = oldMap;

    function setAll(coords) {
	['pixelX', 'pixelY', 'layer'].each(function (key, idx) {
	    if (coords[key])
		global['SetPerson' + (idx < 2 ? key.slice(5) : key.capitalize())](player, coords[key]);
	});
    }

    before(map, oldMap, entrance);

    if (entranceCoords.before)
	entranceCoords.before(map, oldMap, entrance);

    ChangeMap(map);
    if (entranceCoords.x && entranceCoords.y)
	Tile.tile(entranceCoords).place(Arq.config.player);
    setAll(entranceCoords);
    setAll(coords);

    if (entranceCoords.after)
	entraceCoords.after(map, oldMap, entrance);

    after(map, oldMap, entrance);
}

function goBack(map) {
    if (!map && !backMap)
	Arq.logError('Teleport: no where to go back to');

    if (!map) map = backMap;

    goTo(map, null, {pixelX: backCoords.pixelX, pixelY: backCoords.pixelY, layer: backCoords.layer});
}

function leaveFrom(exit) {
    Arq.logNote('Leaving "' + GetCurrentMap() + '" from exit "' + exit + '"');

    var exitObject = exit && Arq.map().exits ? Arq.map().exits[exit] : {};

    if (!exitObject)
	Arq.logError('Unknown exit "' + exit + '" in "' + GetCurrentMap() + '"');

    goTo(exitObject.map, exitObject.entrance);
}

exports.init = function () {
    Arq.goTo = goTo;
    Arq.goBack = goBack;
    Arq.leaveFrom = leaveFrom;
};

exports.save = function () {
    return {map: backMap, coords: backCoords};
};

exports.load = function (saved) {
    backMap = saved.map;
    backCoords = saved.coords;
};

exports.goTo = goTo;
exports.goBack = goBack;
exports.before = before;
exports.after = after;
