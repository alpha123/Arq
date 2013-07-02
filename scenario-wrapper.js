var colors = {
    black: CreateColor(0, 0, 0),
    blue: CreateColor(0, 0, 255),
    green: CreateColor(0, 255, 0),
    red: CreateColor(255, 0, 0),
    white: CreateColor(255, 255, 255)
    // TODO: Fill in or remove some later.
};

// Handle ArqScript atoms
function atomName(atomOrString) {
    return typeof atomOrString == 'object' && 'name' in atomOrString ?
        atomOrString.name : atomOrString;
}

function inRange(a, b, range) {
    return b <= a + range && b >= a - range;
}

exports.wrapScene = function (scene) {
    return {
        Walk: function (person, direction, tiles, speed) {
            person = atomName(person);
            direction = atomName(direction);
            if (speed == null) speed = 1;

            var isVertical = direction == 'n' || direction == 's',
                pixelsPerTile = isVertical ? GetTileHeight() : GetTileWidth(),
                pixels = pixelsPerTile * tiles;
            // Walk to the edge of the current tile first.
            pixels += Math.floor((isVertical ? GetPersonY : GetPersonX)(person) / pixelsPerTile);
            scene.movePerson(person, direction, pixels, speed, true);
        },
        Turn: function (person, direction, toward) {
            // Both `direction` and `toward` so that ArqScript's keyword arguments
            // can pick which one:
            //    Turn('guy, 'west);
            //    Turn('guy, toward: 'harry);
            person = atomName(person);
            var dirX, dirY, personX = GetPersonX(person), personY = GetPersonY(person),
                towardX, towardY;
            if (toward != null) {
                toward = atomName(toward);
                towardX = GetPersonX(toward);
                towardY = GetPersonY(toward);
                dirX = inRange(personX, towardX, GetPersonData(toward).width) ? '' : personX > towardX ? 'west' : 'east';
                dirY = inRange(personY, towardY, GetPersonData(toward).height) ? '' : personY > towardY ? 'north' : 'south';
                scene.facePerson(person, dirX + dirY);
            }
            else  // Assume `direction`; `toward` has priority over `direction`
                scene.facePerson(person, atomName(direction));
        },
        PanTo: function (x, y, duration) {
            scene.panTo(x, y, duration);
        },
        FadeTo: function (color, duration) {
            scene.fadeTo(colors[color] || colors[color.name] || color, duration);
        },
        XCoord: function (person) GetPersonX(atomName(person)),
        YCoord: function (person) GetPersonY(atomName(person))
    };
};
