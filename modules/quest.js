var Loadable = require('Arq/loadable').Loadable,
Quest = new Class({
    Implements: Loadable,

    initialize: function (options) {
	options.goal = options.goal || new Goal(function () this.done);
	this.newLoadable(options);
	Quest.all[this.id] = this;
    },

    finish: function () {
	this.goal.finish();
	return this;
    },

    isFinished: function () {
	return this.depends.every(function (q) q.isFinished()) && this.goal.isFinished();
    }
}),
Goal = new Class({
    _fns: [],
    done: false,

    initialize: function (fn) {
	this._fns.push({or: fn});
    },

    or: function (fn) {
	this._fns.push({or: fn});
	return this;
    },

    and: function (fn) {
	this._fns.push({and: fn});
	return this;
    },

    finish: function () {
	this.done = true;
	return this;
    },

    isFinished: function () {
	return this._fns.reduce(function (done, fn) {
	    if (fn.or) done = done || fn.or();
	    if (fn.and) done = done && fn.and();
	    return done;
	}, this.done);
    }
}), when, whenNot;

Quest.all = {};

Loadable.setup(Quest, {
    file: 'quests',
    defaults: {
	id: '',
	depends: [],
	done: false,
	goal: null
    },
    process: function (quests) {
	quests.each(function (quest) {
	    new Quest(quest);
	});
	Object.each(Quest.all, function (quest) {
	    quest.depends = quest.depends.map(function (q) typeof q == 'string' ? Quest.all[q] : q);
	});
    }
});

function fromId(id) {
    if (typeof id == 'string')
	return Quest.all[id];
    return id;
}

function isFinished(id) {  // This exists in addition to Quest#isFinished basically to simulate multimethods
    if (typeOf(id) == 'array')
        return id.every(function (q) fromId(q).isFinished());
    return fromId(id).isFinished();
}

function finish(id) {
    if (typeOf(id) == 'array')
        return id.map(function (q) fromId(q).finish());
    return fromId(id).finish();
}

function conditionalExecute(test) {
    return function (quest, trueFn, falseFn) {
	return function () {
	    if (test(quest))
		return trueFn.apply(this, arguments);
	    return falseFn ? falseFn.apply(this, arguments) : void 0;
	}
    }
}
when = conditionalExecute(isFinished);
whenNot = conditionalExecute(function (q) !isFinished(q));


Goal.talkTo = function (map, person) {
    var done = false;
    Arq.map(map).enter.add(function (self) {
        self[person].talk.add(function () done = true); // Also removes from the HookList
        return true;
    });
    return new Goal(function () done);
};

Goal.goTo = function (map, targetEntrance) {
    var done = false;

    if (targetEntrance) {
	Arq.getModule('teleport').after.add(function (mapName, oldMap, entrance) {
	    return done = mapName == map && entrance == targetEntrance;
	});
	return new Goal(function () done);
    }
    else
	return new Goal(function () Arq.map(map).visited);
};

Goal.done = function () new Goal(function () true);

Quest.addSymbol('Goal', Goal);
['talkTo', 'goTo', 'done'].each(function (goal) {
    Quest.addSymbol(goal, Goal[goal]);
});


exports.Quest = Quest;
exports.Goal = Goal;
exports.isFinished = isFinished;
exports.finish = finish;
exports.when = when;
exports.whenNot = whenNot;

exports.init = function () {
    Arq.hooks.init.add(Quest.load);

    var symbols = {
	when: when,
	whenNot: whenNot,
	finish: finish,
	isFinished: isFinished
    };

    Arq.addMapSymbols(symbols);

    ['zone', 'trigger', 'time', 'dialogue'].each(function (name) {
	if (Arq.hasModule(name))
	    Arq.getModule(name).addSymbols(symbols);
    });
};

exports.load = finish;  // Since we save as an array of finished ids, which `finish` accepts
exports.save = function () {
    return Object.keys(Quest.all).filter(function (id) isFinished(Quest.all[id]));
};

Loadable.addSymbolMethods(exports, Quest);
