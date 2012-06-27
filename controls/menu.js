var {HookList} = require('hook-list'),
activeColor = CreateColor(0, 255, 255),
inactiveColor = CreateColor(255, 255, 255),
unselectableColor = CreateColor(128, 128, 128),
transparent = CreateColor(0, 0, 0, 0),
defaultMouseImage = (function () {
    var s = CreateSurface(10, 10, CreateColor(0,0,0,0));
    s.setPixel(1, 1,  CreateColor(156, 156, 156));
    s.setPixel(1, 2,  CreateColor(156, 156, 156));
    s.setPixel(2, 3,  CreateColor(156, 156, 156));
    s.setPixel(2, 4,  CreateColor(156, 156, 156));
    s.setPixel(3, 5,  CreateColor(156, 156, 156));
    s.setPixel(3, 6,  CreateColor(156, 156, 156));
    s.setPixel(4, 7,  CreateColor(156, 156, 156));
    s.setPixel(4, 8,  CreateColor(156, 156, 156));
    s.setPixel(5, 6,  CreateColor(156, 156, 156));
    s.setPixel(5, 7,  CreateColor(156, 156, 156));
    s.setPixel(6, 6,  CreateColor(156, 156, 156));
    s.setPixel(7, 5,  CreateColor(156, 156, 156));
    s.setPixel(7, 8,  CreateColor(156, 156, 156));
    s.setPixel(8, 9,  CreateColor(156, 156, 156));
    s.setPixel(2, 1,  CreateColor(192, 192, 192));
    s.setPixel(2, 2,  CreateColor(192, 192, 192));
    s.setPixel(3, 3,  CreateColor(192, 192, 192));
    s.setPixel(3, 4,  CreateColor(192, 192, 192));
    s.setPixel(4, 2,  CreateColor(192, 192, 192));
    s.setPixel(4, 4,  CreateColor(192, 192, 192));
    s.setPixel(4, 5,  CreateColor(192, 192, 192));
    s.setPixel(4, 5,  CreateColor(192, 192, 192));
    s.setPixel(5, 5,  CreateColor(192, 192, 192));
    s.setPixel(6, 3,  CreateColor(192, 192, 192));
    s.setPixel(6, 5,  CreateColor(192, 192, 192));
    s.setPixel(7, 7,  CreateColor(192, 192, 192));
    s.setPixel(8, 8,  CreateColor(192, 192, 192));
    s.setPixel(9, 9,  CreateColor(192, 192, 192));
    s.setPixel(3, 2,  CreateColor(255, 255, 255));
    s.setPixel(4, 3,  CreateColor(192, 192, 192));
    s.setPixel(5, 3,  CreateColor(255, 255, 255));
    s.setPixel(5, 4,  CreateColor(255, 255, 255));
    s.setPixel(6, 4,  CreateColor(255, 255, 255));
    s.setPixel(7, 4,  CreateColor(255, 255, 255));
    s.setPixel(7, 6,  CreateColor(255, 255, 255));
    s.setPixel(8, 7,  CreateColor(255, 255, 255));
    s.setPixel(9, 8,  CreateColor(255, 255, 255));
    s.setPixel(0, 0,  CreateColor(0, 0, 0));
    s.setPixel(0, 1,  CreateColor(0, 0, 0));
    s.setPixel(0, 2,  CreateColor(0, 0, 0));
    s.setPixel(1, 0,  CreateColor(0, 0, 0));
    s.setPixel(1, 1,  CreateColor(0, 0, 0));
    s.setPixel(1, 2,  CreateColor(0, 0, 0));
    s.setPixel(1, 3,  CreateColor(0, 0, 0));
    s.setPixel(1, 4,  CreateColor(0, 0, 0));
    s.setPixel(2, 5,  CreateColor(0, 0, 0));
    s.setPixel(2, 6,  CreateColor(0, 0, 0));
    s.setPixel(3, 7,  CreateColor(0, 0, 0));
    s.setPixel(3, 8,  CreateColor(0, 0, 0));
    s.setPixel(4, 9,  CreateColor(0, 0, 0));
    s.setPixel(5, 8,  CreateColor(0, 0, 0));
    s.setPixel(6, 7,  CreateColor(0, 0, 0));
    s.setPixel(6, 8,  CreateColor(0, 0, 0));
    s.setPixel(7, 9,  CreateColor(0, 0, 0));
    s.setPixel(3, 1,  CreateColor(0, 0, 0));
    s.setPixel(4, 1,  CreateColor(0, 0, 0));
    s.setPixel(5, 2,  CreateColor(0, 0, 0));
    s.setPixel(6, 2,  CreateColor(0, 0, 0));
    s.setPixel(7, 3,  CreateColor(0, 0, 0));
    s.setPixel(8, 3,  CreateColor(0, 0, 0));
    s.setPixel(9, 4,  CreateColor(0, 0, 0));
    s.setPixel(8, 5,  CreateColor(0, 0, 0));
    s.setPixel(8, 6,  CreateColor(0, 0, 0));
    s.setPixel(9, 7,  CreateColor(0, 0, 0));
    return s.createImage();
})();

/**
   Clears the keyboard input queue.
*/
function ClearKeyQueue() {
    while (AreKeysLeft())
	GetKey();
}

/**
   Returns whether or not a key has been pressed
   and is still in the key queue.
*/
function BiosKeyPressed(key) {
    return AreKeysLeft() && IsKeyPressed(key);
}

var Menu = exports.Menu = new Class({
    Implements: [Options, Events],

    options: {
	x: 0,
	y: 0,
	width: 0,
	height: 0,
	font: GetSystemFont(),
	arrow: GetSystemArrow(),
	showArrow: true,
	zoom: 1,
	color: inactiveColor,
	highlightColor: activeColor,
	unselectableColor: unselectableColor,
	escapeable: function () true,
	mouseSupport: false,
	mouseButtons: [],
	mouse: defaultMouseImage,
	selection: 0,
	multiselection: false,
	bumpSelection: false,
	cutOffWidth: false,
	cutOffHeight: true,
	smoothScrolling: false,
	horizontal: false,
	vertical: true,
	wrapSelection: true,
	hideSelection: false,
	keyDelay: 200,
	mouseButtonDelay: 200,
	hasKeyFocus: true,
	hasMouseFocus: true,
	highlightUnfocused: false
    },

    items: [],
    shownItems: [],
    done: false,
    escaped: false,
    keys: [],
    selectionArray: [],
    mouseX: -1,
    mouseY: -1,
    hspace: 0,
    vspace: 0,

    initialize: function (options) {
	this.setOptions(options);
	this.options.font = options.font || GetSystemFont();  // MooTools can't copy Sphere objects
	this.options.arrow = options.arrow || GetSystemArrow();
	this.options.mouse = options.mouse || defaultMouseImage;
	this.options.color = options.color || inactiveColor;
	this.options.highlightColor = options.highlightColor || activeColor;
	this.options.unselectableColor = options.unselectableColor || unselectableColor;
	Object.keys(this.options).each(function (key) {
	    this[key] = this.options[key];
	}, this);

	this.preRender = HookList();
	this.postRender = HookList();
	this.preUpdate = HookList();
	this.postUpdate = HookList();

	if (this.width < 1)
	    this.width = GetScreenWidth() - this.x * 2;
	if (this.height < 1)
	    this.height = GetScreenHeight() - this.y * 2;

	if (this.mouseSupport) {
	    this.mouseX = GetMouseX();
	    this.mouseY = GetMouseY();
	}
    },

    ///////////////////////////////////////////////////////////

    /**
       This adds a key to be processed by the menu.
       Adding a key means that the default keys will no longer be added automatically.
       @param KEY The keycode of the key e.g. KEY_A
       @param action The function to be performed when the key is pressed.
       @param delay (optional) The delay until the action of the key can be repeated.
    */
    addKey: function (key, action, delay) {
	if (delay == null) delay = this.keyDelay;

	var oldKey = this.keys.find(function (k) k.name == key);
	if (oldKey) {
	    oldKey.action = action;
	    oldKey.delay = delay;
	}
	else {
	    this.keys.push({
		name: key,
		action: action,
		delay: delay,
		lastPressed: GetTime()
	    });
	}

	return this;
    },

    removeKey: function (key) {
	this.keys.each(function (keyObject, index) {
	    if (keyObject.name == key)
		this.keys.splice(index, 1);
	}, this);
	return this;
    },

    addMouseButton: function (button, action, delay) {
	if (delay == null) delay = this.mouseButtonDelay;

	var oldButton = this.mouseButtons.find(function (b) b.name == button);
	if (oldButton) {
	    oldButton.action = action;
	    oldButton.delay = delay;
	}
	else {
	    this.mouseButtons.push({
		name: button,
		action: action,
		delay: delay,
		lastPressed: GetTime()
	    });
	}

	return this;
    },

    removeMouseButton: function (button) {
	this.mouseButtons.each(function (bottonObject, index) {
	    if (buttonObject.name == button)
		this.buttonObjects.splice(index, 1);
	});
	return this;
    },

    addDefaultKeys: function (up, down, left, right, select, escape) {
	var defaultKeys = {
	    up: [KEY_UP, KEY_LEFT],
	    down: [KEY_DOWN, KEY_RIGHT],
	    left: [KEY_LEFT, KEY_UP],
	    right: [KEY_RIGHT, KEY_DOWN]
	}, horizontal = +this.horizontal;

	if (up == null) up = defaultKeys.up[horizontal];
	if (down == null) down = defaultKeys.down[horizontal];
	if (left == null) left = defaultKeys.left[horizontal];
	if (right == null) right = defaultKeys.right[horizontal];
	if (select == null) select = KEY_SPACE;
	if (escape == null) escape = KEY_ESCAPE;

	function doChangeSelection(self, amount) {
	    if (self.wrapSelection)
		self.selection = self.selection.wrap(0, self.items.length - 1, amount);
	    else
		self.selection = (self.selection + amount).limit(0, self.items.length - 1);
	}

	function changeSelection(amount) {
	    return function () {
		if (!this.items.length)
		    return;

		var oldSelection = this.selection;
		doChangeSelection(this, amount);

		if (!this.items[this.selection].isSelectable()) {
		    if (amount < 0 ? this.selection > 0 : this.selection < this.items.length - 1)
			doChangeSelection(this, amount.sgn());
		    else
			this.selection = oldSelection;
		}

		if (this.selection != oldSelection)
		    this.fireEvent('selectionChange', [oldSelection, this.selection]);
	    };
	}

	this.addKey(up, changeSelection(-1))
	    .addKey(down, changeSelection(1))
	    .addKey(select, function () {   
		if (BiosKeyPressed(select) && this.items.length && this.items[this.selection].isSelectable())
		    this.lastMenuItemReturnValue = this.items[this.selection].onSelection();
	    })
	    .addKey(escape, function () {   
		if (BiosKeyPressed(escape) && this.escapeable())
		    this.lastMenuItemReturnValue = this.handleEscape();
	    });

	return this;
    },

    addDefaultMouseButtons: function (select) {
	if (select == null) select = MOUSE_LEFT;

	this.addMouseButton(select, function () {   
	    if (IsMouseButtonPressed(select)) {
		var mouseItem = this.getMouseItem();
		if (this.lastPressed + this.delay < GetTime()) {
		    if (mouseItem >= 0 && mouseItem < this.items.length) {
			this.lastMenuItemReturnValue = this.items[mouseItem].onSelection();
			this.lastPressed = GetTime();
		    }
		}
	    }
	});
	return this;
    },

    add: function (options) {
	// options is:
	// - x: Number
	// - y: Number
	// - width: Number
	// - height: Number
	// - item: Object
	// - render: Function
	// - highlightRender: Function
	// - isSelectable: Function
	// - onSelection: Function

	if (options.isSelectable == null)
	    options.isSelectable = function () true;
	if (options.onSelection == null)
	    options.onSelection = function () { this.done = true; return this.selection; };

	options.parentMenu = this;

	this.items.push(options);
	return this;
    },

    remove: function (index, rearrange) {
	if (rearrange == null) rearrange = true;

	if (index >= 0 && index < this.items.length) {
	    var removed = this.items[index];

	    if (rearrange) {
		this.items.slice(index).each(function (item) {
		    if (this.horizontal)
			item.x -= removed.width;
		    if (this.vertical)
			item.y -= removed.height;
		}, this);
	    }

	    this.items.splice(index, 1);
	    return removed;
	}
	
	return null;
    },

    handleEscape: function () {
	this.done = true;
	this.escaped = true;
	this.fireEvent('escape');
	return this;
    },

    handleKeys: function () {
	if (!this.hasKeyFocus)
	    return this;

	if (this.keys.length == 0)
	    this.addDefaultKeys();

	this.keys.each(function (key) {
	    if (BiosKeyPressed(key.name))
		key.action.call(this);
	}, this);

	return this;
    },

    handleMouse: function (x, y, w, h) {
	if (!this.mouseSupport || !this.hasMouseFocus)
	    return this;

	if (x == null) x = this.x;
	if (y == null) y = this.y;
	if (w == null) w = this.width;
	if (h == null) h = this.height;

	var mouseMoved = false, mouseX = GetMouseX(), mouseY = GetMouseY(), mouseItem;

	if (this.mouseX != mouseX || this.mouseY != mouseY) {
	    this.mouseX = mouseX;
	    this.mouseY = mouseY;
	    mouseMoved = true;  
	}

	mouseItem = this.getMouseItem();
	if (mouseMoved && mouseItem >= 0 && mouseItem < this.items.length)
	    this.selection = mouseItem;

	this.mouseButtons.each(function (button) {
	    if (IsMouseButtonPressed(button.name))
		button.action.call(this);
	});

	return this;
    },

    handleSelection: function () {
	if (this.bumpSelection && this.items.length && !this.items[this.selection].isSelectable()) {
	    var oldSelection = this.selection;
	    this.selection = this.selection.wrap(0, this.items.length - 1, 1);
	    this.fireEvent('selectionChange', [oldSelection, this.selection]);
	}
	return this;
    },

    update: function (x, y, w, h) {
	this.preUpdate();
	this.handleKeys().handleMouse(x, y, w, h).handleSelection();
	this.postUpdate();
	return this;
    },

    /**
       This method draws the menu within the box (x, y) -> (x + w, y + h)
    */
    _render: function (x, y, w, h, surface) {
	if (x == null) x = this.x;
	if (y == null) y = this.y;
	if (w == null) w = this.width;
	if (h == null) h = this.height;

	this.selection = this.selection.limit(0, this.items.length - 1);

	// Ensure that the items are always onscreen when drawing begins.
	var keepGoing = true;
	this.items.each(function () {
	    if (keepGoing) {
		var i = this.selection, item = this.items[i];
		if (item.x >= x && (!this.cutOffWidth || item.x + item.width <= x + w)) {
		    if (item.y >= y && (!this.cutOffHeight || item.y + item.height <= y + h))
			keepGoing = false;
		    if (this.selection == i)
			this.whenOffScreen(x, y, w, h);
		}
		else if (this.selection == i)
		    this.whenOffScreen(x, y, w, h);
	    }
	}, this);

	this.shownItems = [];

	this.items.each(function (item, i) {
	    var selected = false;
	    
	    if (this.multiselection) {
		if (this.selectionArray.length) {
		    this.selectionArray.each(function (selectedIndex) {
			selected = selectedIndex == i || this.selection == i;
		    });
		}
		else if (this.selection == i)
		    selected = true;
	    }
	    else if (this.selection == i)
		selected = true;

	    if (selected && !this.hideSelection) {
		if (item.x >= x && (!this.cutOffWidth || item.x + item.width <= x + w)) {
		    if (item.y >= y && (!this.cutOffHeight || item.y + item.height <= y + h)) {
			this.shownItems.push(i);
			item.highlightRender(surface);
		    }
		    else if (this.selection == i)
			this.whenOffScreen(x, y, w, h);
		}
		else if (this.selection == i)  
		    this.whenOffScreen(x, y, w, h);
		
	    }
	    else if (item.x >= x && (!this.cutOffWidth || (item.x + item.width) <= x + w)) {
		if (item.y >= y && (!this.cutOffHeight || (item.y + item.height) <= y + h)) {
		    this.shownItems.push(i);
		    item.render(surface);
		}
	    }
	}, this);

	return this;
    },

    _renderMouse: function (surface) {
	if (this.mouseSupport) {
	    var x = GetMouseX(), y = GetMouseY();
	    if (surface)
		surface.blitSurface(this.mouse.createSurface(), x, y);
	    else
		this.mouse.blit(x, y);
	}
	return this;
    },

    render: function (x, y, w, h, surface) {
	this.preRender(x, y, w, h, surface);
	this._render(x, y, w, h, surface);
	this.postRender(x, y, w, h, surface);
	this._renderMouse(surface);
	return this;
    },

    getMouseItem: function () {
	var mouseOverItem = -1, mouseX = GetMouseX(), mouseY = GetMouseY();

	this.items.each(function (item, index) {
	    if (mouseX > item.x && mouseX < item.x + item.width) {
		if (mouseY > item.y && mouseY < item.y + item.height)
		    mouseOverItem = i;
	    }
	});

	return mouseOverItem;
    },

    /**
       A non-blocking version of Menu.execute
       @param selection The menu item selection to use, can be omitted.
       @see Menu.execute
    */
    go: function(x, y, w, h, selection) {
	if (selection != null) this.selection = selection;

	if (!this.done)
	    this.update(x, y, w, h).render(x, y, w, h);

	return this;
    },

    /**
       The method called to execute the menu within the box (x, y) -> (x + w, y + h).
       It returns the last return value of the last selected item.
    */
    execute: function (x, y, w, h) {
	ClearKeyQueue();

	var time = GetTime() + 100;

	while (!this.done) {
	    this.render(x, y, w, h);

	    time = GetTime() + 100;

	    this.update(x, y, w, h);
	    ClearKeyQueue();
	    
	    // redraw if dealing with the keys takes too long
	    if (!this.done && time < GetTime())
		this.render(x, y, w, h);

	    FlipScreen();
	}

	return this.lastMenuItemReturnValue;
    },

    /**
       This method is called when an item is off the screen.
       It is used to reposition the menu items onscreen.
    */
    whenOffScreen: function (x, y, w, h) {
	if (x == null) x = this.x;
	if (y == null) y = this.y;
	if (w == null) w = this.width;
	if (h == null) h = this.height;

	var width = Math.min.apply(Math, this.items.pluck('width')),
	    height = Math.min.apply(Math, this.items.pluck('height')),
	    xSpeed = this.smoothScrolling ? 1 : width > 0 ? width : 0,
	    ySpeed = this.smoothScrolling ? 1 : height > 0 ? height : 0;
	
	if (this.items[this.selection].y + this.items[this.selection].height > y + h)
	    this.items.each(function (item) { item.y -= ySpeed; });

	if (this.items[this.selection].y < y)
	    this.items.each(function (item) { item.y += ySpeed; });

	if (this.items[this.selection].x + this.items[this.selection].width > x + w)
	    this.items.each(function (item) { item.x -= xSpeed; });

	if (this.items[this.selection].x < x)
	    this.items.each(function (item) { item.x += xSpeed; });

	return this;
    },

    nextX: function () {
	var x = this.x;
	if (this.items.length > 0) {
	    x = this.items.getLast().x;

	    if (this.horizontal) {
		x += this.items.getLast().width;
		x += this.hspace;
	    }
	}
	return x;
    },

    nextY: function () {
	var y = this.y;
	if (this.items.length > 0) {
	    y = this.items.getLast().y;

	    if (this.vertical) {
		y += this.items.getLast().height;      
		y += this.vspace;
	    }
	}
	return y;
    },

    ///////////////////////////////////////////////////////////////
    // Extension methods
    ///////////////////////////////////////////////////////////////

    _defaultHighlightRender: function (surface) {
	if (this.item.showPointer) {
	    if (surface)
		surface.blitSurface(this.item.pointer.createSurface(), this.x, this.y);
	    else
		this.item.pointer.blit(this.x, this.y);
	}
	if (!this.parentMenu.hasKeyFocus && !this.parentMenu.highlightUnfocused)
	    this.render(surface, this.isSelectable() ? this.color : this.unselectableColor);
	else
	    this.render(surface, this.isSelectable() ? this.item.highlightColor : this.unselectableColor);
    },

    /**
       Menu.addText adds 'text' to the menu at the next spot in the menu.
       @param text The text to be added.
    */
    addText: function (options) {
	if (arguments.length == 2) options = {text: arguments[0], action: arguments[1]};
	if (typeof options == 'string') options = {text: options};

	var object = Object.append({
	    text: '',
	    action: function () { },
	    isSelectable: function () true,
	    zoom: this.zoom,
	    font: this.font,
	    pointer: this.arrow,
	    showPointer: this.showArrow,
	    color: this.color,
	    highlightColor: this.highlightColor,
	    unselectableColor: this.unselectableColor
	}, options), x = this.nextX(), y = this.nextY();

	this.add({
	    x: x,
	    y: y,
	    width: object.pointer.width + object.font.getStringWidth(object.text) * object.zoom,
	    height: object.font.getHeight() * object.zoom,
	    item: object,
	    render: function (surface, color) {
		this.item.font.setColorMask(color || (this.isSelectable() ? this.item.color : this.item.unselectableColor));
		if (surface)
		    surface.drawZoomedText(this.item.font, this.x + this.item.pointer.width, this.y, this.item.zoom, this.item.text);
		else
		    this.item.font.drawZoomedText(this.x + this.item.pointer.width, this.y, this.item.zoom, this.item.text);
		this.item.font.setColorMask(this.item.color);
	    },
	    highlightRender: this._defaultHighlightRender,
	    isSelectable: function () this.item.isSelectable(),
	    onSelection: function () this.item.action()
	});

	return this;
    },

    /**
       Menu.addTextBox adds 'text' to the menu at the next spot in the menu.
       @param text The text to be added.
       @param text_width The width of which the text should be word-wrapped at.
    */
    addTextBox: function (options) {
	this.addText(options);
	var item = this.items.getLast();
	item.item.textWidth = options.textWidth || item.item.font.getStringWidth(item.item.text);

	item.render = function (surface, color) {
	    this.item.font.setColorMask(color || (this.isSelectable() ? this.item.color : this.item.unselectableColor));
	    if (surface)
		surface.drawTextBox(this.item.font, this.x + this.item.pointer.width, this.y, this.item.textWidth, this.height, 0, this.item.text);
	    else
		this.item.font.drawTextBox(this.x + this.item.pointer.width, this.y, this.item.textWidth, this.height, 0, this.item.text);
	    this.item.font.setColorMask(this.item.color);
	};

	return this;
    },

    /**
       Menu.addImage adds 'image' to the menu at the next spot in the menu.
       @param image The image object to be added.
    */
    addImage: function (options) {
	var object = Object.append({
	    image: null,
	    action: function () { },
	    isSelectable: function () true,
	    zoom: this.zoom,
	    pointer: this.arrow,
	    showPointer: this.showArrow,
	    color: this.color,
	    highlightColor: this.highlightColor,
	    unselectableColor: this.unselectableColor
	}, options), x = this.nextX(), y = this.nextY();

	this.add({
	    x: x,
	    y: y,
	    width: object.pointer.width + object.image.width * object.zoom,
	    height: object.image.height * object.zoom,
	    item: object,
	    render: function (surface, color) {
		if (surface) {
		    surface.zoomBlitMaskSurface(this.item.image.createSurface(), this.x + this.item.pointer.width, this.y,
						this.item.zoom, color || (this.isSelectable() ? this.item.color : this.item.unselectableColor));
		}
		else {
		    this.item.image.zoomBlitMask(this.x + this.item.pointer.width, this.y, this.item.zoom,
						 color || (this.isSelectable() ? this.item.color : this.item.unselectableColor));
		}
	    },
	    highlightRender: this._defaultHighlightRender,
	    isSelectable: function () this.item.isSelectable(),
	    onSelection: function () this.item.action()
	});

	return this;
    },

    /**
       Menu.addSpriteset adds an animated 'spriteset' to the menu,
       at the next spot in the menu.
       @param spriteset The spriteset to be added.
       @param text The text to be added.
       @param space The space between the spriteset and the text.
    */
    addSpriteset: function (options) {
	var object = Object.append({
	    spriteset: null,
	    text: '',
	    action: function () { },
	    isSelectable: function () true,
	    pointer: this.arrow,
	    showPointer: this.showArrow,
	    font: this.font,
	    zoom: this.zoom,
	    frameIndex: 0,
	    directionIndex: 0,
	    lastOccurance: 0,
	    space: 0,
	    color: this.color,
	    highlightColor: this.highlightColor,
	    unselectableColor: this.unselectableColor
	}, options), x = this.nextX(), y = this.nextY();

	object.delay = object.spriteset.directions[object.directionIndex].frames[object.frameIndex].delay * 10;

	var width = object.pointer.width + object.spriteset.images[object.spriteset.directions[object.directionIndex].frames[0].index].width +
	            space + sprite.font.getStringWidth(sprite.text),
	    height = Math.max(object.spriteset.images[object.spriteset.directions[object.directionIndex].frames[0].index].height,
                              sprite.font.getStringHeight(object.text, this.width));

	this.add({
	    x: x,
	    y: y,
	    width: width,
	    height: height,
	    item: object,
	    render: function (surface, color) {
		color = color || (i.isSelectable() ? i.color : i.unselectableColor);
		var i = this.item;

		if (i.lastOccurance + i.delay <= GetTime()) {
		    i.lastOccurance = GetTime();
		    i.delay = i.spriteset.directions[i.directionIndex].frames[i.frameIndex].delay * 10;
		    i.frameIndex = i.frameIndex.wrap(0, i.spriteset.directions[i.directionIndex].frames.length - 1);
		}

		var index = i.spriteset.directions[i.directionIndex].frames[i.frameIndex].index;

		if (surface)
		    surface.zoomBlitMaskSurface(i.spriteset.images[index].createSurface(), this.x + i.pointer.width, this.y, i.zoom, color);
		else
		    i.spriteset.images[index].blitMask(this.x + i.pointer.width, this.y, color);

		if (i.text) {
		    i.font.setColorMask(color);
		    if (surface)
			surface.drawText(i.font, this.x + i.pointer.width + space, this.y, i.text);
		    else
			i.font.drawText(this.x + i.pointer.width + space, this.y, i.text);
		    i.font.setColorMask(i.color);
		}
	    },
	    highlightRender: this._defaultHighlightRender,
	    isSelectable: function () this.item.isSelectable(),
	    onSelection: function () this.item.action()
	});

	return this;
    },

    /**
       Returns the lowest x value currently being used by the menu.
    */
    minX: function () {
	return Math.min.apply(Math, [this.x].concat(this.items.pluck('x')));
    },

    /**
       Returns the lowest x value currently being used by the menu.
    */
    minY: function () {
	return Math.min.apply(Math, [this.y].concat(this.items.pluck('y')));
    },

    /**
       Returns the dynamic width of the menu.
    */
    getWidth: function () {
	var x = this.minX(), width = 0;
	this.items.each(function (item) {
	    if (item.x + item.width - x > width)
		width = item.x + item.width - x;
	});
	return width;
    },

    /**
       Returns the dynamic height of the menu.
    */
    getHeight: function () {
	var y = this.minY(), height = 0;
	this.items.each(function (item) {
	    if (item.y + item.height - y > height)
		height = item.y + item.height - y;
	});
	return height;
    },

    ///////////////////////////////////////////////////////////////
    // Animation methods
    ///////////////////////////////////////////////////////////////

    /**
       Slides the menu from (sx, sy) to (ex, ey) over 'time' milliseconds.
       Note that it repositions the menu at (sx, sy) before the slide.
    */
    slide: function (sx, sy, ex, ey, time, callback) {
	var oldX = this.x, oldY = this.y, xDiff = ex - sx, yDiff = ey - sy, xOffset = 0,
	    yOffset = 0, originalXArray, originalYArray, start = GetTime(), timePassed;

	this.x = sx;
	this.y = sy;

	this.items.each(function (item) {
	    item.x = sx + (item.x - oldX);
	    item.y = sy + (item.y - oldY);
	});

	originalXArray = this.items.pluck('x');
	originalYArray = this.items.pluck('y');

	while (start + time > GetTime()) {
	    timePassed = GetTime() - start;

	    if (time) {
		xOffset = timePassed / time * xDiff;
		yOffset = timePassed / time * yDiff;
	    }
	    
	    this.x = sx + xOffset;
	    this.y = sy + yOffset;
	    
	    this.items.each(function (item, index) {
		item.x = originalXArray[index] + xOffset;
		item.y = originalYArray[index] + yOffset;
	    });
	    
	    this.render();
	    if (callback)
		callback(timePassed, xOffset, yOffset);
	    FlipScreen();
	}
	
	this.items.each(function (item, index) {
	    item.x = xDiff + originalXArray[index];
	    item.y = yDiff + originalYArray[index];
	});

	this.x = ex;
	this.y = ey;

	return this;
    },

    zoomInOut: function (sz, ez, time, callback) {
	var diff = ez - sz, offset, originalZoomArray, start = GetTime(), timePassed;

	this.items.each(function (item) {
	    if ('zoom' in item.item)
		item.item.zoom = sz;
	});

	originalZoomArray = this.items.pluck('item.zoom');

	while (start + time > GetTime()) {
	    timePassed = GetTime() - start;

	    if (time)
		offset = timePassed / time * diff;

	    this.items.each(function (item, index) {
		if ('zoom' in item.item)
		    item.item.zoom = originalZoomArray[index] + offset;
	    });

	    this.render();
	    if (callback)
		callback(timePassed, offset);
	    FlipScreen();
	}

	this.items.each(function (item, index) {
	    if ('zoom' in item.item)
		item.item.zoom = ez;
	});

	return this;
    },

    resize: function (sw, sh, ew, eh, time, smooth, callback) {
	var wDiff = ew - sw, hDiff = eh - sh, wOffset = 0, hOffset = 0, start = GetTime(), timePassed,
	    surface, screenW = GetScreenWidth(), screenH = GetScreenHeight();

	if (!smooth) {
	    this.width = sw;
	    this.height = sh;
	}

	while (start + time > GetTime()) {
	    timePassed = GetTime() - start;

	    if (time) {
		wOffset = timePassed / time * wDiff;
		hOffset = timePassed / time * hDiff;
	    }

	    if (smooth) {
		// There has got to be a better way to do this.
		surface = CreateSurface(screenW, screenH, transparent);
		this.render(null, null, null, null, surface);
		surface = surface.cloneSection(this.x, this.y, sw + wOffset, sh + hOffset);
		surface.blit(this.x, this.y);
	    }
	    else {
		this.width = sw + wOffset;
		this.height = sh + hOffset;
		this.render();
	    }

	    if (callback)
		callback(timePassed, wOffset, hOffset);
	    FlipScreen();
	}

	this.width = ew;
	this.height = eh;

	return this;
    },

    fade: function (sa, ea, time, callback) {
	var diff = ea - sa, offset, start = GetTime(), timePassed, preRender = this.preRender, surface,
	    w = this.getWidth(), h = this.getHeight(), screenW = GetScreenWidth(), screenH = GetScreenHeight();

	while (start + time > GetTime()) {
	    timePassed = GetTime() - start;

	    if (time)
		offset = timePassed / time * diff;

	    surface = CreateSurface(screenW, screenH, transparent);
	    this.render(null, null, null, null, surface);
	    surface = surface.cloneSection(this.x, this.y, w, h);
	    surface.setAlpha(sa + offset);
	    surface.blit(this.x, this.y);
	    if (callback)
		callback(timePassed, offset);
	    FlipScreen();
	}

	this.preRender = preRender;

	return this;
    }
});
