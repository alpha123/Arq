var {PartyMember} = require('Arq/modules/party'),
statusTypes = require('Arq/battle-system/status-type').StatusType.all,
{Menu} = require('Arq/controls/menu'),
floor = Math.floor,
hudFont = require('Arq/resources').Fonts.standard,
hudColor = CreateColor(255, 255, 255, 180),  // trans-white
black = CreateColor(0, 0, 0), red = CreateColor(255, 0, 0), green = CreateColor(0, 255, 0),
white = CreateColor(255, 255, 255), transparent = CreateColor(0, 0, 0, 0),
screenWidth = GetScreenWidth(),
screenHeight = GetScreenHeight(),
partySelectWidth = floor(screenWidth * 0.1),
partySelectOffset = floor(screenHeight * 0.05),
itemListTop = screenHeight - floor(screenHeight * 0.4),
itemListWidth = floor(screenWidth * 0.25),
itemListHeight = screenHeight - itemListTop,
itemListOffset = floor(itemListHeight * 0.02);

exports.hudFont = hudFont;
exports.hudColor = hudColor;

exports.HUD = new Class({
    Implements: Events,

    initialize: function (party) {
	this.boundUpdate = this.update.bind(this);
	this.boundRender = this.render.bind(this);

	this.partySelect = this.createPartySelect(party);
	this.buildItemList(PartyMember.objectFindFirstByIsInput(party, true));

	PartyMember.hooks.setInput.add(this.buildItemList.bind(this));
	Object.each(party, function (member) {
	    member.addEvent('addItem', this.buildItemList.bind(this, member));
	    member.addEvent('removeItem', this.buildItemList.bind(this, member));
	}, this);
    },

    createPartySelect: function (party) {
	var partySelect = new Menu({
	    x: screenWidth - partySelectWidth,
	    y: 0,
	    width: partySelectWidth,
	    height: screenHeight,
	    showArrow: false,
	    bumpSelection: true,
	    onSelectionChange: function () { this.items[this.selection].onSelection.call(this); }
	});
	partySelect.addDefaultKeys(KEY_A, KEY_S, null, null, KEY_U);
	partySelect.preRender.add(function () {
	    Rectangle(screenWidth - partySelectWidth, 0, partySelectWidth, screenHeight, hudColor);
	});
	Object.each(party, function (member) {
	    var zoom = +((partySelectWidth - floor(partySelectWidth / 4)) / member.portrait.width).toFixed(1),
	        x = screenWidth - partySelectWidth + (partySelectWidth - member.portrait.width * zoom) / 2 + 1,
	        y = partySelect.nextY() + partySelectOffset / (partySelect.items.length ? 1 : 2);
	    partySelect.add({
		x: x,
		y: y,
		width: member.portrait.width * zoom,
		height: member.portrait.height * zoom,
		item: {zoom: zoom, name: member.name},
		render: function () {
		    var portrait = CreateSurface(member.portrait.width * zoom, member.portrait.height * zoom + 14, transparent);
		    member.status.render(portrait, member.portrait, 0, 0, this.item.zoom, this.item.name);
		    portrait.outlinedRectangle(0, portrait.height - 11, portrait.width, 10, black, 1);
		    portrait.rectangle(1, portrait.height - 10, member.hp.current / member.hp.max * (portrait.width - 2), 8,
				       member.hp.current < member.hp.max / 3 ? red : green);
		    portrait.blit(this.x, this.y);
		},
		highlightRender: function () {
		    Rectangle(screenWidth - partySelectWidth, this.y - partySelectOffset / 2 + 6, partySelectWidth,
			      this.height + partySelectOffset, hudColor);
		    this.render();
		},
		onSelection: function () { this.fireEvent('selectPartyMember', member); }.bind(this),
		isSelectable: function () member.status != statusTypes.unconscious
	    });
	}, this);
	return partySelect;
    },

    createItemList: function (member) {
	var itemList = new Menu({
	    x: floor(screenWidth * 0.02) - GetSystemArrow().width,
	    y: itemListTop + itemListOffset,
	    width: itemListWidth,
	    height: itemListHeight - itemListOffset * 2,
	    font: hudFont,
	    color: black,
	    highlightColor: red,
	    showArrow: false,
	    escapeable: function () false
	});
	itemList.addDefaultKeys(KEY_D, KEY_F, null, null, KEY_CTRL);
	itemList.preRender.add(function () {
	    Rectangle(0, itemListTop, itemListWidth, itemListHeight, hudColor);
	});
	Object.each(member.items.all, function (item) {
	    if (item.item.type.canBattle || item.item.type.canUse) {
		itemList.addText(item.item.name + ' x' + item.amount, function () {
		    this.fireEvent('selectItem', item.item);
		}.bind(this));
	    }
	}, this);
	return itemList;
    },

    buildItemList: function (member) {
	var itemList = this.createItemList(member);
	if (this.itemList)
	    itemList.selection = this.itemList.selection.limit(0, itemList.items.length - 1);
	this.itemList = itemList;
	return this;
    },

    update: function () {
	this.partySelect.update();
	this.itemList.update();
    },

    render: function () {
	this.partySelect.render();
	if (this.itemList.items.length)
	    this.itemList.render();
	else {
	    this.itemList.preRender();
	    hudFont.setColorMask(black);
	    hudFont.drawText(floor(screenWidth * 0.05), itemListTop + floor(itemListHeight * 0.05), 'No items');
	    hudFont.setColorMask(white);
	}
    },

    show: function () {
	UpdateHooks.add(this.boundUpdate);
	RenderHooks.add(this.boundRender, -10);
    },

    hide: function () {
	UpdateHooks.remove(this.boundUpdate);
	RenderHooks.remove(this.boundRender);
    }
});
