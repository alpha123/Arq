var WindowStyles = require('Arq/resources').WindowStyles, Images = require('Arq/resources').Images,
Menu = require('Arq/controls/menu').Menu,
TextSystem = {
    defaultFont: GetSystemFont(),
    
    defaultWindowStyle: WindowStyles.glossyBlue,
    
    defaultArrow: Images.arrowDown,
    
    defaultCoordinates: {x: 16, y: 16, width: GetScreenWidth() - 32},
    
    draw: function (renderer, font, windowStyle) {
        font = font || TextSystem.defaultFont;
        for (var screen = GrabImage(0, 0, GetScreenWidth(), GetScreenHeight()),
	     x = renderer.x ? renderer.x() : TextSystem.defaultCoordinates.x,
	     y = renderer.y ? renderer.y() : TextSystem.defaultCoordinates.y,
	     width = renderer.width ? renderer.width() : TextSystem.defaultCoordinates.width,
	     height = renderer.height(font, width), time, key, stop, i = 0, l = renderer.len() + 1; i < l; ++i) {
  	    time = GetTime();
  	    while (time + 30 > GetTime()) {
  		screen.blit(0, 0);
  		if (windowStyle)
  		    windowStyle.drawWindow(x - 2, y - 2, width, height + 8);
  		renderer.render(font, x, y, width, height, i);
	  	FlipScreen();
	    }
	}
        while (true) {
	    if (stop)
                break;
	    if (!renderer.ignore) {
  	        key = GetKey();
  	        if (key == KEY_SPACE)
  		    break;
  	    }
  	    screen.blit(0, 0);
  	    if (windowStyle)
  	        windowStyle.drawWindow(x - 2, y - 2, width, height + 8);
  	    if (renderer.render(font, x, y, width, height, l - 1))
  	        stop = true;
  	    FlipScreen();
        }
        screen.blit(0, 0);
    },
    
    text: function (text, coords, font, windowStyle, noArrow) {
        TextSystem.draw({
	    height: function (font, width) font.getStringHeight(text, width),
	    len: function () -1,
	    render: function (font, _1, _2, _3, height) {
                var width = [coords.width, GetScreenWidth()].pick();
                font.drawTextBox(coords.x, coords.y, width, [coords.height, height].pick(), 0, text);
                if (!noArrow)
		    TextSystem.defaultArrow.blit(width / 2, y + 22);
	    }
        }, font, windowStyle);
    },
    
    center: function (text, font, windowStyle, noArrow) {
        TextSystem.text(text, {x: GetScreenWidth() / 2, y: GetScreenHeight() / 2}, font, windowStyle, noArrow);
    },
    
    window: function (text, font, windowStyle) {
        TextSystem.draw({
	    height: function (font, width) font.getStringHeight(text, width),
	    len: function () text.length,
	    render: function (font, x, y, width, height, length) {
                font.drawTextBox(x, y, width, height, 0, text.substr(0, length));
                TextSystem.defaultArrow.blit(width / 2, height + 22);
	    }
        }, font, windowStyle || TextSystem.defaultWindowStyle);
    },
    
    options: function (options, font, windowStyle) {
        var menu = new Menu({x: [options.x, TextSystem.defaultCoordinates.x].pick(),
			     y: [options.y, TextSystem.defaultCoordinates.y].pick()}),
        choices = options.filter(function (option) { return !option.description; }),
        descriptions = options.filter(function (option) { return option.description; }),
        hovers = [], actions = [], stop = false;
        choices.each(function (choice, i) {
	    menu.addText(choice.text, function () {
                menu.done = stop = choice.exit ? choice.exit(menu) : true;
                if (choice.action)
		    actions.push(choice.action);
	    });
	    if (typeof choice.selectable == 'function')
                menu.items[i].isSelectable = choice.selectable.bind(choice);
	    if (typeof choice.hover == 'function')
                hovers[i] = choice.hover;
        });
        menu.escapeable = function () { return options.escapeable; };
        TextSystem.draw({
	    ignore: true,
	    height: function (font, width) {
                if (options.height)
		    return options.height(menu, font, width);
                return descriptions.map(function (d) font.getStringHeight(d.text, width))
                    .reduce(function (a, b) a + b, menu.getHeight());
	    },
	    width: function () options.width ? options.width(menu) : TextSystem.defaultCoordinates.width,
	    x: function () options.x ? options.x(menu) : TextSystem.defaultCoordinates.x,
	    y: function () options.y ? options.y(menu) : TextSystem.defaultCoordinates.y,
	    len: function () -1,
	    render: function (font, x, y, width, height, length) {
                descriptions.each(function (description) {
		    font.drawTextBox(x, y, width, height, 0, text.substr(0, length));
                });
                if (!options.noArrow)
		    TextSystem.defaultArrow.blit(width / 2, height + 22);
                menu.go();
                if (hovers[menu.selection])
		    hovers[menu.selection](menu);
                menu.go();
                return stop;
	    }
        }, font, windowStyle || TextSystem.defaultWindowStyle);
        return actions.map(function (action) action());
    }
};

Object.merge(exports, TextSystem);
