var BasicEvent = require('Arq/basic-event').BasicEvent,
addSymbolMethods = require('Arq/loadable').Loadable.addSymbolMethods,
Trigger = new Class({
    Implements: BasicEvent,
    file: 'events/triggers'
});
BasicEvent.setup(Trigger);

function doTrigger(id) {
    if (!Trigger.all[id])
	Arq.logError('trigger "' + id + '" does not exist');
    Trigger.all[id].run();
}

exports.init = BasicEvent.initFunction(Trigger, 'doTrigger', doTrigger);
exports.load = BasicEvent.loadFunction(Trigger);
exports.save = BasicEvent.saveFunction(Trigger);

addSymbolMethods(exports, Trigger);

exports.Trigger = Trigger;
exports.doTrigger = doTrigger;
