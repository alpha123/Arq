exports.init = function (options) {
    Arq.hooks.createMap.add(function (mapObject) {
	Object.append(mapObject, options);
    });
};
