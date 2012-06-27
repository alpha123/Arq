(function (global) {

var id = 0, current = [];

function currentFrameRate() {
    return IsMapEngineRunning() ? GetMapEngineFrameRate() : 60;
}

function setTimeout(func, time, framerate) {
    var counter = 0, max = time / 1000 * (framerate || currentFrameRate()), thisID = id++;
    current[thisID] = true;
    UpdateHooks.add(function () {
	if (!current[thisID])
	    return true;
	if (counter++ > max) {
	    func();
	    return true;
	}
    });
    return thisID;
}

function setInterval(func, time, framerate) {
    var counter = 0, max = time / 1000 * (framerate || currentFrameRate()), thisID = id++;
    current[thisID] = true;
    UpdateHooks.add(function () {
	if (!current[thisID])
	    return true;
	if (counter++ > max) {
	    func();
	    counter = 0;
	}
    });
    return thisID;
}

function clear(id) {
    delete current[id];
}

global.setTimeout = setTimeout;
global.clearTimeout = clear;
global.setInterval = setInterval;
global.clearInterval = clear;

})(this);
