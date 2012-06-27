var {Loadable} = require('Arq/loadable'), AttackType = new Class({
    Implements: Loadable,

    initialize: function (options) {
	this.newLoadable(options);
	AttackType.all[this.name] = function () {
	    return Object.merge(this, this.create.apply(this, arguments));
	}.bind(this);
    }
});

AttackType.all = {};

Loadable.setup(AttackType, {
    file: 'attack-types',
    defaults: {
	name: '',
	create: function () { },
	use: function (thing, user, target) { },
	undoUse: function (thing, user, target) { }
    },
    process: Loadable.arrayProcessor(AttackType)
});

exports.AttackType = AttackType;
Loadable.addSymbolMethods(exports, AttackType);
