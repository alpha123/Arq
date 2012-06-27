var grayScaleMatrix = CreateColorMatrix(0,85,85,85, 0,85,85,85, 0,85,85,85);

function applyColorFX(image, x, y, w, h, colorMatrix) {
    var surface = image.createSurface();
    surface.applyColorFX(x, y, w, h, colorMatrix);
    return surface.createImage();
}
exports.applyColorFX = applyColorFX;

exports.grayScale = function (image) {
    return applyColorFX(image, 0, 0, image.width, image.height, grayScaleMatrix);
};

exports.mainColor = function (image) {
    image = image.createSurface();
    for (var colorCount = {}, pixel, rgba, x = 0, y; x < image.width; ++x) {
	for (y = 0; y < image.height; ++y) {
	    pixel = image.getPixel(x, y);
	    if (pixel.alpha > 0) {
		rgba = pixel.red + '-' + pixel.green + '-' + pixel.blue + '-' + pixel.alpha;
		colorCount[rgba] = (colorCount[rgba] >>> 0) + 1;
	    }
	}
    }
    Arq.console.info(colorCount.toSource().split(','));
    return CreateColor.apply(null, Object.keys(colorCount).sort(function (a, b) colorCount[b] - colorCount[a])[0].split('-'));
};
