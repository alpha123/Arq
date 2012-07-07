// Original credit to Flikky

var hasOwn = Object.prototype.hasOwnProperty;

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
        distance = (command % 2 ? GetTileWidth() : GetTileHeight()) * tiles;
    // `command % 2` would be true for COMMAND_MOVE_EAST (11) and COMMAND_MOVE_WEST (13)

    Array.from(people).each(function (personRegex) {
	Arq.peopleMatching(personRegex).each(function (person) {
	    if (command != COMMAND_WAIT)
		QueuePersonCommand(person, faceDirection, immediate);
	    distance.times(QueuePersonCommand.pass([person, command, false]));
	    if (callback) {
		// Kinda hacky, but gets the job done.
		Arq.person(person).generator.add(function () {
		    callback();
		    return true;
		}, 9);
	    }
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
   Turns `person` to face `toFace`.
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

/**
   Intended to be used in OnGenerateCommands
   i.e. followPath(GetCurrentPerson(),  'EEENNNWWWWSSSE');
   i.e. SetPersonScript('Jimmy', SCRIPT_COMMAND_GENERATOR, 'FollowPath("Jimmy", "NNDESSWF")');
   Where the path is a string of N, E, S, W, D, F (north, east, south, west, delay, finish)
   It returns:
   -1 = the person's path has finished (encountered an F)
   0 = the person has not moved
   1 = the person has moved
*/
function followPath(person, path) {
    var pathState = 0, pathData = followPath.list[person], dx, dy;

    function getFollowPathDelta(index) {
	var delta = 0;
	if (index >= 0 && index < path.length) {
	    switch (path.charAt(index)) {
            case 'N': case 'S': delta = GetTileHeight(); break;
            case 'E': case 'W': delta = GetTileWidth(); break;
            case 'D': case 'F': delta = Math.sqrt(GetTileWidth() * GetTileHeight()); break;
	    } 
	}
	return delta;
    }

    if (!hasOwn.call(followPath.list, person)) {
	pathData = followPath.list[person] = {
	    name: person,
	    path: path,
	    index: 0,
	    delta: getFollowPathDelta(0)
	};
    }

    if (pathData.path != path) {
	pathData.path = path;
	pathData.index = 0;
	pathData.delta = getFollowPathDelta(0);
    }

    if (pathData.delta == 0) {
	if (pathData.path.charAt(pathData.index) != 'F')
	    ++pathData.index;
	pathData.delta = getFollowPathDelta(pathData.index);
    }

    if (pathData.index >= path.length) {
	pathData.index = 0;
	pathData.delta = getFollowPathDelta(pathData.index);
    }

    function doCommand(direction, xIncrement, yIncrement) {
	dx += xIncrement;
	dy += yIncrement;
	QueuePersonCommand(person, global['COMMAND_FACE_' + direction], true);
	if (!IsPersonObstructed(person, dx, dy)) {
	    QueuePersonCommand(person, global['COMMAND_MOVE_' + direction], false);
	    --pathData.delta;
	    pathState = 1;
	}
    }

    if (pathData.index >= 0 && pathData.index < path.length) {
	dx = GetPersonX(person);
	dy = GetPersonY(person);
	switch (pathData.path.charAt(pathData.index)) {
	case 'N':
	    doCommand('NORTH', 0, -1);
	    break;
	case 'S':
	    doCommand('SOUTH', 0, 1);
	    break;
	case 'E':
	    doCommand('EAST', 1, 0);
	    break;
	case 'W':
	    doCommand('WEST', -1, 0);
	    break;
	case 'D':
	    QueuePersonCommand(person, COMMAND_WAIT, false);
	    --pathData.delta;
	    break;
	case 'F':
	    pathState = -1;
	    break;
	}
    }

    return pathState;
}
followPath.list = {};

exports.canMove = canMove;
exports.canMoveDirection = canMoveDirection;
exports.move = move;
exports.moveDirection = moveDirection;
exports.moveToward = moveToward;
exports.facePerson = facePerson;
exports.followPath = followPath;

