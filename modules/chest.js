var {window} = require('Arq/text-system'),
{Item} = require('Arq/battle-system/item'),
party = require('Arq/modules/party').PartyMember.active;

function processItems(items) {
    var values = Object.values(items);
    return Object.keys(items).map(function (name, index) {
	return {item: Item.all[name], amount: values[index]};
    });
}

function itemText(item) {
    if (item.item == '$' && Arq.hasModule('cash')) return '$' + item.amount;

    if (item.amount > 1)
	return item.amount + ' ' + (item.item.plural ? item.item.plural : item.item.name + 's');

    return item.item.singular ? item.item.singular : ('aeiou'.contains(item.item.name[0].toLowerCase()) ? 'an ' : 'a ') + item.item.name;
}

function acquireText(items) {
    if (items.length > 1) {
	var texts = items.map(itemText);
	return 'You found ' + texts.slice(0, -1).join(', ') + ' and ' + texts.getLast();
    }
    return 'You found ' + itemText(items[0]);
}

function chest(items, text) {
    items = processItems(items);
    if (text == null) text = acquireText(items);

    return {
	items: items,
	text: text,
	opened: false,
	create: function (self) {
	    SetPersonDirection(GetCurrentPerson(), self.opened ? 'opened' : 'unopened');
	},
	talk: function (self) {
	    if (!self.opened) {
		self.items.each(function (item) {
		    if (item.item == '$' && Arq.hasModule('cash'))
			Arq.getModule('cash').cash += item.amount;
		    else
			Object.values(party)[0].items.add(item.item, item.amount);
		});
		window(self.text);
		self.opened = true;
		self.create(self);
	    }
	},
	load: function (saved, self) {
	    self.opened = saved.opened;
	},
	save: function (self) {
	    Arq.logDebug('saving; opened: ' + self.opened);
	    return {opened: self.opened};
	}
    };
}

exports.init = function () {
    Arq.addMapSymbol('chest', chest);
};

exports.chest = chest;
exports.acquireText = acquireText;
exports.itemText = itemText;
