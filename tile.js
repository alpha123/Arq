function direction(dir, neg) {
    if (dir == 'x') {
        return function (num) {
            num = num == null ? 1 : num;
            return new Tile(this.x + (neg ? -num : num), this.y);
        };
    }
    return function (num) {
        num = num == null ? 1 : num;
        return new Tile(this.x, this.y + (neg ? -num : num));
    };
}

var Tile = new Class({
    initialize: function (x, y, layer) {
        this.width = GetTileWidth();
        this.height = GetTileHeight();
        if (arguments.length > 1) {
            this.layer = [layer, GetPersonLayer(Arq.config.player)].pick();
            this.id = GetTile(x, y, this.layer);
            this.x = x;
            this.y = y;
            this.pixelX = this.width * x;
            this.pixelY = this.height * y;
        }
        else
            this.id = x;
        this.name = GetTileName(this.id);
    },
    
    north: direction('y', true),
    south: direction('y'),
    east: direction('x'),
    west: direction('x', true),
    
    place: function (person) {
        SetPersonX(person, this.pixelX + this.width / 2);
        SetPersonY(person, this.pixelY + this.height / 2);
        return this;
    },
    
    set: function (tile) {
        if (typeof tile == 'string')
            tile = Tile.name(tile);
        SetTile(this.x, this.y, this.layer, typeof tile == 'number' ? tile : tile.id);
        return this;
    }
});

function creator(create) {
    return function (x, y, layer) {
        if (arguments.length == 1) {
            var coords = x;
            x = coords.x;
            y = coords.y;
        }
        return create(x, y, layer);
    };
}

Tile.id = function (id) new Tile(id);
Tile.name = function (name) {
    var n = GetNumTiles();
    while (n--) {
        if (GetTileName(n) == name)
            return Tile.id(n);
    }
};
Tile.tile = creator(function (x, y, layer) new Tile(x, y, layer));
Tile.pixels = creator(function (x, y, layer) new Tile(Math.floor(x / GetTileWidth()), Math.floor(y / GetTileHeight()), layer));
Tile.under = function (person) Tile.pixels(GetPersonX(person), GetPersonY(person), GetPersonLayer(person));
Tile.current = function () Tile.under(Arq.config.player);

exports.Tile = Tile;
