var {PartyMember} = require('Arq/modules/party'),
statusTypes = require('Arq/battle-system/status-type').StatusType.all,
{itemMethods} = require('Arq/battle-system/item');

exports.BattleController = new Class({
    Implements: Events,

    _items: {},
    expGain: 0,
    cashGain: 0,

    initialize: function (party, monsters) {
	this.party = party;
	this.initialActiveMember = this.activeMember = PartyMember.objectFindFirstByIsInput(party, true);
	this.aliveMembers = Object.keys(party).filter(function (m) party[m].status != statusTypes.unconscious).length;
	this.monsters = this.processMonsters(Array.from(monsters));
	this.allMonsters = this.monsters.map(function (m) m);  // MooTools Array#clone does a deep copy :-/

	this.items = Object.bindAll(itemMethods, this);
	this.items.all = this._items;

	if (this.aliveMembers == 0)
	    this.finish();

	Object.each(party, function (member) {
	    member.hp.addEvent('zero', function () {
		member.status = statusTypes.unconscious;
		if (--this.aliveMembers == 0)
		    this.finish(false);
	    }.bind(this));
	}, this);
    },

    processMonsters: function (monsters) {
	monsters.each(function (monster) {
	    monster.hp.addEvent('zero', function () {
		this.monsters.erase(monster);

		if (!this.monsters.length)
		    this.finish(true);
	    }.bind(this));
	}, this);
	return monsters;
    },

    addMonsters: function (monsters) {
	monsters = this.processMonsters(Array.from(monsters));
	this.monsters.append(monsters);
	this.allMonsters.append(monsters);
	return this;
    },

    setActivePartyMember: function (member) {
	this.activeMember = member;
	member.setInput();
	return this;
    },

    freshPersonName: function (base) {
	var people = GetPersonList(), num = 0;
	while (people.contains(base + num)) ++num;
	return base + num;
    },

    useItem: function (user, item) {
	var itemPerson = this.freshPersonName(item.name), data = {};
	// `data` is an object that the ItemType methods can store arbitrary information in.
	user.items.remove(item);
	item.type.moveStart(item, itemPerson, data, user);
	if (!item.type.skipDefaultMove) {
	    UpdateHooks.add(function () {
		var target = item.type.isObstructed(item, itemPerson, data, user);
		// `target` is:
		// boolean true: obstructed, but not by person
		// any string: obstructing person
		// anything else: not obstructed
		if (target === true) {
		    item.type.moveEnd(item, itemPerson, data, user);
		    return true;
		}
		else if (typeof target == 'string') {
		    item.type.moveEnd(item, itemPerson, data, user);
		    if (Arq.person(target).monsterInstance)
			item.type.onHit(item, user, Arq.person(target).monsterInstance);
		    return true;
		}

		item.type.move(item, itemPerson, data, user);
	    });
	}
	return this;
    },

    useWeapon: function (user) {
	if (user.equipment.weapon)
	    this.useItem(user, user.equipment.weapon);
	return this;
    },

    finish: function (won) {
	this.initialActiveMember.setInput();
	this.fireEvent('finish');
	if (won)
	    this.handleWin();
	else
	    this.handleLoss();
	return this;
    },

    handleWin: function () {
	Object.each(this.party, function (m) { m.experience += this.expGain; }, this);
	if (Arq.hasModule('cash'))
	    Arq.getModule('cash').cash += this.cashGain;
	this.fireEvent('win', [this.expGain, this.cashGain, this.items]);
	return this;
    },

    handleLoss: function () {
	var expLoss = this.monsters.reduce(function (a, b) a + b.experience, 0);
	Object.each(this.party, function (m) { m.experience -= expLoss; });
	this.fireEvent('lose', expLoss);
	return this;
    }
});
