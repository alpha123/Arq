exports.init = function (options) {
    Object.each(options, function (fn, event) {
	Arq.hooks.createMap.add(function (mapObject) {
	    mapObject[event].add(fn);
	});
    });
};
