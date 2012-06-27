var Loadable = require('Arq/loadable').Loadable,
Spritesets = require('Arq/resources').Spritesets,
Ability = new Class({
    Implements: Loadable,

    initialize: function (options) {
	this.newLoadable(options);
	this.spriteset = Spritesets.Abilities[this.name];

	this._use = this.use;
	this.use = function (target, user) {
	    user.ap -= this.apCost;
	    this._use.apply(this, arguments);
	}.bind(this);

	Ability.all[this.name] = this;
    }
});

Ability.all = {};

Loadable.setup(Ability, {
    file: 'abilities',
    defaults: {
	name: '',
	apCost: 0,
	stat: '',
	use: function (target, user) { }
    },
    process: Loadable.arrayProcessor(Ability)
});

exports.Ability = Ability;
Loadable.addSymbolMethods(exports, Ability);
