var {Menu} = require('Arq/controls/menu'), {Fonts} = require('Arq/resources'),
{lighten} = require('Arq/color'), {mainColor} = require('Arq/image'),
transBlack = CreateColor(0, 0, 0, 180),
screenWidth = GetScreenWidth(), screenHeight = GetScreenHeight(),
centerScreenWidth = screenWidth - Math.floor(screenWidth * 0.025),
screenMargin = (screenWidth - centerScreenWidth) / 2,
memberMenuWidth = Math.floor(centerScreenWidth / 4);

exports.PauseScreen = new Class({
    initialize: function (party) {
	this.party = party;
    },

    show: function () {
	var menu = this.createMenu(this.party);
	this.background = GrabImage(0, 0, screenWidth, screenHeight);
	menu.slide(-menu.getWidth() - 10, menu.y, menu.x, menu.y, 300);
	menu.execute();
	menu.slide(menu.y, menu.x, screenWidth + 10, menu.y, 300);
    },

    createMenu: function (party) {
	var menu = new Menu({
	    width: centerScreenWidth,
	    height: screenHeight,
	    horizontal: true,
	    vertical: false,
	    color: CreateColor(140, 140, 140),
	    highlightColor: CreateColor(255, 255, 255),
	    showArrow: false
	});

	function getImage(spriteset) {
	    var image = spriteset.images[spriteset.directions.find(function (d) d.name == 'south').frames[0].index];
	    return [image, (+(centerScreenWidth / (image.width * Object.getLength(party))).toFixed(2) - 2.5).max(1)];
	}

	Object.each(party, function (member) {
	    var [image, zoom] = getImage(member.spriteset), menuItem;

	    menu.addImage({
		image: image,
		zoom: zoom,
		memberName: member.name,
		action: this.displayMemberMenu.bind(this, menu, member)
	    });
	    menuItem = menu.items.getLast();
	    menuItem.x = screenWidth / 2 + screenMargin - image.width * zoom + image.width * zoom * menu.items.indexOf(menuItem);
	    menuItem.y = screenHeight / 2 - image.height * zoom / 2;

	    member.addEvent('changeSpriteset', function (newSpriteset) {
		[image, zoom] = getImage(newSpriteset);
		menuItem.item.image = image;
		menuItem.item.zoom = zoom;
	    });
	}, this);

	menu.addText({
	    text: 'Exit game',
	    font: Fonts.latoBold,
	    zoom: +(screenMargin / 8).toFixed(2),
	    action: function () {
		menu.done = true;
		Arq.hooks.end.add(RestartGame);
		Arq.save();
		ExitMapEngine();
	    }
	});
	menu.items.getLast().x = screenMargin / 2;
	menu.items.getLast().y = screenMargin;

	menu.preRender.add(function () {
	    this.background.blit(0, 0);
	    Rectangle(0, 0, screenWidth, screenHeight, transBlack);
	}.bind(this));

	return menu;
    },

    createMemberMenu: function (member) {
	var menu = new Menu({
	    x: screenWidth / 2 + screenMargin - memberMenuWidth / 2,
	    width: memberMenuWidth,
	    font: Fonts.latoBold,
	    zoom: +(memberMenuWidth / 100).toFixed(2),
	    highlightColor: this.memberColor,
	    showArrow: false
	});

	menu.addText('Stats', this.displayStats.bind(this, menu, member));
	if (!member.items.isEmpty()) {
	    menu.addText('Items', this.displayItemMenu.bind(this, menu, member));
	    menu.addText('Equipment', this.displayEquipmentMenu.bind(this, menu, member));
	}

	return menu;
    },

    displayMemberMenu: function (parent, member) {
	var memberItem = parent.items.find(function (i) i.item.memberName == member.name), render = memberItem.render,
	    {image, zoom} = memberItem.item, memberMenu, x, y;

	this.memberColor = lighten(mainColor(image), 0.2);

	memberMenu = this.createMemberMenu(member);
	x = screenWidth / 2 + screenMargin + memberMenu.getWidth() / 2, sx = memberItem.x + GetSystemArrow().width;
	y = memberItem.y, parentX = parent.x;

	member.addEvent('changeSpriteset', function () {
	    image = memberItem.item.image;
	    zoom = memberItem.item.zoom;
	});

	memberItem.render = function () { };
	parent.slide(parent.x, parent.y, screenWidth + 10, parent.y, 300, function (timePassed) {
	    image.zoomBlit(sx + timePassed / 300 * (x - sx), y, zoom);
	});

	memberMenu.y = y;
	memberMenu.height = image.height * zoom;
	memberMenu.preRender.add(function () {
	    parent.preRender();
	    image.zoomBlit(x, y, zoom);
	});
	memberMenu.zoomInOut(0, memberMenu.items[0].item.zoom, 200);
	memberMenu.execute();
	memberMenu.zoomInOut(memberMenu.items[0].item.zoom, 0, 200);

	parent.slide(parent.x, parent.y, parentX, parent.y, 300, function (timePassed) {
	    image.zoomBlit(x + timePassed / 300 * (sx - x), y, zoom);
	});
	memberItem.render = render;
    },

    displayStats: function (parent, member, skipLoop) {
	var stats = Object.filter(member, function (stat) {
	    return stat && typeof stat.current == 'number' && typeof stat.max == 'number';
	}), font = Fonts.latoBold, {x, y} = parent.items[0], {zoom} = parent.items[0].item,
	    thisY, thisZoom, nameHeight = font.getStringHeight(member.name, font.getStringWidth(member.name)) * zoom,
	    statusText = 'status: ' + member.status.name, levelText = 'level: ' + member.level,
	    expText = 'experience: ' + member.experience + '/' + member.nextLevelExperience;

	parent.zoomInOut(zoom, 0, 200);

	do {  // Hey look! I actually used a do-while loop!
	    parent.preRender();
	    thisZoom = (zoom - 0.5).max(0.7);
	    thisY = y - nameHeight;
	    font.drawZoomedText(x, thisY, zoom, member.name);
	    thisY += nameHeight;
	    [statusText, levelText, expText].each(function (text) {
		font.drawZoomedText(x, thisY, thisZoom, text);
		thisY += font.getStringHeight(text, font.getStringWidth(text)) * thisZoom + 1;
	    });
	    Object.each(stats, function (stat, name) {
		var current = stat.current.toFixed(2), text, width;
		3..times(function () { if (['0', '.'].contains(current.slice(-1))) current = current.slice(0, -1); });
		text = name + ': ' + current + '/' + stat.max;
		width = font.getStringWidth(text);
		font.drawZoomedText(x, thisY, thisZoom, text);
		thisY += font.getStringHeight(text, width) * thisZoom + 1;
	    });
	    if (!skipLoop)
		FlipScreen();
	} while (!skipLoop && !IsKeyPressed(KEY_ESCAPE));
	while (!skipLoop && AreKeysLeft()) GetKey();

	parent.zoomInOut(0, zoom, 200);
    },

    createItemMenu: function (member, x, y, width, height, zoom, parent) {
	// This is among the ugliest code I've ever written. I don't know what came over me.
	// Good luck reading it.

	var menu = new Menu({
	    x: x,
	    y: y,
	    width: width,
	    height: height,
	    font: Fonts.latoBold,
	    zoom: zoom,
	    highlightColor: this.memberColor,
	    showArrow: false,
	    bumpSelection: true,
	    highlightUnfocused: true
	}), submenu = new Menu({
	    y: y,
	    width: width,
	    height: height,
	    font: Fonts.latoBold,
	    zoom: (zoom - 0.5).max(0.7),
	    highlightColor: this.memberColor,
	    showArrow: false,
	    hasKeyFocus: false
	}), updateSubmenu = submenu.update.bind(submenu),
	    renderSubmenu = submenu.render.bind(submenu);

	function createMenuItems() {
	    menu.items = [];
	    if (member.items.isEmpty()) {
		menu.addText({
		    text: 'No items',
		    isSelectable: function () false
		});
		menu.postUpdate.remove(updateSubmenu);
		menu.postRender.remove(renderSubmenu);
		menu.removeEvent('selectionChange', doChangeSelection);
		menu.hasKeyFocus = true;
		2..times(parent.items.pop.bind(parent.items));
		parent.selection = 0;
	    }
	    else {
		Object.each(member.items.all, function (item, name) {
		    menu.addText({
			text: name + ' x' + item.amount,
			itemObject: item.item,
			itemImage: item.item.spriteset.images[item.item.spriteset.directions.find(function (d) d.name == 'image').frames[0].index],
			action: function () {
			    menu.hasKeyFocus = false;
			    submenu.hasKeyFocus = true;
			    while (AreKeysLeft()) GetKey();
			},
			color: item.item.type.canUse ? menu.color : menu.unselectableColor,
			highlightColor: item.item.type.canUse ? menu.highlightColor : menu.unselectableColor
		    });
		});
	    }
	    submenu.x = x + menu.getWidth() / 2;
	    submenu.items.each(function (i) { i.x = x + menu.getWidth() / 2; });
	}
	createMenuItems();

	function recreateMenuItems(item) {
	    createMenuItems();
	    if (!member.items.has(item) || !menu.items[menu.selection]) {
		submenu.selection = menu.selection = 0;
		menu.fireEvent('selectionChange', [0, 0]);
	    }
	}

	function useItem() {
	    var item = menu.items[menu.selection].item.itemObject;
	    if (item.type.canUse) {
		item.attack.use(item, member, member);
		member.items.remove(item);
		recreateMenuItems(item);
	    }
	}
	Object.each(this.party, function (target, name) {
	    if (name != member.name) {
		submenu.addText('Give to ' + name, function () {
		    var item = menu.items[menu.selection].item.itemObject;
		    member.items.remove(item);
		    target.items.add(item);
		    recreateMenuItems(item);
		});
	    }
	});

	function addUseItem() {
	    submenu.addText('Use', useItem);
	    submenu.items.unshift(submenu.items.pop());
	    submenu.items[0].y -= submenu.items.slice(1).pluck('height').reduce(function (a, b) a + b);
	    submenu.items.slice(1).each(function (i) { i.y += submenu.items[0].height; });
	}

	submenu.addDefaultKeys();
	function giveMenuFocus() {
	    submenu.hasKeyFocus = false;
	    menu.hasKeyFocus = true;
	    while (AreKeysLeft()) GetKey();
	}
	submenu.addKey(KEY_LEFT, giveMenuFocus);
	submenu.addKey(KEY_ESCAPE, giveMenuFocus);

	function doChangeSelection(oldSelection, selection) {
	    if (menu.items[menu.selection].item.itemObject.type.canUse && submenu.items[0].item.text != 'Use')
		addUseItem();
	    else {
		if (submenu.items[0].item.text == 'Use')
		    submenu.remove(0);
	    }
	    submenu.slide(submenu.x, submenu.y, submenu.x, menu.items[selection].y, 150, function () {
		menu.render();
	    });
	    while (AreKeysLeft()) GetKey();
	}

	menu.addDefaultKeys();
	menu.addKey(KEY_RIGHT, function () {
	    menu.hasKeyFocus = false;
	    submenu.hasKeyFocus = true;
	});

	menu.preRender.add(function () {
	    if (!member.items.isEmpty())
		menu.items[menu.selection].item.itemImage.zoomBlit(screenMargin, screenMargin, screenMargin / 4);
	});
	if (!member.items.isEmpty()) {
	    menu.postUpdate.add(updateSubmenu);
	    menu.postRender.add(renderSubmenu);
	    menu.addEvent('selectionChange', doChangeSelection);
	    if (menu.items[0].item.itemObject.type.canUse)
		addUseItem();
	}

	return menu;
    },

    displayItemMenu: function (parent, member) {
	var zoom = parent.items[0].item.zoom,
	    itemMenu = this.createItemMenu(member, parent.x, parent.y, parent.width, parent.height, zoom, parent);

	itemMenu.preRender.add(parent.preRender.bind(parent), 1);

	parent.zoomInOut(zoom, 0, 200);
	itemMenu.slide(itemMenu.x, -itemMenu.getHeight() - 10, itemMenu.x, itemMenu.y, 100);
	itemMenu.slide(itemMenu.x, itemMenu.y, itemMenu.x - itemMenu.getWidth() / 2, itemMenu.y, 300);
	itemMenu.execute();
	itemMenu.slide(itemMenu.x, itemMenu.y, itemMenu.x, screenHeight + 10, 150);
	parent.zoomInOut(0, zoom, 200);
    },

    createEquipmentMenu: function (member, x, y, width, height, zoom) {
	var menu = new Menu({
	    x: x,
	    y: y,
	    width: width,
	    height: height,
	    font: Fonts.latoBold,
	    zoom: zoom,
	    highlightColor: this.memberColor,
	    showArrow: false
	});

	Object.each(member.equipment, function (equip, type) {
	    menu.addText(type + ': ' + (equip ? equip.name : ''), this.displayChangeMenu.bind(this, menu, member, type));
	}, this);

	return menu;
    },

    displayEquipmentMenu: function (parent, member) {
	var zoom = parent.items[0].item.zoom,
	    equipmentMenu = this.createEquipmentMenu(member, parent.x, parent.y, parent.width, parent.height, zoom);

	equipmentMenu.preRender.add(parent.preRender, 1);

	parent.zoomInOut(zoom, 0, 200);
	equipmentMenu.slide(equipmentMenu.x, -equipmentMenu.getHeight() - 10, equipmentMenu.x, equipmentMenu.y, 100);
	equipmentMenu.slide(equipmentMenu.x, equipmentMenu.y, equipmentMenu.x - equipmentMenu.getWidth() / 2, equipmentMenu.y, 300);
	equipmentMenu.execute();
	equipmentMenu.slide(equipmentMenu.x, equipmentMenu.y, equipmentMenu.x, screenHeight + 10, 150);
	parent.zoomInOut(0, zoom, 200);
    },

    createChangeMenu: function (member, x, y, width, height, zoom, type) {
	var menu = new Menu({
	    x: x,
	    y: y,
	    width: width,
	    height: height,
	    font: Fonts.latoBold,
	    zoom: (zoom - 0.5).max(0.7),
	    highlightColor: this.memberColor,
	    showArrow: false,
	    bumpSelection: true
	});

	function createMenuItems() {
	    menu.items = [];
	    if (!Object.some(member.items.all, function (i) i.item.type.equip == type))
		menu.addText({text: 'No items', isSelectable: function () false});
	    else {
		Object.each(member.items.all, function (item, name) {
		    if (item.item.type.equip == type) {
			menu.addText({
			    text: name,
			    action: function () { member.equipment[type] = item.item; createMenuItems(); },
			    isSelectable: function () member.equipment[type].name != name
			});
		    }
		});
		if (member.equipment[type] != null)
		    menu.addText('Unequip', function () { member.equipment[type] = null; createMenuItems(); });
	    }
	}
	createMenuItems();

	return menu;
    },

    displayChangeMenu: function (parent, member, type) {
	var ph = parent.height, pw = parent.width, rph = parent.getHeight(), rpw = parent.getWidth(),
	    changeMenu = this.createChangeMenu(member, parent.x, parent.y, pw, ph, parent.zoom, type),
	    h = changeMenu.height, w = changeMenu.width, rh = changeMenu.getHeight(), rw = changeMenu.getWidth();

	changeMenu.preRender.add(function () {
	    parent.preRender();
	    this.displayStats({  // Hackishly fake a menu
		items: [{
		    x: screenMargin,
		    y: parent.y,
		    item: {zoom: parent.zoom}
		}],
		zoomInOut: function () { },
		preRender: function () { }
	    }, member, true);
	}.bind(this));

	parent.resize(rpw, rph, rpw, 0, 160, true);
	changeMenu.resize(rw, 0, rw, rh, 160, true);
	changeMenu.width = w;
	changeMenu.height = h;
	changeMenu.execute();
	changeMenu.resize(rw, rh, rw, 0, 160, true);
	parent.width = pw;
	parent.height = ph;
	parent.resize(rpw, 0, rpw, rph, 160, true);
	parent.width = pw;
	parent.height = ph;
    }
});
