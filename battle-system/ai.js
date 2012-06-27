var {Loadable} = require('Arq/loadable'), {moveDirection} = require('Arq/movement'),
AI = new Class({
    Implements: Loadable,

    initialize: function (options) {
	this.newLoadable(options);
    },

    start: function (name, others) {
	this.mapName = name;
	this.others = others;
	this.boundUpdate = this.update.bind(this, name, others);
	UpdateHooks.add(this.boundUpdate);
	this.onStart(name, others);
	return this;
    },

    stop: function () {
	UpdateHooks.remove(this.boundUpdate);
	this.onStop();
	return this;
    },

    move: function (direction, tiles) {
	moveDirection(this.mapName, direction, tiles);
	return this;
    }
});

AI.all = {};

Loadable.setup(AI, {
    file: 'ai-types',
    defaults: {
	onStart: function (name, others) { },
	onStop: function () { },
	update: function (name, others) { }
    },
    process: Loadable.arrayProcessor(AI)
});

exports.AI = AI;
