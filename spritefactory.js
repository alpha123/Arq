// Original credit to FutureBoyNil

var Spritesets = require('Arq/resources').Spritesets, transparent = CreateColor(0, 0, 0, 0);

function spritesetObject(spritesetOrName) {
    return typeof spritesetOrName == 'string' ? Object.get(Spritesets, spritesetOrName) : spritesetOrName;
}

exports.SpriteFactory = new Class({
    initialize: function (spriteset) {
	this._spriteset = spritesetObject(spriteset).clone();
	this.__defineGetter__('spriteset', (function () this._spriteset).bind(this));
	this.__defineSetter__('spriteset', function (spriteset) {
	    this._spriteset = spritesetObject(spriteset).clone();
	}.bind(this));
    },

    applyColorMatrix: function (colors) {
	var images = this.spriteset.images;
	images.each(function (image, index) {
   	    var surface = image.createSurface();
	    surface.applyColorFX(0, 0, surface.width, surface.height, colors);
	    images[index] = surface.createImage();
	});
	return this;
    },

    underMix: function (spriteset, colors, fixTransparencies) {
	var sprite = this.spriteset;
	this.spriteset = spriteset;
	if (colors)
	    this.applyColorMatrix(colors);
	return this.overMix(sprite, null, fixTransparencies);
    },

    overMix: function (spriteset, colors, fixTransparencies) {
	spriteset = spritesetObject(spriteset);
	var images = this.spriteset.images, directions = this.spriteset.directions, doneImages = [];
	directions.each(function (direction) {
	    var otherDirection = spriteset.directions.filter(function (d) d.name == direction.name)[0];
	    if (!otherDirection)
		return;

	    if (otherDirection.frames.length < direction.frames.length)
		throw new Error('SpriteFactory#overMix: Too few frames in first argument direction "' + otherDirection.name + '"');

	    direction.frames.each(function (frame, index) {
		var imageIndex = frame.index, thisImage, mixImage, x, y, color;

		if (doneImages[imageIndex])
		    return;

		doneImages[imageIndex] = true;
		thisImage = images[imageIndex].createSurface();
		mixImage = spriteset.images[otherDirection.frames[index].index].createSurface();

		if (colors)
		    mixImage.applyColorFX(0, 0, mixImage.width, mixImage.height, colors);

		thisImage.blitSurface(mixImage, 0, 0);

		if (fixTransparencies) {
		    thisImage.setBlendMode(REPLACE);
		    y = thisImage.height - 1;
		    do {
			x = thisImage.width - 1;
			do {
			    color = mixImage.getPixel(x, y);
			    if (color.alpha == 1)
				thisImage.setPixel(x, y, transparent);
			}  while (x--);
		    } while (y--);
		}
		images[imageIndex] = thisImage.createImage();
	    });
  	});
	return this;
    }
});
