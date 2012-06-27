//___________________________________
//                                   \
// PRECIPITATION Factory.  version 2.3
//___________________________________/


/*
 Make it snow, make it rain.

 Usage:

 Initialization code (load library and create a SnowFactory object):

   var {SnowFactory, RainFactory} = require("precipitation.js");
   var SnowField = new SnowFactory({amount: 100, image: LoadImage("snowflake.png"), wind: 1});
 
 Update code (add SnowField.update() and SnowField.render() to your renderscript):

   SetRenderScript("Render_Update()");
   function Render_Update()
   {
    SnowField.update();
    SnowField.render();
   }

 If you want snow to start falling as soon as we enter the map,
 then put the following line in its Entry Script:

   SnowField.start();


 Known Bugs: 
	When walking down, snow decreases, patched with randomness.
	When changing maps, call start() again or recalcOffset() 
	to make it snow/rain inside the screen. Also dont forget to set 
	.options.justStarted=false or it will look like it just starting precipitating.

*******************************************************************************
 Functions in this library:

SnowFactory(options)
	Create a new SnowFactory object. Options:
	amount: Amount of snowflakes. Defaults to 80.
	image: Image to be used for snowflakes.
	justStarted: Does it start snowing, or is it already snowing? Defaults to true.
	wind: 0 for no wind, -1 or 1 for slow wind, 10 is a storm. Makes the snow go diagonal. Defaults to 0.
	speed: Number of pixels the flake falls each update. Defaults to 1.
	random: Makes the snowflakes fall in a non-straight line. Defaults to 3.
	example:
		var SnowField = new SnowFactory({amount: 100, image: LoadImage("snowflake.png"), wind: 1});

start()
	Start snowing. (And starts using lots of CPU power ^_^ ) 
	example:
		SnowField.start();

running
	Is true if it is snowing (snowflakes are active)
	example:
		if (SnowField.running) {}

more
	Is true if new snowflakes are being generated.
	example:
		if (SnowField.more) {}

kill()
	It abruptly stops snowing.
	example:
		SnowField.kill();

stop()
	No new snowflakes will be generated. It will take a while until
	`running` is false.
	example:
		SnowField.stop();

setWind(wind)
	Set a new value for wind (can be called while it is snowing). Equivalent
	to simply setting RainField.options.wind.
	example:
	        SnowField.setWind(10);
		// or
		SnowField.options.wind = 10;

*******************************************************************************

RainFactory(amount, splashsprite, splashdirection, juststarted, wind,
				dropspeed, droplength, raincolor, thunder_probability, thundercolor)
	Create a new SnowFactory object. Options:
	amount: Amount of raindrops. Defaults to 50.
	splashSprite: A Sphere spriteset object for the splash, or null for no splash. Defaults to null.
	splashDirection: The direction of `splashSprite` that contains the splash animation. Defaults to 'splash'.
	justStarted: Does it start raining, or is it already raining? Defaults to true.
	wind: 0 for no wind, -1 or 1 for slow wind, 10 is a storm. Makes the rain go diagonal. Defaults to 0.
	speed: Amount of pixels the rain falls each update. Defaults to 8.
	dropLength: Length of the line representing a falling raindrop. Defaults to 40.
	dropColor: The color of aforementioned lines. Defaults to rgba(200, 230, 250, 100).
	thunderProbability: The frequency of thunder. 0 is recommended, else a very small number, like 0.007. Defaults to 0.
			(no sound though, maybe if someone added real thunder...)
	thunderColor: The color the screen will turn to when thundering. Defaults to rgba(200, 230, 250, 100).

	example:
		var RainField = new RainFactory({
		    amount: 80,
		    splashSprite: LoadSpriteset('rain.rss'),
		    wind: -2,
		    thunderProbability: 0.002
		});

start()
	Start raining. (And starts using lots of CPU power ^_^ ) 
	example:
		RainField.start();

running
	Is true if it is raining (raindrops are active)
	example:
		if (RainField.running) {}

more
	Is true if new raindrops are being generated.
	example:
		if (RainField.more) {}

kill()
	It abruptly stops raining.
	example:
		RainField.kill();

stop()
	No new raindrops will be generated. It will take a little while until
	`running` is false.
	example:
		RainField.stop();

setWind(wind)
	Set a new value for wind (can be called while it's raining). This does
	some recalculation behind the scenes so simply `RainField.options.wind = 10`
	won't work.
	example:
	       RainField.setWind(10);

*******************************************************************************

update()/render()
	Renders the snow/rain to the screen. Put these inside a render script.
	The map engine must be running when you call them.
	It is very efficient when it's not precipitating, so don't do:
	if (RainField.running)) { RainField.update(); RainField.render(); } // BAD! DON'T!
	examples:
		SnowField.update();
		SnowField.render();
		RainField.update();
		RainField.render();

		They are separate because I value separation of concerns. Practically
		though, it allows you to pause the snow/rain by only calling render() and
		not update(), or to skip a few frames by calling update() without render().
*/
//----------------------------------------------------------------------------//

// Original credit to FutureBoyNil

var floor = Math.floor, random = Math.random,
screenWidth = GetScreenWidth(), screenHeight = GetScreenHeight(),
screenHeight80 = screenHeight + 80, screenHeight120 = screenHeight + 120,
defaultDropColor = CreateColor(200, 230, 250, 100),
Precipitation = new Class({
    Implements: Events,

    offsetX: 0,
    offsetY: 0,
    running: false,
    more: false,
    all: [],

    update: function () { return this; },

    render: function () { return this; },

    recalcOffset: function () {
	this.offsetX = IsMapEngineRunning() ? MapToScreenX(0, 0) : 0;
	this.offsetY = IsMapEngineRunning() ? MapToScreenY(0, 0) : 0;
	return this;
    },

    start: function () {
	this.running = true;
	this.more = true;
	this.recalcOffset();
	this.update = this._update;
	this.render = this._render;
	this._start();
	this.fireEvent('start');
	return this;
    },

    stop: function () {
	this.more = false;
	this.fireEvent('stop');
	return this;
    },

    kill: function () {
	this.running = false;
	this.stop();
	this.update = this.constructor.prototype.update;
	this.render = this.constructor.prototype.render;
	this.fireEvent('kill');
	return this;
    },

    buildAll: function (amount, justStarted) {
	amount.times(function (i) {
	    this.all[i] = {
		x: floor(random() * screenWidth),
		y: justStarted ? screenHeight + 5 : floor(random() * screenHeight) - 5,
		h: floor(random() * screenHeight) + 10,
		w: 1,
		render: true
	    };
	}, this);
	return this;
    }
}),
SnowFactory = new Class({
    Implements: [Precipitation, Options],

    options: {
	image: null,
	justStarted: true,
	speed: 1,
	wind: 0,
	amount: 80,
	random: 3
    },

    initialize: function (options) {
	this.setOptions(options);
	this.options.image = options.image;  // setOptions tries to copy the image
    },

    _start: function () {
	this.buildAll(this.options.amount, this.options.justStarted);
    },

    _update: function () {
	var done = true, newOffsetX = MapToScreenX(0, 0) - this.offsetX,
	    newOffsetY = MapToScreenY(0,0) - this.offsetY;

	this.offsetX += newOffsetX; 	
	this.offsetY += newOffsetY;
	this.all.each(function (flake) {
	    if (--flake.h > 0) {
		done = false;

		flake.x = (flake.x + newOffsetX) % screenWidth;

		if (flake.x < 0)
		    flake.x += screenWidth;
		if (newOffsetY)
		    flake.y = (flake.y + newOffsetY) % screenHeight80;

		if (flake.h > 100) {
		    flake.x += floor(random() * this.options.random) + this.options.wind;
		    flake.y += this.options.speed;
		}
	    }
	    else {
		if (this.more) {
		    flake.x = floor(random() * screenWidth);
		    if (newOffsetY < 0)
			flake.y = floor(random() * screenWidth) - 5;
		    else
			flake.y = -5;
		    flake.h = floor(random() * screenHeight120);
		}
		else {
		    flake.h = 0;
		    flake.render = false;
		}
	    }
	}, this);

	if (done)
	    this.kill();

	return this;
    },

    _render: function () {
	var image = this.options.image;
	this.all.each(function (flake) {
	    if (flake.render)
		image.zoomBlit(flake.x, flake.y, flake.h * 0.00285 + 0.1);
	});
	return this;
    },

    setWind: function (wind) {
	this.options.wind = wind;
	return this;
    }
}),
RainFactory = new Class({
    Implements: [Precipitation, Options],

    options: {
	splashSprite: null,
	splashDirection: 'splash',
	justStarted: true,
	thunderProbability: 0,
	thunderColor: defaultDropColor,
	dropColor: defaultDropColor,
	dropLength: 40,
	speed: 8,
	wind: 0,
	amount: 80
    },

    lx: 0,
    ly: 0,
    splashImages: [],

    initialize: function (options) {
	var splashSprite = options.splashSprite, theta;
	delete options.splashSprite;
	this.setOptions(options);
	this.options.splashSprite = splashSprite;
	this.options.thunderColor = options.thunderColor || defaultDropColor;
	this.options.dropColor = options.dropColor || defaultDropColor;

	var theta = this.options.wind ? Math.atan(this.options.speed / this.options.wind) : Math.PI / 2;
	this.lx = -floor(Math.cos(theta) * this.options.dropLength);
	this.ly = -floor(Math.sin(theta) * this.options.dropLength);

	if (splashSprite) {
	    splashSprite.directions.filter(function (d) d.name == this.options.splashDirection, this)[0]
		.frames.each(function (frame) {
		    this.splashImages.push(splashSprite.images[frame.index]);
		}, this);
	}
    },

    _start: function () {
	this.buildAll(this.options.amount, this.options.justStarted);
	this.all.each(function (drop) {
	    drop.frame = 0;
	    if (this.options.justStarted)
		drop.y = -floor(random() * screenHeight);
	}, this);
    },

    _update: function () {
	var done = true, newOffsetX = MapToScreenX(0, 0) - this.offsetX,
	newOffsetY = MapToScreenY(0, 0) - this.offsetY;

	this.offsetX += newOffsetX; 	
	this.offsetY += newOffsetY;

	this.all.each(function (drop) {
	    if (--drop.h > 0) {
		done = false;
		if (drop.h < 100) {
		    if (this.splashImages.length) {
    			if (newOffsetX)
			    drop.x = (drop.x + newOffsetX) % screenWidth;
    			if (drop.x < 0)
			    drop.x += screenWidth;
    			if (newOffsetY)
			    drop.y = (drop.y + newOffsetY) % screenHeight;
		    }
		    else {
			drop.x = (drop.x + this.options.wind + newOffsetX) % screenWidth;
    			if (drop.x < 0)
			    drop.x += screenWidth;
			drop.y = (drop.y + this.options.speed + newOffsetY) % screenHeight;
		    }
		}
		else {
		    drop.x = (drop.x + this.options.wind + newOffsetX) % screenWidth;
    		    if (drop.x < 0)
			drop.x += screenWidth;
		    drop.y = (drop.y + this.options.speed + newOffsetY) % screenHeight;
		}
	    }
	    else {
		if (this.more) {
		    drop.y = floor(random() * screenHeight);
		    drop.h = floor(random() * screenHeight);
		    drop.i = 0;
		    if (random() < this.options.thunderProbability)
			ApplyColorMask(this.options.thunderColor);
		}
		else {
		    drop.h = 0;
		    drop.render = false;
		}
	    }
	}, this);

	if (done)
	    this.kill();

	return this;
    },

    _render: function () {
	var doSplash = this.splashImages.length;
	this.all.each(function (drop) {
	    if (drop.render) {
		if (doSplash) {
		    this.splashImages[drop.frame].blit(drop.x, drop.y);
    		    if (++drop.frame == doSplash)
			drop.h = 0;
		}
		else
    		    Line(drop.x, drop.y, drop.x + this.lx, drop.y + this.ly, this.options.dropColor);
	    }
	}, this);

	return this;
    },

    setWind: function (wind) {
	this.options.wind = wind;
	var theta = wind ? Math.atan(this.options.speed / wind) : Math.PI / 2;
	this.lx = -floor(Math.cos(theta) * this.options.dropLength);
	this.ly = -floor(Math.sin(theta) * this.options.dropLength);
	return this;
    }
});

exports.SnowFactory = SnowFactory;
exports.RainFactory = RainFactory;
