// Utilities I use not found in MooTools

(function () {

String.implement('startsWith', function (substring) {
    return this.indexOf(substring) == 0;
});

String.implement('endsWith', function (substring) {
    return this.length >= substring.length && this.lastIndexOf(substring) == this.length - substring.length;
});

String.implement('uncapitalize', function () {
    return this.replace(/\b[A-Z]/g, function (c) c.toLowerCase());
});

String.implement('reverse', function () {
    return this.split('').reverse().join('');
});

String.implement('each', function (fn) {
    this.split('').each(fn);
    return this;
});

// See http://stackoverflow.com/questions/8588449/node-js-how-many-bits-in-a-string
String.implement('sizeInBytes', function () {
    return this.split('').map(function (c) c.charCodeAt(0)).reduce(function (bytes, c) {
	if (c <= 0x007f) return bytes + 1;
	else if (c <= 0x07ff || (c >= 0xd800 && c <= 0xdfff)) return bytes + 2;
	else return bytes + 3;
    }, 0);
});

// Taken verbatim from MooTools More
var conversions = {	
    ms: 1,
    s: 1000,
    m: 6e4,
    h: 36e5
},	
findUnits = /(\d*.?\d+)([msh]+)/;

String.implement('ms', function () {
    // "Borrowed" from https://gist.github.com/1503944
    var units = findUnits.exec(this);
    if (units == null) return Number(this);
    return Number(units[1]) * conversions[units[2]];
});


Number.implement('wrap', function (min, max, inc) {
    if (typeof inc != 'number') inc = 1;

    if (inc < 0)
	return this + inc < min ? max : this + inc;
    return this + inc > max ? min : this + inc;
});

Number.implement('padDigits', function (digits) {
    return Array((digits - String(this).length + 1).max(0)).join(0) + this;
});

Number.implement('toDegrees', function () {
    return this * 57.29577951308232;
});

Number.implement('toRadians', function () {
    return this * 0.017453292519943295;
});

Number.implement('sgn', function () {
    return this == 0 ? 0 : this < 0 ? -1 : 1;
});


Function.implement('reverseOrder', function () {
    var self = this;
    return function () {
	return self.apply(this, Array.reverse(arguments));
    };
});

Function.implement('useOnly', function () {
    var self = this, valid = Array.from(arguments);
    return function () {
	return self.apply(this, Array.filter(arguments, function (_, i) valid.contains(i)));
    };
});

Function.implement('chain', function (next) {
    var self = this;
    return function () {
	self.apply(this, arguments);
	next.apply(this, arguments);
    };
});


Array.implement('find', function (fn) {
    return this.filter(fn)[0];
});

Array.implement('pluck', function (key) {
    return this.map(function (thing) Object.get(thing, key));
});


Object.extend('create', function (object) {  // NOT ES5 COMPLIANT!
    function F() { }
    F.prototype = object;
    return new F;
});

function lastPathPart(object, path) {
    path = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');
    var parts = path.split('.'), key, last = parts.pop();
    while (parts.length) {
        key = parts.shift();
        if (key in object)
            object = object[key];
        else
            return [];
    }
    return [object, last];
}

Object.extend('get', function (object, path) {
    var parts = lastPathPart(object, path), deepObject, lastPart;
    if (!parts.length) return undefined;
    [deepObject, lastPart] = lastPathPart(object, path);
    return deepObject[lastPart];
});

Object.extend('set', function (object, path, value) {
    var parts = lastPathPart(object, path), deepObject, lastPart;
    if (!parts.length) {
        path = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');
        parts = path.split('.');
        parts.pop();
        Object.set(object, parts.join('.'), {});
    }
    [deepObject, lastPart] = lastPathPart(object, path);
    deepObject[lastPart] = value;
    return value;
});

Object.extend('bindAll', function (object, target) {
    return Object.map(object, function (fn) fn.bind(target));
});

Object.extend('invoke', function (object) {
    var args = Array.prototype.slice.call(arguments, 1);

    return Array.invoke.apply(Array, [Object.values(object)].concat(args));
});

})();
