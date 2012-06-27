
/*
  R-Menu
  Elegant menu system
  By Steax for the Spherical Make-A-Menu Competition
  Use this for whatever you please.
*/

//var rmenu = {};

var HookList = require('hook-list').HookList,
Menu = new Class({
    Implements: [Options, Events],

    options: {
	escapable: true,
	font: GetSystemFont(),
	cursor: null,
	width: GetScreenWidth(),
	height: GetScreenHeight()
    },

    colors: {},

    running: true,
    intro: true,
    yOffset: 50,
    selection: 0,
    preRender: HookList(),
    postRender: HookList(),
    items: [],
    introInterval: 5,
    introCounter: 0,
    introEnd: 15,
    introTempX: 0,
    introTempAlpha: 0,
    introTempMask: null,

    initialize: function (options) {
	this.setOptions(options);
	this.options.font = options.font || GetSystemFont();  // MooTools attempts to copy a Font object, with disastrous results.
	this.initColors();
	Object.each(this.colors, function (defaultColor, name) {
	    if (options.colors && options.colors[name])
		this.colors[name] = options.colors[name];
	}, this);
	this.items = options.items;
	this.width = this.options.width;
	this.height = this.options.height;

	this.background = CreateSurface(this.width, this.height, this.colors.transparent);
	this.background.gradientRectangle(0, 0, this.width, this.height, this.colors.background1, this.colors.background1,
					  this.colors.background2, this.colors.background2);
	this.background = this.background.createImage();

	if (options.postRender)
	    this.postRender.add(options.postRender);
	if (options.preRender)
	    this.preRender.add(options.preRender);

	this.shiftSelect(0);
	this.cursorPos = this.width * 0.5 - this.items.length * 20 + 1;
    },

    initColors: function () {  // Work around MooTools not cloning color objects.
	this.introTempMask = CreateColor(255, 255, 255, 255);
	this.colors = {
	    transparent: CreateColor(0, 0, 0, 0),
	    white: CreateColor(255, 255, 255),
	    black: CreateColor(0, 0, 0),
	    background1: CreateColor(255, 255, 255),
	    background2: CreateColor(220, 220, 255),
	    textBorder: CreateColor(0, 0, 50, 150),
	    cursor: CreateColor(0, 0, 0, 100),
	    highlightMask: CreateColor(255, 255, 255, 200)
	};
    },

    drawText: function (x, y, text) {
	var font = this.options.font;
	function draw(xDiff, yDiff) {
	    font.drawText(x + xDiff, y + yDiff, text);
	}

	font.setColorMask(this.colors.textBorder);
	draw(-1, 0);  draw(1, 0);
	draw(0, -1);  draw(0, 1);
	draw(-1, -1); draw(-1, 1);
	draw(1, -1);  draw(1, 1);
	font.setColorMask(this.colors.white);
	draw(0, 0);
    },

    drawCenteredText: function (x, y, text) {
	var w = this.options.font.getStringWidth(text);
	this.drawText(x - (w * 0.5), y, text);
    },

    shiftSelect: function (shift) {
	this.items[this.selection].selected = false;
	this.selection += shift;
	this.selection = this.selection.limit(0, this.items.length - 1);
	this.items[this.selection].selected = true;
    },

    introRender: function () {
	++this.introCounter;

	this.introTempMask.alpha = this.introCounter / this.introEnd * 255;
	this.introTempMask.red = this.introCounter / this.introEnd * 95;
	this.introTempMask.green = this.introCounter / this.introEnd * 95;
	this.introTempMask.blue = this.introCounter / this.introEnd * 95;

	this.items.each(function (item, i) {
	    this.introTempX = (this.width * 0.5 - this.items.length * 20 + i * 40) * Math.pow(
		Math.sin(Math.PI * 0.25 + this.introCounter / this.introEnd * Math.PI * 0.25), 3);
	    if (item.icon)
		item.icon.blitMask(this.introTempX, this.yOffset - 5, this.introTempMask);
	}, this);

	if (this.introCounter >= this.introEnd) {
	    this.introCounter = 0;
	    this.intro = false;
	    this.introTempMask = CreateColor(255, 255, 255, 255);
	}
    },

    handleKeys: function () {
	while (AreKeysLeft()) {
	    switch (GetKey()) {
	    case KEY_ESCAPE:
		if (this.options.escapable) {
		    this.close();
		    this.fireEvent('escape');
		}
		break;
	    case KEY_RIGHT: this.shiftSelect(1); break;
	    case KEY_LEFT: this.shiftSelect(-1); break;
	    case KEY_SPACE: this.items[this.selection].fireEvent('select', this); break;
	    }
	}
    },

    handleCursor: function () {
	this.targetPos = this.width * 0.5 - this.items.length * 20 + this.selection * 40 + 1;

	this.cursorDist = Math.abs(this.targetPos - this.cursorPos);
	if (this.targetPos - this.cursorPos > 4)
	    this.cursorPos += Math.min(Math.floor(this.cursorDist / 10) + 1, 4) * 3;
	else if (this.cursorPos - this.targetPos > 4)
	    this.cursorPos -= Math.min(Math.floor(this.cursorDist / 10) + 1, 4) * 3;
	else
	    this.cursorPos = this.targetPos;

	if (this.options.cursor)
	    this.options.cursor.blit(this.cursorPos, this.yOffset + 29 - Math.sin(GetTime() / 200) * 2);

	this.drawCenteredText(this.cursorPos + 16, this.yOffset + 42, this.items[this.selection].text);
    },

    prepare: function () {
	this.items.each(function (item) {
	    var mask = item.baseColors.mask, beam = item.baseColors.beam;
	    item.colors.mask = CreateColor(mask.red, mask.green, mask.blue, mask.alpha);
	    item.colors.beam = CreateColor(beam.red, beam.green, beam.blue, beam.alpha);
	});
    },

    execute: function () {
	this.running = this.intro = true;
	this.prepare();

	while (this.intro) {
	    this.frameTimer = GetTime();
	    this.background.blit(0, 0);
	    this.preRender();
	    this.introRender();
	    this.postRender();
	    FlipScreen();
	    while (GetTime() < this.frameTimer + 33) { }
	}

	while (this.running) {
	    this.frameTimer = GetTime();
	    this.handleKeys();
	    this.background.blit(0, 0);
	    this.preRender();

	    this.items.each(function (item, index) {
		item.render(this.width, this.height, this.yOffset, index, this.items.length);
	    }, this);

	    this.postRender();
	    this.handleCursor();
	    FlipScreen();
	    while (GetTime() < this.frameTimer + 33) { }
	}
    },

    close: function () {
	this.running = false;
	this.fireEvent('close');
	return this;
    }
}),
MenuItem = new Class({
    Implements: [Options, Events],

    options: {
	icon: null,
	text: ''
    },

    baseColors: {},

    colors: {},
    selected: false,

    initialize: function (options) {
	this.setOptions(options);
	this.icon = this.options.icon = options.icon;
	this.text = options.text;
	this.initColors();
	Object.each(this.baseColors, function (defaultColor, name) {
	    if (options.colors && options.colors[name])
		this.baseColors[name] = options.colors[name];
	}, this);
	var mask = this.baseColors.mask, beam = this.baseColors.beam;
	this.colors.mask = CreateColor(mask.red, mask.blue, mask.green, mask.alpha);
	this.colors.beam = CreateColor(beam.red, beam.blue, beam.green, beam.alpha);
    },

    initColors: function () {
	this.baseColors = {
	    mask: CreateColor(95, 95, 95),
	    beam: CreateColor(255, 255, 255, 5)
	};
    },

    render: function (width, height, yOffset, index, numItems) {
	var mask = this.colors.mask, beam = this.colors.beam;

	if (this.selected) {
	    if (beam.alpha < 255)
		beam.alpha += 25;

	    if (mask.red < 240) {
		mask.red += 15;
		mask.green += 15; 
		mask.blue += 15;
	    }
	}
	else {
	    if (beam.alpha > 5)
		beam.alpha -= 25;

	    if (mask.red > 95) {
		mask.red -= 15;
		mask.green -= 15;
		mask.blue -= 15
	    }
	}

	beam.alpha = beam.alpha.limit(0, 255);

	Rectangle(width * 0.5 - numItems * 20 + index * 40, 0, 32, height, beam);
	if (this.icon)
	    this.icon.blitMask(width * 0.5 - numItems * 20 + index * 40, yOffset - 5, mask);
    }
});

exports.Menu = Menu;
exports.MenuItem = MenuItem;
/*
// basic variables
rmenu.run = true;
rmenu.intro = true;  // built-in, use config to disable intro
rmenu.ready = false;  // menu must be preconfigured
rmenu.font = GetSystemFont();
rmenu.width = GetScreenWidth();
rmenu.height = GetScreenHeight();
rmenu.yOffset = 50;
rmenu.selection = 0;
rmenu.preRender = function () { };
rmenu.postRender = function () { };

// color presets
rmenu.colors = {
    transparent: CreateColor(0, 0, 0, 0),
    white: CreateColor(255, 255, 255),
    black: CreateColor(0, 0, 0),
    background1: CreateColor(255, 255, 255),
    background2: CreateColor(220, 220, 255),
    textborder: CreateColor(0, 0, 50, 150),
    cursor: CreateColor(0, 0, 0, 100),
    highlightMask: CreateColor(255, 255, 255, 200)
}

// ---------------------------- INTERNAL DATA ---------------------------- 

// rmenu.elements
// The main menu elements within the menu, composed of objects.
rmenu.elements = [];

// rmenu.element
// The element subobject
rmenu.element = function (opt) {
    this.name = opt.name || 'No Name';
    this.icon = opt.icon || LoadImage('default_icon.png');	// icons must be 32x32 images

    // callbacks
    this.onSelect = opt.onSelect || function () { };

1    this.selected = false;

    // setup basic functionality, this will be recalled on each menu open
    this.setup = function () {
	this.mask = CreateColor(95,95,95,255);
	this.beamColor = CreateColor(255,255,255,5);
    };

    this.setup();

    // order parameter refers to which in the main list of elements this one is
    this.render = function (order) {
	// do fading effect
	if (this.selected) {
	    if (this.beamColor.alpha < 255)
		this.beamColor.alpha += 25;

	    if (this.mask.red < 240) {
		this.mask.red += 15;
		this.mask.green += 15; 
		this.mask.blue += 15;
	    }
	}
	else {
	    if (this.beamColor.alpha > 5)
		this.beamColor.alpha -= 25;

	    if (this.mask.red > 95) {
		this.mask.red -= 15;
		this.mask.green -= 15;
		this.mask.blue -= 15
	    }
	}

	// clamping alphas
	this.beamColor.alpha = rmenu.clamp(this.beamColor.alpha, 0, 255);

	Rectangle(rmenu.width * 0.5 - rmenu.numElements * 20 + order * 40, 0, 32, rmenu.height, this.beamColor);
	this.icon.blitMask(rmenu.width * 0.5 - rmenu.numElements * 20 + order * 40, rmenu.yOffset - 5, this.mask);
    };
};

// rmenu.drawText
// Enchanced version of the built-in draw text function.
rmenu.drawText = function (x, y, text) {
    var font = rmenu.font;

    font.setColorMask(rmenu.colors.textborder);
    font.drawText(x - 1, y, text);
    font.drawText(x + 1, y, text);
    font.drawText(x, y - 1, text);
    font.drawText(x, y + 1, text);
    font.drawText(x - 1, y - 1, text);
    font.drawText(x - 1, y + 1, text);
    font.drawText(x + 1, y - 1, text);
    font.drawText(x + 1, y + 1, text);
    font.setColorMask(rmenu.colors.white);
    font.drawText(x, y, text);
};

rmenu.drawCenteredText = function (x, y, text) {
    var w = rmenu.font.getStringWidth(text);
    rmenu.drawText(x - (w * 0.5), y, text);
};

// rmenu.shiftSelect
// Move the current selection relative to current
rmenu.shiftSelect = function (shift) {
    rmenu.elements[rmenu.selection].selected = false;
    rmenu.selection += shift;

    if (rmenu.selection < 0)
	rmenu.selection = rmenu.numElements - 1;
    if (rmenu.selection > rmenu.numElements - 1)
	rmenu.selection = 0;

    rmenu.elements[rmenu.selection].selected = true;
};

// ---------------------------- HANDLERS ---------------------------- 

rmenu.introInterval = 5;
rmenu.introCounter = 0;
rmenu.introEnd = 15
rmenu.introTempX;
rmenu.introTempAlpha;
rmenu.introTempMask = CreateColor(255, 255, 255, 255);
rmenu.introRender = function () {
    rmenu.introCounter++;

    rmenu.introTempMask.alpha = rmenu.introCounter / rmenu.introEnd * 255;
    rmenu.introTempMask.red = rmenu.introCounter / rmenu.introEnd * 95;
    rmenu.introTempMask.green = rmenu.introCounter / rmenu.introEnd * 95;
    rmenu.introTempMask.blue = rmenu.introCounter / rmenu.introEnd * 95;

    // render menu intro
    for (var i = 0; i < rmenu.numElements; i++) {
	rmenu.introTempX = (rmenu.width * 0.5 - rmenu.numElements * 20 + i * 40) * Math.pow(
	    Math.sin(Math.PI * 0.25 + rmenu.introCounter / rmenu.introEnd * Math.PI * 0.25), 3);
	rmenu.elements[i].icon.blitMask(rmenu.introTempX, rmenu.yOffset - 5, rmenu.introTempMask);
    }

    if (rmenu.introCounter >= rmenu.introEnd) {
	// Finish intro and reset
	rmenu.introCounter = 0;
	rmenu.intro = false;
	rmenu.introTempMask = CreateColor(255, 255, 255, 255);
    }
};


// rmenu.handleKeys
// Handle key inputs.
rmenu.handleKeys = function () {
    while (AreKeysLeft()) {
	switch (GetKey()) {
	case KEY_RIGHT: rmenu.shiftSelect(1); break;
	case KEY_LEFT: rmeny.shiftSelect(-1); break;
	case KEY_SPACE: rmenu.elements[rmenu.selection].onSelect(); break;
	}
    }
};

rmenu.cursor = LoadImage('cursor.png');
// rmenu.handleCursor
// Do all cursor related calculations
rmenu.handleCursor = function () {
    rmenu.targetPos = (rmenu.width * 0.5) - (rmenu.numElements * 20) + (rmenu.selection * 40) + 1;

    if (!rmenu.cursorPos)
	rmenu.cursorPos = rmenu.targetPos;

    // get distance for makeshift easing
    rmenu.cursorDist = Math.abs(rmenu.targetPos - rmenu.cursorPos);
    if (rmenu.targetPos - rmenu.cursorPos > 4)  // shift to the right
	rmenu.cursorPos += Math.min(Math.floor(rmenu.cursorDist / 10) + 1, 4) * 3;
    else if (rmenu.cursorPos - rmenu.targetPos > 4)  // shift to the left
	rmenu.cursorPos -= Math.min(Math.floor(rmenu.cursorDist / 10) + 1, 4) * 3;
    else
	rmenu.cursorPos = rmenu.targetPos;

    rmenu.cursor.blit(rmenu.cursorPos, rmenu.yOffset + 29 - Math.sin(GetTime() / 200) * 2);

    // draw selected item name in as part of the cursor
    rmenu.drawCenteredText(rmenu.cursorPos + 16, rmenu.yOffset + 42, rmenu.elements[rmenu.selection].name);
};

// ---------------------------- METHODS ---------------------------- 

// rmenu.setup(options)
// Setup the R-Menu for this game.
// Options object includes various configuration settings.
rmenu.setup = function (opt) {
    // import elements
    rmenu.elements = opt.elements;
    rmenu.numElements = opt.elements.length;

    // import other configuration
    if (opt.background1)
	rmenu.colors.background1 = opt.background1;
    if (opt.background2)
	rmenu.colors.background2 = opt.background2;

    // make background
    rmenu.background = CreateSurface(rmenu.width, rmenu.height, rmenu.colors.transparent);
    rmenu.background.gradientRectangle(0, 0, rmenu.width, rmenu.height, rmenu.colors.background1, rmenu.colors.background1, rmenu.colors.background2, rmenu.colors.background2);
    rmenu.background = rmenu.background.createImage();

    // renders
    if (opt.postRender)
	rmenu.postRender = opt.postRender;
    if (opt.preRender)
	rmenu.preRender = opt.preRender;

    rmenu.shiftSelect(0);  // update cursor
    rmenu.cursorPos = (rmenu.width * 0.5) - (rmenu.numElements * 20) + 1;  // set cursor at first point
    rmenu.ready = true;
};

// rmenu.close()
// Does what it says on the box
rmenu.close = function () {
    rmenu.run = false;
};

// rmenu.prepare()
// Prepares elements, executed before displaying
rmenu.prepare = function () {
    for(var i = 0; i < rmenu.numElements; i++)
	rmenu.elements[i].setup();
};

// rmenu.launch()
// Launch the R-Menu
rmenu.launch = function () {
    if (!rmenu.ready) return;

    rmenu.run = true;
    rmenu.intro = true;
    rmenu.prepare();

    // menu intro
    while (rmenu.intro) {
	rmenu.frametimer = GetTime();
	rmenu.background.blit(0, 0);
	rmenu.preRender();
	rmenu.introRender();
	rmenu.postRender();
	FlipScreen();
	while (GetTime() < rmenu.frametimer + 33) { }
    }

    // actual menu loop
    while (rmenu.run) {
	rmenu.frametimer = GetTime();
	rmenu.handleKeys();
	rmenu.background.blit(0, 0);
	rmenu.preRender();

	// main element rendering
	for(var i = 0; i < rmenu.numElements; i++)
	    rmenu.elements[i].render(i);

	rmenu.postRender();
	rmenu.handleCursor();
	FlipScreen();
	// frame control mechanism
	while (GetTime() < rmenu.frametimer + 33) { }
    }
};

// utils
rmenu.clamp = function (value, min, max) {
    if (min > value) return min;
    if (max < value) return max;
    return value;
};*/
