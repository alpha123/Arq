var current = {hour: 0, minute: 0}, alphas = {
    0:  160, 1: 160,  2: 160, 3: 160,  4: 150,  5: 100,
    6:  40,  7:  10,  8: 0,   9: 0,    10: 0,   11: 0,
    12: 0,   13: 0,   14: 0,  15: 0,   16: 0,   17: 0,
    18: 30,  19: 60,  20: 80, 21: 100, 22: 150, 23: 160
},
HookList = require('Arq/hook-list').HookList,
onHourChange = HookList(),
onMinuteChange = HookList(),
timeHookLists = {},
BasicEvent = require('Arq/basic-event').BasicEvent,
addSymbolMethods = require('Arq/loadable').Loadable.addSymbolMethods,
Time = new Class({
    Implements: BasicEvent,
    file: 'events/times'
}),
loadEvents = BasicEvent.loadFunction(Time),
saveEvents = BasicEvent.saveFunction(Time);
BasicEvent.setup(Time);

function splitTimeString(string) {
    if (typeof string != 'string')
	return string;
    return string.split(':').map(function (n) parseInt(n, 10));
}

function timeString(format, am, pm) {
    if (format == null) format = '%h:%m';
    if (am == null) am = 'a.m.';
    if (pm == null) pm = 'p.m.';

    var period = current.hour > 12 ? pm : am;
    return format.replace(/%h/g, current.hour).replace(/%H/g, current.hour % 12 || current.hour % 12 + 12)
                 .replace(/%m/g, current.minute.padDigits(2)).replace(/%M/g, current.minute).replace(/%p/g, period);
}

exports.init = function (options) {
    [current.hour, current.minute] = splitTimeString(options.start);

    var minuteLength = typeof options.minuteLength == 'string' ? options.minuteLength.ms() : options.minuteLength,
        doTimeInterval;

    Arq.hooks.init.add(Time.load);

    function maskScreen() {
	var prevHour = current.hour.wrap(0, 23, -1),
	    alpha = alphas[prevHour] + (alphas[current.hour] - alphas[prevHour]) / 60 * current.minute;
	ApplyColorMask(CreateColor(0, 0, 0, alpha));
    }

    function doTime() {
	var prevMinute = current.minute, prevHour = current.hour, prev = {hour: prevHour, minute: prevMinute}, time;
	current.minute = current.minute.wrap(0, 59, 1);
	onMinuteChange(current.minute, prevMinute);
	if (prevMinute == 59) {
	    current.hour = current.hour.wrap(0, 23, 1);
	    onHourChange(current.hour, prevHour);
	}

	if (Time.all[time = current.hour + ':' + current.minute.padDigits(2)])
	    Time.all[time].run(current, prev);

	if (Arq.map().outdoor)
	    maskScreen();
    }

    function startTimer() {
	doTimeInterval = setInterval(doTime, minuteLength);
	if (Arq.map().outdoor)
	    RenderHooks.add(maskScreen, -100);
    }

    Arq.hooks.mapUnload.add(function () {
	clearInterval(doTimeInterval);
	RenderHooks.remove(maskScreen);
    });
    function start() {
	if (Arq.map().outdoor)
	    maskScreen();
	startTimer();
    }
    Arq.hooks.mapLoad.add(start);
};

exports.load = function (saved) {
    [current.hour, current.minute] = [saved.time.hour, saved.time.minute];
    loadEvents(saved.events);
};

exports.save = function () {
    return {time: current, events: saveEvents()};
};

addSymbolMethods(exports, Time);

exports.hour = function () current.hour;
exports.minute = function () current.minute;
exports.setHour = function (hour) { current.hour = hour; };
exports.setMinute = function (minute) { current.minute = minute; };
exports.timeString = timeString;
exports.timeString12Hour = function () timeString('%H:%m %p');

exports.Time = Time;
exports.hourChange = onHourChange;
exports.minuteChange = onMinuteChange;
