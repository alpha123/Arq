var BasicEvent = require('Arq/basic-event').BasicEvent,
addSymbolMethods = require('Arq/loadable').Loadable.addSymbolMethods,
Zone = new Class({
    Implements: BasicEvent,
    file: 'events/zones'
});
BasicEvent.setup(Zone);

function doZone(id) {
    if (!Zone.all[id])
	Arq.logError('zone "' + id + '" does not exist');
    Zone.all[id].run();
}

exports.init = BasicEvent.initFunction(Zone, 'doZone', doZone);
exports.load = BasicEvent.loadFunction(Zone);
exports.save = BasicEvent.saveFunction(Zone);

addSymbolMethods(exports, Zone);

exports.Zone = Zone;
exports.doZone = doZone;
