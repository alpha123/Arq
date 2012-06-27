function loadModules(modules, fake) {
    modules.each(function (module) {
	require('Arq/debug/' + module).init(fake);
    });
}

exports.init = function (options) {
    if (options.fake)
	loadModules(options.fake, true);
    if (options.load)
	loadModules(options.load, false);

    var log = OpenLog('debug.log');
    Arq.logDebug = log.write.bind(log);
};
