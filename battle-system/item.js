var {Loadable} = require('Arq/loadable'), {Spritesets} = require('Arq/resources'),
{Animation} = require('Arq/animation'), {ItemType} = require('Arq/battle-system/item-type'),
{AttackType} = require('Arq/battle-system/attack-type'), Item = new Class({
    Implements: Loadable,

    initialize: function (options) {
	this.newLoadable(options);
	this.spriteset = Spritesets.Items[this.name.toLowerCase().camelCase()];
	this.animation = this.animation ? Spritesets.Animations[this.animation] : null;
	Item.all[this.name] = this;
    },

    getAnimation: function (direction) {
	return this.animation && new Animation(this.animation, direction);
    }
});

Item.all = {};

Loadable.setup(Item, {
    file: 'items',
    requires: [ItemType, AttackType],
    defaults: {
	name: '',
	description: '',
	price: 0,
	weight: 0,
	type: null,
	attack: null,
	animation: '',
	power: 0,
	range: -1,
	ammo: -1
    },
    process: Loadable.arrayProcessor(Item)
});

exports.Item = Item;
Loadable.addSymbolMethods(exports, Item);

function itemName(nameOrItem) {
    return typeof nameOrItem == 'string' ? nameOrItem : nameOrItem.name;
}
exports.itemName = itemName;
exports.itemMethods = {
    amountOf: function (name) this.items.has(name) ? this._items[itemName(name)].amount : 0,
    has: function (name) !!this._items[itemName(name)] && this._items[itemName(name)].amount > 0,
    isEmpty: function () !Object.getLength(this._items),
    add: function (name, amount) {
	name = itemName(name);
	if (amount == null) amount = 1;

	if (this.items.has(name))
	    this._items[name].amount += amount;
	else
	    this._items[name] = {item: Item.all[name], amount: amount};

	if (this.fireEvent)
	    this.fireEvent('addItem', [Item.all[name], this._items[name].amount - amount, this._items[name].amount]);
	return this.items;
    },
    remove: function (name, amount) {
	name = itemName(name);
	if (amount == null) amount = 1;

	var oldAmount = this.items.amountOf(name);
	if (this.items.has(name) && (this._items[name].amount -= amount) < 1)
	    delete this._items[name];

	if (this.fireEvent)
	    this.fireEvent('removeItem', [Item.all[name], oldAmount, this.items.amountOf(name)]);
	return this.items;
    }
};
