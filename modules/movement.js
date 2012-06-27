var {followPath, moveDirection} = require('Arq/movement'), abs = Math.abs;

exports.init = function () {
    Arq.hooks.createPerson.add(function (person, name) {
	if (person.move) {
	    var {path, speed, chase} = typeof person.move == 'function' ? person.move() : person.move, tileHeight = GetTileHeight(),
	        chasing = false, initialX, initialY;

	    Arq.hooks.mapLoad.add(function () {
		if (DoesPersonExist(name) && speed != null)
		    SetPersonSpeed(name, speed);
		return true;
	    });

	    if (chase) {
		person.generator.add(function () {
		    var personX = GetPersonX(name), personY = GetPersonY(name),
		        playerX = GetPersonX(Lithonite.GIP), playerY = GetPersonY(Lithonite.GIP);

		    if (!chasing)
			[initialX, initialY] = [personX, personY];

		    if (abs(personX - playerX) + abs(personY - playerY) <= chase.radius * tileHeight &&
			abs(personX - initialX) + abs(personY - initialY) <= chase.max * tileHeight &&
			(chasing || Math.random() * 10 < (chase.chance == null ? 8 : chase.chance))) {
			if (!chasing) {
			    chasing = true;
			    if (chase.start)
				chase.start(person, name);
			}

			if (personX > playerX)
			    moveDirection(name, 'west', 1);
			else
			    moveDirection(name, 'east', 1);
			if (personY > playerY)
			    moveDirection(name, 'north', 1);
			else
			    moveDirection(name, 'south', 1);
		    }
		    else if (chasing) {
			if (personX > initialX)
			    moveDirection(name, 'west', 1);
			else
			    moveDirection(name, 'east', 1);
			if (personY > initialY)
			    moveDirection(name, 'north', 1);
			else
			    moveDirection(name, 'south', 1);

			if (abs(personX - initialX) + abs(personY - initialY) < tileHeight / 2) {
			    SetPersonX(name, initialX);
			    SetPersonY(name, initialY);
			    chasing = false;
			    if (chase.end)
				chase.end(person, name);
			}
		    }
		    else
			followPath(name, path);
		});
	    }
	    else {
		person.generator.add(function () {
		    return followPath(name, path) < 0;
		});
	    }
	}
    });
};
