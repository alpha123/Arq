var hasOwn = Object.prototype.hasOwnProperty, isRunning = {};

function applyModifiers(object, random) {
    Object.each({
	allTheTime: [1, -1, 0, 0],
	mostOfTheTime: [0.03, 24000, 1500, 8000],
	often: [0.003, 22000, 2500, 28000],
	frequently: [0.00095, 21000, 2000, 32000],
	occasionally: [0.0007, 20000, 2000, 40000],
	rarely: [0.0005, 17000, 1500, 50000],
	almostNever: [0.0002, 12000, 1000, 60000]
    }, function (parameters, name) {
	var weatherFn = random.apply(null, parameters);
	object.__defineGetter__(name, function () weatherFn);
    });

    return object;
}

function createWeatherMaker(weather) {
    function random(chance, length, vary, minDelay) {
	function doWeather() {
	    var runMax, canGoAgain = true, canGoAgainTimer, map = GetCurrentMap();

	    function startCanGoAgainTimer() {
		setTimeout(function () { canGoAgain = true; }, minDelay);
	    }

	    if (length > -1) {
		RenderHooks.add(function () {
		    weather.update().render();

		    if (!weather.running && canGoAgain && GetCurrentMap() == map && Math.random() < chance) {
			if (isRunning[map])
			    weather.options.justStarted = false;
			runMax = length + Math.floor(Math.random() * vary) - Math.floor(Math.random() * vary);
			weather.start();
			isRunning[map] = true;
			setTimeout(function () {
			    weather.stop();
			    canGoAgain = isRunning[map] = false;
			    weather.removeEvent('kill', startCanGoAgainTimer).addEvent('kill', startCanGoAgainTimer);
			}, runMax);
		    }
		});
	    }
	    else {
		isRunning[map] = true;
		RenderHooks.add(function () {
		    weather.update().render();

		    if (!weather.running && GetCurrentMap() == map)
			weather.start();
		});
	    }
	}
	doWeather._weather = weather;
	return doWeather;
    }

    return applyModifiers({randomly: random}, random);
}

exports.init = function () {
    if (Arq.fileExists('~/scripts/weather-types.js')) {
	var file = OpenRawFile('~/scripts/weather-types.js'),
	    weatherTypes = eval(CreateStringFromByteArray(file.read(file.getSize())));

	Object.each(weatherTypes, function (type, name) {
	    Arq.addMapSymbol(name, createWeatherMaker(type()));
	});
    }

    Arq.hooks.createMap.add(function (map, name) {
	if (map.weather) {
	    name = name + '.rmp';
	    Arq.logNote('Weather: preparing weather for ' + name);
	    map.enter.add(function () {
		if (!hasOwn.call(isRunning, name))
		    map.weather();
	    });
	    map.leave.add(function () { map.weather._weather.kill(); });
	}
    });
};

exports.createWeatherMaker = createWeatherMaker;
