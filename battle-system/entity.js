var {Stat} = require('Arq/battle-system/stat'), {Ability} = require('Arq/battle-system/ability'),
{Item, itemMethods} = require('Arq/battle-system/item'), {Spritesets} = require('Arq/resources'),
statusTypes = require('Arq/battle-system/status-type').StatusType.all;

exports.Entity = new Class({
    Implements: Events,

    initEntity: function () {
	['hp', 'speed', 'stamina', 'strength', 'toughness', 'accuracy', 'agility'].each(function (stat) {
	    this[stat] = new Stat(this[stat], this[stat]);
	}, this);

	this.abilities = this.abilities.map(function (a) Ability.all[a]).associate(this.abilities);

	this._items = Object.map(this.items, function (amount, name) {
	    return {item: Item.all[name], amount: amount};
	});
	this.items = Object.bindAll(itemMethods, this);
	this.items.all = this._items;

	this.addEvent('removeItem', function (item, oldAmount, newAmount) {
	    Object.each(this.equipment, function (equip, type) {
		if (equip == item && newAmount < 1)
		    this.equipment[type] = null;
	    }, this);
	}.bind(this));

	function createEquipment(self, equipmentNames) {
	    var items = Object.map(equipmentNames, function (name) Item.all[name]), equipment = {};
	    ['head', 'armor', 'weapon', 'feet', 'other'].each(function (type) {
		equipment.__defineGetter__(type, function () items[type]);
		equipment.__defineSetter__(type, function (newItem) {
		    var oldItem = items[type];
		    items[type] = newItem;
		    this.fireEvent('changeEquipment', [newItem, oldItem, type]);
		    this.fireEvent('change' + type.capitalize(), [newItem, oldItem]);
		    if (oldItem)
			oldItem.type.onUnequip(oldItem, this);
		    if (newItem)
			newItem.type.onEquip(newItem, this);
		}.bind(this));
	    }, self);
	    return equipment;
	}

	this.equipment = createEquipment(this, this.equipment);

	this._status = this.status ? this.status : statusTypes.normal;
	this._status.onSet(this);
	this.__defineGetter__('status', (function () this._status).bind(this));
	this.__defineSetter__('status', function (newStatus) {
	    var oldStatus = this._status;
	    oldStatus.onUnset(this);
	    this._status = newStatus;
	    newStatus.onSet(this);
	    this.fireEvent('changeStatus', [newStatus, oldStatus]);
	}.bind(this));

	this._spriteset = Object.get(Spritesets, this.spriteset);
	this.__defineGetter__('spriteset', (function () this._spriteset).bind(this));
	this.__defineSetter__('spriteset', function (newSpriteset) {
	    var oldSpriteset = this._spriteset;
	    this._spriteset = newSpriteset;
	    this.fireEvent('changeSpriteset', [newSpriteset, oldSpriteset]);
	}.bind(this));
    }
});

exports.entityLoadableDefaults = {
    name: '',
    spriteset: '',
    hp: 100,
    experience: 0,
    status: null,
    speed: 1,
    stamina: 1,
    strength: 1,
    toughness: 1,
    accuracy: 1,
    agility: 1,
    abilities: [],
    items: {},
    equipment: {}
};
