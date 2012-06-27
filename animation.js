exports.Animation = new Class({
    Implements: Events,

    frame: 0,
    delayCounter: 0,

    initialize: function (spriteset, direction, loop) {
	this.spriteset = spriteset;
	this.direction = direction;
	this.frames = this.spriteset.directions.find(function (d) d.name == direction).frames;
	this.loop = !!loop;

	this.boundUpdate = this.update.bind(this);
	this.boundRender = this.render.bind(this);
    },

    update: function () {
	if (++this.delayCounter >= this.frames[this.frame].delay) {
	    this.frame = this.frame.wrap(0, this.frames.length - 1);
	    this.delayCounter = 0;
	}

	if (this.frame == this.frames.length - 1 && !this.loop)
	    this.stop();
    },

    render: function () {
	this.callback(this.spriteset.images[this.frames[this.frame].index]);
    },

    play: function (callback) {
	if (!arguments.length) throw new Error('Animation#play needs a callback');

	if (arguments.length == 2) {
	    var [x, y] = arguments;
	    callback = function (image) {
		image.blit(x, y);
	    };
	}

	this.callback = callback;

	// I have no idea why I have to add this next line, but if I don't, it often fails to update.
	UpdateHooks.add(function () true);
	UpdateHooks.add(this.boundUpdate);
	RenderHooks.add(this.boundRender);

	this.fireEvent('play', callback);
    },

    stop: function () {
	this.frame = 0;
	this.delayCounter = 0;
	UpdateHooks.remove(this.boundUpdate);
	RenderHooks.remove(this.boundRender);
	this.fireEvent('stop');
    }
});
