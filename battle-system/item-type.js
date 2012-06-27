var {Loadable} = require('Arq/loadable'), {Spritesets} = require('Arq/resources'),
ItemType = new Class({
    Implements: Loadable,

    initialize: function (options) {
	this.newLoadable(options);
	ItemType.all[this.name] = this;
    }
});

ItemType.all = {};

Loadable.setup(ItemType, {
    file: 'item-types',
    defaults: {
	name: '',
	canBattle: false,
	canUse: false,
	equip: '',
	skipDefaultMove: false,
	moveStart: function (item, itemPerson, data, user) { },
	move: function (item, itemPerson, data, user) { },
	moveEnd: function (item, itemPerson, data, user) { },
	isObstructed: function (item, itemPerson, data, user) { },
	onHit: function (item, user, target) { item.attack.use(item, user, target); },
	onEquip: function (item, user) { },
	onUnequip: function (item, user) { }
    },
    process: Loadable.arrayProcessor(ItemType)
});

exports.ItemType = ItemType;
Loadable.addSymbolMethods(exports, ItemType);
