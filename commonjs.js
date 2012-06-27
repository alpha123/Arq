(function (global) {

var hasOwn = Object.prototype.hasOwnProperty;

function require(script) {
    if (hasOwn.call(require.cache, script))
	return require.cache[script];

    for (var file, path, error, data, exports = {}, i = 0; path = require.paths[i++];) {
	try {
	    file = OpenRawFile('~/' + path + (path[path.length - 1] == '/' ? script : '/' + script) + '.js');
	}
	catch (e) { error = e;  }
    }
    if (!file)
	throw new Error('Unable to load module ' + script + ': ' + error);

    data = CreateStringFromByteArray(file.read(file.getSize()));
    file.close();
    Function('exports,require,global', data).call(exports, exports, require, global);
    require.cache[script] = exports;
    return exports;
}
require.paths = ['scripts'];
require.cache = {};

global.require = require;

})(this);
