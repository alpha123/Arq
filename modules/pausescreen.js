var {PauseScreen} = require('Arq/pausescreen');

function showPauseScreen() {
    if (Arq.hasModule('party'))
	new PauseScreen(Arq.getModule('party').PartyMember.active).show();
}

exports.init = function () {
    KeyHooks.escape.add(showPauseScreen);
};
