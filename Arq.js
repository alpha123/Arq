RequireScript('Arq/commonjs.js');
RequireScript('Arq/mootools-core-1.4.5-server.js');
RequireScript('Arq/native-extensions.js');
RequireScript('Arq/setTimeout.js');
RequireScript('Arq/persist.js');

// For whatever reason Moo uses encode/decode instead of stringify/parse.
// SpiderMonkey 1.8 doesn't have a JSON object built in.
JSON.stringify = JSON.encode;
JSON.parse = JSON.decode;

var Arq = (function () {
    function logNote(message) {
	if (config.log.notes)
	    log.write('NOTE: ' + message);
    }
    function logWarning(message) {
	log.write('WARNING: ' + message);
    }
    function logError(message) {
	log.write('ERROR: ' + message);
    }

    function normalizeMapName(map) {
	if (map.endsWith('.rmp')) return map;
	return map + '.rmp';
    }

    function getConfig(allConfig) {
	if (!hasOwn.call(allConfig, 'environment') || !hasOwn.call(allConfig, allConfig.environment))
	    logError('Unknown configuration "' + allConfig.environment + '"'); 

	var config = typeOf(allConfig['*']) == 'object' ? allConfig['*'] : {};
	Object.merge(config, allConfig[allConfig.environment]);
	return config;
    }

    function normalizeConfig(config) {
	config.startingMap = normalizeMapName(config.startingMap);
	return config;
    }

    function checkVersion() {
	var LoadScreen = require('Arq/loadscreen'), version = GetVersion();
	LoadScreen.text('Checking Sphere version....');
	if (version < 1.6)
	    LoadScreen.error('Sphere 1.6 required, ' + version + ' found');
	else if (version > 1.6)
	    LoadScreen.warning('Sphere 1.6 recommended, game might not work with ' + version);
    }
    checkVersion();

    var log = OpenLog('arq.log'),
    hasOwn = Object.prototype.hasOwnProperty,
    HookList = require('hook-list').HookList,
    Resources = require('Arq/resources'),
    StartMenu = require('Arq/controls/start-menu').Menu,
    MenuItem = require('Arq/controls/start-menu').MenuItem,
    loadJSON = require('Arq/json').loadFile,
    saveJSON = require('Arq/json').saveFile,
    config = normalizeConfig(getConfig(loadJSON('scripts/config.json'))),
    builtinModules = {
	teleport: {},
	party: {},
	monster: {},
	_defaultMapVariables: {visited: false},
	_defaultMapEvents: {enter: function (self) self.visited = true}
    },
    modules = Object.map(Object.merge(builtinModules, config.modules), function (options, name) {
	logNote('Loading module ' + name);
	return {module: require('Arq/modules/' + name), options: options};
    }),
    hooks = {
	preCreateMap: HookList(), // Called before a new map is created.
	createMap: HookList(),    // Called when a new map is created.
	preCreatePerson: HookList(), // Called before a new person is created.
	createPerson: HookList(), // Called when a new person is created.
	init: HookList(),     // Called when the system is set up.
	start: HookList(),    // Called immediately after the map engine starts.
	end: HookList(),      // Called after the map engine exists. Not guaranteed to be called; use with caution.
	mapLoad: HookList(),  // Called after a new map is loaded to the map engine.
	mapUnload: HookList() // Called after a map is unloaded from the map engine, before the new map is loaded.
    },
    global = {map: config.startingMap, x: -1, y: -1, layer: -1, direction: 'south', frame: 0, saveSlot: -1},
    mapEvents = 'enter leave leaveNorth leaveSouth leaveEast leaveWest'.split(' '),
    personEvents = 'create destroy talk touch generator'.split(' '),
    tied = {},
    mapSymbols = {},
    canSave = true, saving = false;

    // Add UpdateHooks, RenderHooks, KeyHooks, etc
    require('Arq/global-hooks').init(config);

    // After a map loads, we have to go through the people and match them with regexes
    hooks.mapLoad.add(function (mapName) {
	var map = getMap(mapName), regexes = Object.keys(map), i = 0, l = regexes.length,
	    people = GetPersonList().filter(function (p) !IsInputAttached() || p != GetInputPerson());

	// Ensure that all people have all events as HookLists
	people.each(function (personName) {
	    if (!isPerson(map[personName]))
		createPerson(map[personName] || (map[personName] = {}), personName);
	});

	regexes.each(function (regex) {
	    var matches = peopleMatching(regex, people);

	    if (matches.length && !isPerson(map[regex]))
		createPerson(map[regex], regex);

	    matches.each(function (personName) {
		if (personName != regex && (tied[personName] ? !tied[personName][regex] : true)) {
		    tiePersons(map[personName], map[regex]);
		    if (!tied[personName]) tied[personName] = {};
		    tied[personName][regex] = true;
		}
	    });
	});

	persist.bindPersonsEvents();
	persist.recreatePersons();
    });

    function hasModule(name) {
	return hasOwn.call(modules, name);
    }

    function addModule(name, module, options) {
	modules[name] = {module: module, options: options};
    }

    function removeModule(name) {
	delete modules[name];
    }

    function getModule(name) { 
	return modules[name].module;
    }

    function getModuleOptions(name) {
	return modules[name].options;
    }

    persist.addScriptProcessor(function (script, mapName) {
	return 'Arq._currentmap = "' + mapName + '";' + script;
    });

    persist.addScriptProcessor(function (script) {
	return 'with(Arq.mapSymbols){' + script + '}';  // eval'ing a `with` statement returns its last expression.
    });

    if (config.debug) {
	persist.addScriptProcessor(function (script, mapName) {
	    return 'try{' + script + '}catch(e){Arq.logError("In script for ' + mapName + ': "+e+"\\n"+e.stack);throw e}';
	});
    }

    // Recursively turns all functions into HookLists
    function toHookList(object) {
	var visited = [];

	function doToHookList(object) {
	    if (object.noHookList) return;

	    Object.each(object, function (value, key) {
		if (typeof value == 'function') {
		    object[key] = HookList([value]);
		    Object.append(object[key], value);
		}
		else if (typeOf(value) == 'object' && !visited.contains(value)) {
		    visited.push(value);
		    doToHookList(value);
		}
	    });
	}
	doToHookList(object);
    }

    // Ties two HookLists together so that when the second changes, the first does, but not vice versa.
    function tieHookLists(hooks, newHooks) {
	newHooks.hooks.each(function (hook) { hooks.add(hook); });

	var old = {
	    add: newHooks.add,
	    remove: newHooks.remove,
	    clear: newHooks.clear
	};

	function newMethod(methodName) {
	    return function () {
		hooks[methodName].apply(hooks, arguments);
		return old[methodName].apply(newHooks, arguments);
	    };
	}

	['add', 'remove', 'clear'].each(function (method) {
	    newHooks[method] = newMethod(method);
	});
    }

    function createMap(object, name) {
	if (name == null)
	    name = Arq._currentmap.slice(0, -4);

	Arq.logNote('createMap: creating ' + name);

	hooks.preCreateMap(object, name);
	toHookList(object);
	// Fill in any events that didn't already exist. The `toHookList` call above will handle turning
	// events that already exist into HookLists.
	mapEvents.each(function (event) {
	    if (!object[event])
		object[event] = HookList();
	});
	hooks.createMap(object, name);
	return object;
    }

    function createPerson(object, name) {
	logNote('createPerson: creating ' + name);

	hooks.preCreatePerson(object, name);
	personEvents.each(function (event) {
	    var old = object[event];
	    object[event] = HookList();
	    if (old != null)
		object[event].add(old);
	});
	object.noHookList = true;
	hooks.createPerson(object, name);
	return object;
    }

    function clonePerson(object) {
	var newPerson = Object.create(object);
	personEvents.each(function (event) {
	    newPerson[event] = HookList([object[event]]);
	});
	return newPerson;
    }

    function isPerson(object) {
	return typeOf(object) == 'object' && personEvents.every(function (e) e in object && object[e].hooks);
    }

    function tiePersons(person1, person2) {
	Object.append(person1, Object.filter(person2, function (v, k) !personEvents.contains(k)));
	personEvents.each(function (event) {
	    tieHookLists(person1[event], person2[event]);
	});
    }

    function getMap(map) {
	return persist.map(map && normalizeMapName(map));
    }

    function getPerson(personName, mapName) {
	mapName = mapName && normalizeMapName(mapName);
	var map = persist.map(mapName), person = map[personName], regexes = Object.keys(map),
	    i = 0, l = regexes.length;

	if (person == null) {
	    // Search for a regex key matching `personName` and return a new "instance" of its value
	    for (; i < l; ++i) {  // It nearly killed me to write a for loop. I wish JS had non-local returns....
		if (typeOf(map[regexes[i]]) == 'object' && RegExp(regexes[i]).test(personName)) {
		    map[personName] = clonePerson(map[regexes[i]]);
		    persist.bindPersonEvents(personName);
		    return map[personName];
		}
	    }

	    person = createPerson(map[personName] = {}, personName);
	    persist.bindPersonEvents(personName);
	}
	return person;
    }

    function peopleMatching(regex, people) {
	if (typeof regex == 'string') regex = RegExp(regex);
	if (people == null) people = GetPersonList();
	return people.filter(regex.test.bind(regex));
    }

    function updateGlobal() {
	if (IsInputAttached()) {
	    ['x', 'y', 'layer', 'direction', 'frame'].each(function (property) {
		global[property] = this['GetPerson' + property.capitalize()](GetInputPerson());
	    });
	}
	global.map = GetCurrentMap();
    }

    function lastSaveNum() {
	var saves = GetDirectoryList('save');
	if (!saves.length)
	    return -1;

	return Math.max.apply(Math, saves.map(function (s) s.slice(5).toInt()));
    }

    function saveDirectoryExists(saveNum) {
	return GetDirectoryList('save').contains('save_' + saveNum);
    }

    function readLastSave() {
	try {
	    var lastSave = OpenRawFile('lastsave'), saveNum = +CreateStringFromByteArray(lastSave.read(lastSave.getSize()));
	    lastSave.close();
	    RemoveFile('~/other/lastsave');
	    return isNaN(saveNum) ? -1 : saveNum;
	}
	catch (e) {
	    return -1;
	}
    }

    // Skip some things if the other/lastsave file exists.
    function handleLastSave() {
	global.saveSlot = readLastSave();
	if (global.saveSlot > -1)
	    require('Arq/loadscreen').disable();
    }

    function savePersist(world) {
	return Object.map(world, function (map) {
	    var newMap = {}, person, saved;
	    for (person in map) {
		// No hasOwnProperty check -- we want inherited things.
		if (map[person] != null && typeof map[person].save == 'function') {
		    Arq.logDebug('map["' + person + '"]: ' + map[person].toSource());
		    saved = map[person].save(map[person], map, world);
		    Arq.logDebug('saved: ' + (saved && saved.toSource()));
		    if (saved != null)
			newMap[person] = saved;
		}
		else
		    newMap[person] = map[person];
	    }
	    return newMap;
	});
    }

    function load(saveNum) {
	var base = 'save/save_' + saveNum + '/';
	try {
	    Object.merge(global, loadJSON(base + 'global.js'));
	    persist.setWorldState(loadJSON(base + 'persist.js'));

	    Object.each(modules, function (module, name) {
		if (module.module.load && Arq.fileExists('~/' + base + name + '.js'))
		    module.module.load(loadJSON(base + name + '.js'));
	    });
	}
	catch (e) {
	    logError("Couldn't load game: " + e);
	}
    }

    function save(saveNum) {
	if (saveNum == null) saveNum = global.saveSlot;

	if (canSave && !saving) {
	    saving = true;

	    if (!saveDirectoryExists(saveNum))
		CreateDirectory('save/save_' + saveNum);

	    var base = 'save/save_' + saveNum + '/';
	    try {
		saveJSON(base + 'global.js', global);
		saveJSON(base + 'persist.js', savePersist(persist.getWorldState()));

		Object.each(modules, function (module, name) {
		    if (module.module.save)
			saveJSON(base + name + '.js', module.module.save());
		});
	    }
	    catch (e) {
		logError("Couldn't save game: " + e);
	    }
	    saving = false;
	}
    }

    function createPlayer() {
	logNote('Creating ' + config.player);
	CreatePerson(config.player, config.player + '.rss', false);
	AttachInput(config.player);
	AttachCamera(config.player);
    }

    function processModules(logText, method) {
	Object.each(modules, function (module, name) {
	    logNote(logText + ' module ' + name);
	    if (module.module[method])
		module.module[method](module.options, config);
	});
    }

    function initModules() {
	processModules('Initializing', 'init');
    }

    function killModules() {
	processModules('Killing', 'kill');
    }

    function setupHooks() {
	setTimeout(hooks.start, 0);
	setTimeout(function () { hooks.mapLoad(global.map, null); }, 0);
	getModule('teleport').before.add(hooks.mapUnload);
	getModule('teleport').after.add(hooks.mapLoad);
    }

    function addDefaultHooks() {
	hooks.start.add(function () {
	    if (IsInputAttached()) {
		['x', 'y', 'layer', 'direction', 'frame'].each(function (property) {
		    if (global[property] > -1)
			this['SetPerson' + property.capitalize()](GetInputPerson(), global[property]);
		});
	    }

	    return true;
	});

	getModule('teleport').after.add(function (map) { global.map = map; });
    }

    function startMenu() {
	var saveNum, lastNum = lastSaveNum(), menu = new StartMenu({
	    font: Resources.Fonts.varelaRound,
	    items: [
		new MenuItem({
		    icon: Resources.Images.newGame,
		    text: 'New Game',
		    onSelect: function () {
			menu.close();
			saveNum = lastNum + 1;
		    }
		}),
		new MenuItem({icon: Resources.Images.quitGame, text: 'Quit Game', onSelect: Exit})
	    ]
	}), titleTheme = config.titleTheme ? Object.get(Resources.Sounds, config.titleTheme.camelCase()) : {play: function () { }, stop: function () { }};

	if (lastNum > -1) {
	    menu.items.splice(1, 0, new MenuItem({
		icon: Resources.Images.continueGame,
		text: 'Continue Game',
		onSelect: function () {
		    menu.close();
		    saveNum = continueMenu();
		    if (saveNum < 0)
			menu.execute();
		}
	    }));
	}

	titleTheme.play(true);
	menu.execute();
	titleTheme.stop();
	return saveNum;
    }

    function continueMenu() {
	var saveNum, menu = new StartMenu({
	    font: Resources.Fonts.varelaRound,
	    items: GetDirectoryList('save').map(function (saveDir) {
		var thisNum = +saveDir.slice(5);
		return new MenuItem({
		    icon: Resources.Images.continueGame,
		    text: saveDir.replace('_', ' ').capitalize(),
		    onSelect: function () {
			menu.close();
			saveNum = thisNum;
		    }
		});
	    }).concat(new MenuItem({
		icon: Resources.Images.quitGame,
		text: 'Back',
		onSelect: function () {
		    menu.close();
		    saveNum = -1;
		}
	    }))
	});

	menu.execute();
	return saveNum;
    }

    function init() {
	logNote('Initializing Arq');
	persist.startLogging(config.log.persistNotes, OpenLog('persist.js.log'));
	persist.init();

	addDefaultHooks();

	createPlayer();

	handleLastSave();

	initModules();
	hooks.init();
	hooks.init.clear();  // Free a little memory.

	setupHooks();

	if (global.saveSlot < 0)
	    global.saveSlot = startMenu();
	logNote('Save slot: ' + global.saveSlot);
	load(global.saveSlot);
	setInterval(function () {
	    updateGlobal();
	    save(global.saveSlot);
	}, typeof config.saveRate == 'string' ? config.saveRate.ms() : config.saveRate);

	logNote('Starting map engine (' + global.map + ')');
	MapEngine(global.map, 60);
	// The following hooks will only be called if ExitMapEngine() is called, not if the game is closed. Use with caution.
	hooks.mapUnload(null, global.map);
	hooks.end();
    }

    function kill() {
	logNote('Killing Arq');
	persist.stop();
	persist.stopLogging();

	killModules();

	Object.invoke(hooks, 'clear');
	require('Arq/global-hooks').kill();
	
	global = {map: config.startingMap, x: -1, y: -1, layer: -1, direction: 'south', frame: 0, saveSlot: -1};
    }

    return {
	// Variables
	config: config,
	modules: modules,
	hooks: hooks,
	global: global,
	mapSymbols: mapSymbols,

	// Functions
	logNote: logNote,
	logWarning: logWarning,
	logError: logError,
	normalizeMapName: normalizeMapName,
	fileExists: persist.fileExists,
	map: getMap,
	person: getPerson,
	hasModule: hasModule,
	addModule: addModule,
	removeModule: removeModule,
	getModule: getModule,
	getModuleOptions: getModuleOptions,
	createMap: createMap,
	createPerson: createPerson,
	peopleMatching: peopleMatching,
	updateGlobal: updateGlobal,
	save: save,
	pauseSaving: function () { canSave = false; },
	resumeSaving: function () { canSave = true; },
	init: init,
	kill: kill,
	addMapSymbol: function (name, value) { mapSymbols[name] = value; },
	addMapSymbols: function (symbols) { Object.append(mapSymbols, symbols); },
	removeMapSymbol: function (name) { delete mapSymbols[name]; }
    };
})(this);
