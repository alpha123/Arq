RequireScript('lithonite.js');

global.Lithonite = new LithoniteEngine('Lithonite');

exports.init = function (options, config) {
    Lithonite.setInputPerson(config.player);
    UpdateHooks.add(function () {
	if (Lithonite.calcVectors())
	    Lithonite.deObstruct();
	Lithonite.checkDashing(KEY_SHIFT);
	Lithonite.doZone();
    });

    if (Arq.hasModule('zone'))
	Arq.getModule('zone').Zone.addSymbol('effect', function (effect) { Lithonite.enZone(effect); });
};
