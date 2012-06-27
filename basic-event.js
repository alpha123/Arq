var Loadable = require('Arq/loadable').Loadable, BasicEvent = new Class({
    Implements: Loadable,

    run: function () {
	if (this.once) {
	    this.once.apply(this, arguments);
	    this.once = false;
	}
	this.execute.apply(this, arguments);
    }
});

BasicEvent.setup = function (eventClass) {
    eventClass.all = {};
    var oldInit = eventClass.prototype.initialize || function () { };
    eventClass.prototype.initialize = function (event, id) {
	this.newLoadable(event);
	eventClass.all[id] = this;
	oldInit.apply(this, arguments);
    };
    Loadable.setup(eventClass, {
	file: eventClass.prototype.file,
	defaults: {
	    once: function () { },
	    execute: function () { }
	},
	process: function (events) {
	    Object.each(events, function (event, id) {
		new eventClass(event, id);
	    });
	}
    });
};

BasicEvent.initFunction = function (eventClass, runName, runFunction) {
    return function () {
	Arq[runName] = runFunction;
	Arq.hooks.init.add(eventClass.load);
    };
};

BasicEvent.loadFunction = function (eventClass) {
    return function (saved) {
	// `saved` is an array of ids that have had their `once` event executed
	saved.each(function (id) {
	    eventClass.all[id].once = false;
	});
    };
};

BasicEvent.saveFunction = function (eventClass) {
    return function () {
	return Object.keys(eventClass.all).filter(function (id) !eventClass.all[id].once);
    };
};

exports.BasicEvent = BasicEvent;
