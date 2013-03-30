// This script was originially adapted from Flik's movement.js, but I'm pretty sure none of his code remains.

var hasOwn = Object.prototype.hasOwnProperty, private_ = require('Arq/private'), [callbacks, callbacksKey] = private_.array(),
fullDirections = {
    n: 'NORTH',
    s: 'SOUTH',
    e: 'EAST',
    w: 'WEST'
},
moveCommands = {
    N: [COMMAND_MOVE_NORTH],
    S: [COMMAND_MOVE_SOUTH],
    E: [COMMAND_MOVE_EAST],
    W: [COMMAND_MOVE_WEST],
    Ne: [COMMAND_MOVE_NORTH, COMMAND_MOVE_EAST],
    Nw: [COMMAND_MOVE_NORTH, COMMAND_MOVE_WEST],
    Se: [COMMAND_MOVE_SOUTH, COMMAND_MOVE_EAST],
    Sw: [COMMAND_MOVE_SOUTH, COMMAND_MOVE_WEST],
    D: [COMMAND_WAIT]
};

function canMoveDirection(person, direction, tiles) {
    return canMove(person, global['COMMAND_MOVE_' + direction.toUpperCase()], tiles);
}

function canMove(person, command, tiles) {
    function checkObstruction(xOffset, yOffset) {
	for (var i = 0, x = GetPersonX(person), y = GetPersonY(person), distance = GetTileHeight() * tiles; i < distance; ++i) {
	    if (IsPersonObstructed(person, x + i * xOffset, y + i * yOffset))
		return false;
	}
	return true;
    }

    var coords = {
	10: [0, -1], // COMMAND_MOVE_NORTH
	11: [1, 0],  // COMMAND_MOVE_EAST
	12: [0, 1],  // COMMAND_MOVE_SOUTH
	13: [-1, 0], // COMMAND_MOVE_WEST
    };

    return command == COMMAND_WAIT || checkObstruction.apply(null, coords[command]);
}

function moveDirection(person, direction, tiles, immediate, callback) {
    move(person, global['COMMAND_MOVE_' + direction.toUpperCase()], tiles, immediate, callback);
}

/**
   Moves a person a given number of tiles in a given direction.
*/
function move(people, command, tiles, immediate, callback) {
    var faceDirection = command - (8 + (10 - command)),  // Turns COMMAND_MOVE_dir into COMMAND_FACE_dir
        distance = (command % 2 ? GetTileWidth() : GetTileHeight()) * tiles, callbackId;
    // `command % 2` would be true for COMMAND_MOVE_EAST (11) and COMMAND_MOVE_WEST (13)

    if (callback)
	callbacks[callbackId = private_.uid()] = callback;

    Array.from(people).each(function (personRegex) {
	Arq.peopleMatching(personRegex).each(function (person) {
	    if (command != COMMAND_WAIT)
		QueuePersonCommand(person, faceDirection, immediate);
	    distance.times(QueuePersonCommand.pass([person, command, false]));

	    if (callback)
		QueuePersonScript(person, callbacksKey + '[' + callbackId + ']()', true);
	});
    });
}

/**
   Moves `person` in the direction of `target`.
*/
function moveToward(person, target, tiles, callback) {
    var personX = Math.floor(GetPersonX(person) / GetTileWidth()), personY = Math.floor(GetPersonY(person) / GetTileHeight()),
        targetX = Math.floor(GetPersonY(target) / GetTileWidth()), targetY = Math.floor(GetPersonY(target) / GetTileHeight()),
        directionX, directionY;

    if (personX > targetX) directionX = 'east';
    else if (personX < targetX) directionX = 'west';

    if (personY > targetY) directionY = 'north';
    else if (personY < targetY) directionY = 'south';

    if (directionX)
	moveDirection(person, directionX, tiles, !!directionY, callback);
    if (directionY)
	moveDirection(person, directionY, tiles, false, callback);
}

/**
   Turns `person` to face `toFace`. If not provided, `toFace` is assumed to be the input person.
*/
function facePerson(person, toFace) {
    if (toFace == null) toFace = GetInputPerson();

    var opposites = {
	north: 'south', northeast: 'southwest',
	east: 'west', southeast: 'northwest',
	south: 'north', southwest: 'northeast',
	west: 'east', northwest: 'southeast'
    }, direction = GetPersonDirection(toFace);

    if (hasOwn.call(opposites, direction))
	SetPersonDirection(person, opposites[direction]);

    return hasOwn.call(opposites, direction);
}

function nextPathToken(path, index) {
    var token = path.charAt(index) || '', next = path.charAt(index + 1);
    if (next && next.toLowerCase() == next)
        token += next;
    return token;
}

function stepsForDirection(direction) {
    switch (direction) {
    case 'N': case 'S':
        return GetTileHeight();
    case 'E': case 'W':
        return GetTileWidth();
    default:
        return Math.floor(Math.sqrt(GetTileWidth() * GetTileHeight()));
    }
}

function queuePath(person, path) {
    for (var i = 0, direction; direction = nextPathToken(path, i), i < path.length; i += direction.length) {
        QueuePersonCommand(person,
                           global['COMMAND_FACE_' + direction.split('').map(function(c) fullDirections[c.toLowerCase()]).join('')],
                           true);
        stepsForDirection(direction).times(function () {
            moveCommands[direction].each(function (command, index, commands) {
                QueuePersonCommand(person, command, index < commands.length - 1);  // Make all but the last immediate.
            });
        });
    }
}

function followPath(person, path) {
    var pathData = followPath.list[person], direction;
    if (!hasOwn.call(followPath.list, person)) {
        pathData = followPath.list[person] = {
            path: path,
            index: 0
        };
    }

    // Reset our progress if the path changed.
    if (pathData.path != path) {
        pathData.path = path;
        pathData.index = 0;
    }

    direction = nextPathToken(path, pathData.index);
    if (direction == 'F') {
        Arq.console.success(person + ' finished following a path.');
        return true;  // To remove ourself automatically from a hooklist.
    }
    queuePath(person, nextPathToken(path, pathData.index));
    pathData.index += direction.length;
    if (pathData.index >= path.length)
        pathData.index = 0;
    return false;
}
followPath.list = {};

exports.canMove = canMove;
exports.canMoveDirection = canMoveDirection;
exports.move = move;
exports.moveDirection = moveDirection;
exports.moveToward = moveToward;
exports.facePerson = facePerson;
exports.queuePath = queuePath;
exports.followPath = followPath;

