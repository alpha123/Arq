var {Loadable} = require('Arq/loadable'), {HookList} = require('Arq/hook-list'),
{Item} = require('Arq/battle-system/item'), {Ability} = require('Arq/battle-system/ability'),
{Spritesets, Images} = require('Arq/resources'), {Entity, entityLoadableDefaults} = require('Arq/battle-system/entity'),
{StatusType} = require('Arq/battle-system/status-type'), PartyMember = new Class({
    Implements: [Entity, Loadable],

    initialize: function (options) {
	this.newLoadable(options);
	this.spriteset = this.mapName = this.name.toLowerCase();
	this.initEntity();
	this.originalSpriteset = this.spriteset;

	this.nextNext = +(2.1 - +('0.' + (this.level - 1))).max(1.05).toFixed(2);
	this._experience = this.experience;
	this.__defineGetter__('experience', (function () this._experience).bind(this));
	this.__defineSetter__('experience', function (newExp) {
	    var old = this._experience;
	    this._experience = newExp;
	    this.fireEvent('changeExperience', [old, this._experience]);
	    if (newExp >= this.nextLevelExperience)
		this.levelUp();
	}.bind(this));

	this.portrait = Images.Portraits[this.mapName];

	PartyMember.all[this.name] = this;
	PartyMember.hooks.init(this);
	if (this.isInput)
	    PartyMember.hooks.setInput(this);
	if (this.isActive) {
	    this.isActive = false;  // Kinda hacky, force activation
	    this.activate();
	}
    },

    activate: function () {
	if (!this.isActive) {
	    this.isActive = true;
	    PartyMember.active[this.name] = this;
	    PartyMember.hooks.activate(this);
	    this.fireEvent('activate');
	}
	return this;
    },

    deactivate: function () {
	if (this.isActive) {
	    this.isActive = false;
	    delete PartyMember.active[this.name];
	    PartyMember.hooks.deactivate(this);
	    this.fireEvent('deactivate');
	}
	return this;
    },

    setInput: function () {
	Object.each(PartyMember.all, function (m) { m.isInput = false; });
	this.isInput = true;
	PartyMember.hooks.setInput(this);
	return this;
    },

    levelUp: function () {
	if (this.level < (this.maxLevel > 0 ? this.maxLevel : Infinity)) {
	    ++this.level;
	    this.nextNext = +(this.nextNext - 0.1).max(1.1).toFixed(1);
	    this.nextLevelExperience = Math.floor(this.nextLevelExperience * this.nextNext);
	    this.fireEvent('levelUp', this.level);
	}
	return this;
    }
});

PartyMember.all = {};
PartyMember.active = {};
PartyMember.hooks = {init: HookList(), activate: HookList(), deactivate: HookList(), setInput: HookList()};

Loadable.setup(PartyMember, {
    file: 'party',
    requires: StatusType,
    defaults: Object.merge({
	level: 1,
	maxLevel: 50,
	nextLevelExperience: 100,
	isInput: false,
	isActive: false
    }, entityLoadableDefaults),
    process: Loadable.arrayProcessor(PartyMember)
});

exports.init = function () {
    Arq.hooks.init.add(function () {
	[Item, Ability, PartyMember].invoke('load');
    });
};

exports.PartyMember = PartyMember;
Loadable.addSymbolMethods(exports, PartyMember);
