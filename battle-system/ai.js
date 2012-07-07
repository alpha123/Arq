var {Loadable} = require('Arq/loadable'), {moveDirection, moveToward} = require('Arq/movement'),
AI = new Class({
    Implements: Loadable,

    initialize: function (options) {
	this.newLoadable(options);
	AI.all[this.name] = this;
    },

    start: function (name, battle) {
	this.mapName = name;
	this.battle = battle;
	this.boundUpdate = this.update.bind(this, name, battle);
	UpdateHooks.add(this.boundUpdate);
	this.onStart(name, battle);
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
    },

    moveToward: function (target, tiles, callback) {
	moveToward(this.mapName, target, tiles, false, callback);
	return this;
    },

    otherCombatants: function () {
	var others = [this.battle.activeMember.mapName];
	this.battle.monsters.each(function (monster) {
	    if (monster.ai.mapName != this.mapName)
		others.push(monster.ai.mapName);
	}, this);
	return others;
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
Loadable.addSymbolMethods(exports, AI);
