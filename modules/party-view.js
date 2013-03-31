// View layer for party module

var {SpriteFactory} = require('Arq/spritefactory'), {PartyMember} = require('Arq/modules/party'),
unhandleSpeed = function () { }, options = {};

// Tie the person's speed to their speed stat
function handleSpeed(member) {
    function doHandleSpeed(speed) {
	speed = 0.8 + speed * 0.2;
	SetPersonSpeed(member.mapName, speed);
	Lithonite.setSpeeds(speed, speed, speed + 0.75, speed + 0.75, speed - 0.4, speed - 0.4);
	Lithonite.resetSpeed();
    }

    doHandleSpeed(member.speed.current);
    member.speed.addEvent('change', doHandleSpeed);

    function doStamina() {
	if (Lithonite.justStopped()) {
	    member.stamina.heal(0.1);
	    if (member.stamina.current > 1 / member.stamina.max * 0.5)
		member.speed.heal(member.stamina.current / 5);
	}
	else {
            if (Lithonite.isDashing)
	        member.stamina.damage(0.1);
	    if (member.stamina.current < 1)
		member.speed.damage(1 / member.stamina.current / 10);
	}
    }
    var staminaTimer = doStamina.periodical(2000);

    unhandleSpeed = function () {
	member.speed.removeEvent('change', doHandleSpeed);
	clearInterval(staminaTimer);
    };
}

// Handle creating/destroying of party members
function activate() {
    if (!this.isInput) {
	CreatePerson(this.mapName, this.mapName + '.rss', false);
	SetPersonSpriteset(this.mapName, this.spriteset);
	FollowPerson(this.mapName, Arq.config.player, this.spriteset.images[0].width);
    }
}

function deactivate() {
    if (!this.isInput)
	DestroyPerson(this.mapName);
}

// Mess around with the input person
PartyMember.hooks.setInput.add(function (member) {
    if (options.showParty) {
	Object.each(PartyMember.active, function (m) {
	    FollowPerson(m.mapName, '', 0);
	});
    }
    else {
	DetachInput();
	DestroyPerson(input);
	CreatePerson(member.mapName, member.mapName + '.rss', false);
	SetPersonSpriteset(member.mapName, member.spriteset);
    }

    if (IsMapEngineRunning()) {
	var input = Lithonite.GIP, x = GetPersonX(input), y = GetPersonY(input),
            layer = GetPersonLayer(input), direction = GetPersonDirection(input);
	SetPersonX(member.mapName, x);
	SetPersonY(member.mapName, y);
	SetPersonLayer(member.mapName, layer);
	SetPersonDirection(member.mapName, direction);
    }

    AttachInput(member.mapName);
    AttachCamera(member.mapName);
    Lithonite.setInputPerson(member.mapName);

    if (options.showParty) {
	Object.each(PartyMember.active, function (m) {
	    if (!m.isInput)
		FollowPerson(m.mapName, member.mapName, Math.max.apply(Math, m.spriteset.images.pluck('width')));
	});
    }

    unhandleSpeed();
    handleSpeed(member);
});

// Display spriteset updates
function changeSpriteset(newSpriteset) {
    if (this.isActive && DoesPersonExist(this.mapName))
	SetPersonSpriteset(this.mapName, newSpriteset);
}

// Display equipment
function mixSprite(partyMember) {
    if (!partyMember.isActive)
	return;
    var sprite = new SpriteFactory(partyMember.originalSpriteset);
    Object.each(partyMember.equipment, function (equip) {
	if (equip)
	    sprite.overMix(equip.spriteset);
    });
    partyMember.spriteset = sprite.spriteset;
}

exports.init = function (opts) {
    options = opts;

    if (!opts.tieSpeedToStamina)  // Because handleSpeed is also used in the setInput hook.
	handleSpeed = function () { };

    PartyMember.hooks.init.add(function (member) {
	if (member.isInput)
	    handleSpeed(member);

	if (opts.showEquipment || opts.showParty)
	    member.addEvent('changeSpriteset', changeSpriteset);

	if (opts.showEquipment) {
	    Arq.hooks.start.add(mixSprite.pass(member));
	    member.addEvent('changeEquipment', mixSprite.pass(member));
	}

	if (opts.showParty) {
	    member.addEvent('activate', activate);
	    member.addEvent('deactivate', deactivate);
	}
    });
};

exports.mixSprite = mixSprite;
