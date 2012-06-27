function rgbToHsl(r, g, b) {
    // Stolen from the colorspace.js system script.
    // The reasons for me not using that script directly are complicated.

    r *= 1 / 255;
    g *= 1 / 255;
    b *= 1 / 255;

    var total = r + g + b, thirdTotal, threeOverTotal, hue, saturation, intensity, minvalue = r;

    if (g < minvalue) minvalue = g;
    if (b < minvalue) minvalue = b;

    if (total) {
	thirdTotal = total / 3;
	threeOverTotal = 3 / total;
    }

    intensity = thirdTotal;
    saturation = 1 - threeOverTotal * minvalue;

    if (saturation <= 0)
	hue = Math.PI;
    else {
	hue = 0.5 * (r - g + (r - b));
	hue = Math.acos(hue / Math.sqrt(Math.pow(r - g, 2) + (r - b) * (g - b)));

	if (b > g)
	    hue = 360..toRadians() - hue;
    }

    return [hue, saturation, intensity];
}
exports.rgbToHsl = rgbToHsl;

function hslToRgb(hue, saturation, intensity) {
    // Also stolen from colorspace.js

    var red, green, blue, hueInDegrees = Math.floor(hue.toDegrees());

    if (intensity <= 0.0001)
	return [0, 0, 0];

    if (intensity >= 1)
	return [255, 255, 255];

    if (saturation <= 0.0001)
	return [intensity * 255, intensity * 255, intensity * 255];

    if (hueInDegrees >= 0 && hueInDegrees <= 120) {
	blue = intensity * (1 - saturation);
	red = intensity * (1 + saturation * Math.cos(hue) / Math.cos(60..toRadians() - hue));
	green = 3 * intensity * (1 - (red + blue) / (3 * intensity));
    }
    else if (hueInDegrees > 120 && hueInDegrees <= 240) {
	hue -= 120..toRadians();
	green = intensity * (1 + saturation * Math.cos(hue) / Math.cos(60..toRadians() - hue));
	red = intensity * (1 - saturation);
	blue = 3 * intensity * (1 - (red + green) / (3 * intensity));
    }
    else {
	hue -= 240..toRadians();
	blue = intensity * (1 + (saturation * Math.cos(hue)) / Math.cos(60..toRadians() - hue));
	green = intensity * (1 - saturation);
	red = 3 * intensity * (1 - (green + blue) / (3.0 * intensity));
    }

    if (red > 1) red = 1;
    if (red < 0.0001) red = 0;
    if (green > 1) green = 1;
    if (green < 0.0001) green = 0;
    if (blue > 1) blue = 1;
    if (blue < 0.0001) blue = 0;

    red *= 255;
    green *= 255;
    blue *= 255;

    return [red, green, blue];
}
exports.hslToRgb = hslToRgb;

function lightnessChanger(factor) {
    return function (color, amount) {
	var [h, s, l] = rgbToHsl(color.red, color.green, color.blue);
	l += amount * factor;
	return CreateColor.apply(null, hslToRgb(h, s, l).concat(color.alpha));
    };
}

exports.lighten = lightnessChanger(1);
exports.darken = lightnessChanger(-1);


