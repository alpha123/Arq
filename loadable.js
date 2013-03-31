var loading = require('Arq/loadscreen').loading;

// For some reason Object.merge doesn't do the trick
function merge(o1, o2) {
    for (var i in o2) {
        if (o2.hasOwnProperty(i))
            o1[i] = o2[i];
    }
}

var Loadable = new Class({
    newLoadable: function (object) {
	var options = this.constructor.loadableOptions;
	(options.beforeMerge || function () { })(object, this);
        Object.append(this, object);
        merge(this, options.members || {});
        Object.each(options.defaults || {}, function (value, key) {
            if (this[key] == null)
                this[key] = value;
        }, this);
        (options.afterMerge || function () { })(this, object);
    }
});

Loadable.setup = function (loadable, options) {
    options = loadable.loadableOptions = Object.merge({
	beforeMerge: function () { },
	afterMerge: function () { },
	defaults: {},
	members: {},
	symbols: {},
	process: function () { },
	file: ''
    }, options);

    loadable.extend({
	isLoaded: false,
        _load: function (file) {
	    if (Arq.fileExists(file)) {
		if (options.requires) {
		    Array.from(options.requires).each(function (otherLoadable) {
			otherLoadable.load();
			if (typeOf(otherLoadable.all) == 'object')
			    loadable.addSymbols(otherLoadable.all);
		    });
		}
		loading(file.slice(file.lastIndexOf('/') + 1, -3).replace(/-/g, ' '));
		options.process(Loadable.load(file, options.symbols));
	    }
        },
	load: function () {
	    if (!loadable.isLoaded) {
                loadable._load('~/scripts/' + options.file + '.js');
		loadable.isLoaded = true;
	    }
	},
	symbols: options.symbols,
	addSymbol: function (name, value) {
	    loadable.symbols[name] = value;
	},
	addSymbols: function (symbols) {
	    Object.append(loadable.symbols, symbols);
	},
	removeSymbol: function (name) {
	    var value = loadable.symbols[name];
	    delete loadable.symbols[name];
	    return value;
	},
	__noSuchMethod__: function (method, values) {
	    if (typeOf(loadable.all) != 'object')
		throw new TypeError;

	    var all = loadable.all;
	    if (method.startsWith('object')) {
		all = values.shift();
		method = method.slice(6).uncapitalize();
	    }

            if (method.startsWith('findBy')) {
		method = method.slice(6).uncapitalize();
		return Object.filter(all, function (v) values.contains(v[method]));
	    }
	    else if (method.startsWith('findFirstBy')) {
		method = method.slice(11).uncapitalize();
		return all[Object.keys(all).find(function (k) values.contains(all[k][method]))];
	    }
	    else
		throw new TypeError;
	}
    });
};

Loadable.load = function (fileName, symbols, thisObj) {
    var file = OpenRawFile(fileName),
    fn = Function(Object.keys(symbols).join(','), 'return ' + CreateStringFromByteArray(file.read(file.getSize())));
    file.close();
    return fn.apply(thisObj, Object.values(symbols));  // Relies on the fact that values are returned in the same order as keys -- bad idea, although it's true for SpiderMonkey and not likely to change.
};


// Convienence functions

Loadable.arrayProcessor = function (loadable) {
    return function (loaded) {
	loaded.each(function (thing) { new loadable(thing); });
    };
};

Loadable.createSymbols = function () {
    var symbols = [];
    Array.from(arguments).each(function (e) {
        if (e.name)
            symbols.push({name: e.name, value: e.value});
        else
            symbols.push.apply(symbols, (e.add || Loadable.createSymbols['add' + typeOf(e.value).capitalize()])(e.value));
    });
    return symbols;
};

Loadable.createSymbols.addObject = function (object) {
    return Object.keys(object).map(function (k) { return {name: k, value: object[k]}; });
};

Loadable.createSymbols.addArray = function (array) {
    return array.map(function (e, i) { return {name: e.name || i, value: e}; });
};

Loadable.addSymbolMethods = function (exportsObject, loadable) {
    exportsObject.addSymbol = loadable.addSymbol;
    exportsObject.addSymbols = loadable.addSymbols;
    exportsObject.removeSymbol = loadable.removeSymbol;
};

exports.Loadable = Loadable;
