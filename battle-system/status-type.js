var {Loadable} = require('Arq/loadable'), StatusType = new Class({
    Implements: Loadable,

    initialize: function (options) {
	this.newLoadable(options);
	StatusType.all[this.name] = this;
    }
});

StatusType.all = {};

Loadable.setup(StatusType, {
    file: 'status-types',
    defaults: {
	name: '',
	onSet: function (partyMember) { },
	onUnset: function (partyMember) { },
	onHit: function (partyMember, attack, user) { },
	defaultRender: function (portrait, x, y, zoom, name) {
	    // portrait.zoomBlit(x, y, zoom) doesn't seem to work. The bottom and right pixels get cut off.
	    if (!this.portraitCache) this.portraitCache = {};
	    if (!this.portraitCache.hasOwnProperty(name)) {
		portrait = portrait.createSurface();
		portrait.rescale(portrait.width * zoom, portrait.height * zoom);
		this.portraitCache[name] = portrait.createImage();
	    }
	    this.portraitCache[name].blit(x, y);
	},
	render: function () { this.defaultRender.apply(this, arguments); }
    },
    process: Loadable.arrayProcessor(StatusType)
});

exports.StatusType = StatusType;
Loadable.addSymbolMethods(exports, StatusType);
