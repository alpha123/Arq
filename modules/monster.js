var {Loadable} = require('Arq/loadable'), {HookList} = require('hook-list'),
{Item, loadItems} = require('Arq/battle-system/item'), {Ability} = require('Arq/battle-system/ability'),
{Spritesets} = require('Arq/resources'), {Entity, entityLoadableDefaults} = require('Arq/battle-system/entity'),
{AI} = require('Arq/battle-system/ai'), {StatusType} = require('Arq/battle-system/status-type'),
Monster = new Class({
    Implements: [Entity, Loadable],

    initialize: function (options, skip) {
	this.options = options;
	this.newLoadable(options);
	this.initEntity();

	if (this.status == null)
	    this.status = StatusType.all.normal;

	if (!skip)
	    Monster.all[this.name] = this;
    },

    clone: function () {
	return new Monster(this.options, true);
    }
});

Monster.all = {};

Loadable.setup(Monster, {
    file: 'monsters',
    requires: [AI, StatusType],
    defaults: Object.merge(entityLoadableDefaults, {ai: null}),
    process: Loadable.arrayProcessor(Monster)
});

exports.init = function () {
    Arq.hooks.init.add(function () {
	[Item, Ability, Monster].invoke('load');
    });
};

exports.Monster = Monster;
Loadable.addSymbolMethods(exports, Monster);
