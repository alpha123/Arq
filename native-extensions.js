// Utilities I use not found in MooTools

(function (undefined) {

String.implement('startsWith', function (substring) {
    return this.indexOf(substring) == 0;
});

String.implement('endsWith', function (substring) {
    return this.length >= substring.length && this.lastIndexOf(substring) == this.length - substring.length;
});

String.implement('uncapitalize', function () {
    return this.replace(/\b[A-Z]/g, function (c) c.toLowerCase());
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

Function.implement('argumentNames', function () {
    var source = '' + this;
    return source.substring(source.indexOf('(') + 1, source.indexOf(')')).split(', ');
});

Function.implement('optional', function (defaults) {
    if (typeOf(defaults) != 'array')
        defaults = Array.from(arguments);

    var fn = this,
    // Jump through a few hoops so that this works with Function#keywords
    newFn = Function(fn.argumentNames().join(','), ('' + function () {
        var args = Array.from(arguments), defaults = arguments.callee.__defaultargs;
        for (var i = 0, l = defaults.length; i < l; ++i) {
            if (args[i] == null)
                args[i] = defaults[i];
        }
        return arguments.callee.__originalfn.apply(this, args);
    }).slice(13, -1));
    newFn.__defaultargs = defaults;
    newFn.__originalfn = fn;
    return newFn;
});

Function.implement('keywords', function () {
    var fn = this, names = arguments.length ? typeOf(arguments[0]) == 'array' ? arguments[0] :
	                   Array.from(arguments) : fn.argumentNames();

    return function () {
        if (arguments.length == 1 && typeOf(arguments[0]) == 'object')
            return fn.apply(this, Object.values(Object.subset(arguments[0], names)));
        return fn.apply(this, arguments);
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
