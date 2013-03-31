var {BasicEvent} = require('Arq/basic-event'),
{Loadable} = require('Arq/loadable'),
{loading} = require('Arq/loadscreen'),
Trigger = new Class({
    Implements: BasicEvent,
    file: 'events/triggers'
});
BasicEvent.setup(Trigger);

Trigger.load = function () {
    if (Trigger.isLoaded)
	return;
    loading('triggers');
    var process = Trigger.loadableOptions.process;
    GetFileList('~/scripts/triggers').each(function (file) {
	process(Trigger._load(file, Trigger.symbols));
    });
    process(Trigger._load('~/scripts/events/triggers.js'), Trigger.symbols);
    Trigger.isLoaded = true;
};

function doTrigger(id) {
    var trigger = Trigger.all[GetCurrentMap() + '/' + id] || Trigger.all[id];
    if (!trigger)
	Arq.logError('trigger "' + id + '" does not exist');
    else
        return trigger.run();
}

exports.init = BasicEvent.initFunction(Trigger, 'doTrigger', doTrigger);
exports.load = BasicEvent.loadFunction(Trigger);
exports.save = BasicEvent.saveFunction(Trigger);

Loadable.addSymbolMethods(exports, Trigger);

exports.Trigger = Trigger;
exports.doTrigger = doTrigger;
