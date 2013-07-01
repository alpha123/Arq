(function (exports) {
"use strict";

var max = Math.max, min = Math.min;
var white = CreateColor(255, 255, 255);

function Input(options) {
    options = options || {};
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.font = options.font || GetSystemFont();
    this.onEnter = options.onEnter || function () {};
    this.onEscape = options.onEscape || function () {};
    this.text = options.text || '';
    this.label = options.label || '';
    this.width = options.width || GetScreenWidth();
    this.height = this.font.getHeight() + 2;
    this._renderedText = this.text;
    this.position = 0;
    this.done = false;
    this.history = [];
    this.historyPosition = 0;
    this.setActive(true);
}

var $ = Input.prototype;
$.setActive = function (active) {
    this.active = active;
    if (active) {
        this.handleInput = handleInput;
        this.render = render;
    }
    else {
        this.handleInput = function () { return this.done; };
        this.render = basicRender;
    }
    return this;
};

$.finish = function () {
    this.done = true;
    this.setActive(false);
    this.text = '';
    return this;
};

$.getRenderedText = function (text) {
    var labelWidth = this.font.getStringWidth(this.label);
    if (this._lastRenderedStart == null || this._lastRenderedEnd == null) {
        this._lastRenderedStart = 0;
        this._lastRenderedEnd = text.length;
        var approxLength = Math.floor(this.width / this.font.getStringWidth('i'));
        text = text.slice(-approxLength);
        while (labelWidth + this.font.getStringWidth(text) > this.width)
            text = text.slice(++this._lastRenderedStart, text.length);
    }
    else {
        this._lastRenderedStart = Math.min(this._lastRenderedStart, this.position);
        if (this._lastRenderedStart == this.position) {
            this._lastRenderedEnd = text.length;
            text = text.slice(this._lastRenderedStart);
            while (labelWidth + this.font.getStringWidth(text) > this.width)
                text = text.slice(0, --this._lastRenderedEnd);
        }
        else {
            this._lastRenderedEnd = Math.max(this._lastRenderedEnd, this.position);
            if (this._lastRenderedEnd == this.position) {
                this._lastRenderedStart = 0;
                while (labelWidth + this.font.getStringWidth(text) > this.width)
                    text = text.slice(++this._lastRenderedStart, text.length);
            }
        }
    }
    return text;
};

function handleInput(key) {
    switch (key) {
    case KEY_ENTER:
        this.history.push(this.text);
        var text = this.text;
        this.finish();
        this.onEnter(text, this);
        break;
    case KEY_ESCAPE:
        var text = this.text;
        this.finish();
        this.onEscape(text, this);
        break;
    case KEY_HOME:
        this.position = 0;
        break;
    case KEY_END:
        this.position = this.text.length;
        break;
    case KEY_LEFT:
        this.position = max(0, this.position - 1);
        break;
    case KEY_RIGHT:
        this.position = min(this.text.length, this.position + 1);
        break;
    case KEY_UP:
        this.historyPosition = max(0, this.historyPosition - 1);
        this.text = this.history[this.historyPosition] || '';
        this.position = this.text.length;
        break;
    case KEY_DOWN:
        this.historyPosition = min(this.history.length, this.historyPosition + 1);
        this.text = this.history[this.historyPosition] || '';
        this.position = this.text.length;
        break;
    case KEY_BACKSPACE:
        var newText = this.text.split('');
        newText.splice(this.position - 1, 1);
        this.text = newText.join('');
        this.position = max(0, this.position - 1);
        break;
    case KEY_DELETE:
    case KEY_D:
        if (key == KEY_DELETE || IsKeyPressed(KEY_CTRL)) {
            var newText = this.text.split('');
            newText.splice(this.position, 1);
            this.text = newText.join('');
            break;
        }
    case KEY_K:
        if (IsKeyPressed(KEY_CTRL)) {
            this.text = this.text.slice(0, this.position);
            break;
        }
    default:
        var previousLength = this.text.length;
        var newText = this.text.split('');
        newText.splice(this.position, 0, GetKeyString(key, IsKeyPressed(KEY_SHIFT) ^ GetToggleState(KEY_CAPSLOCK)));
        this.text = newText.join('');
        // Otherwise pressing non-printing characters (Ctrl, Alt, etc) increments the position.
        if (this.text.length != previousLength)
            ++this.position;
        break;
    }
    this._renderedText = this.getRenderedText(this.text);
    return this.done;
}

$.update = function () {
    return this.done;
};

function render(surface) {
    var offset = this.font.getStringWidth(this.label + this._renderedText.slice(0, this.position));
    if (surface)
        surface.drawText(this.font, this.x, this.y, this.label + this._renderedText);
    else
        this.font.drawText(this.x, this.y, this.label + this._renderedText);
    
    if (new Date().getMilliseconds() > 500) {
        if (surface)
            surface.line(this.x + offset, this.y - 1, this.x + offset, this.y + this.font.getHeight() + 1, white);
        else
            Line(this.x + offset, this.y - 1, this.x + offset, this.y + this.font.getHeight() + 1, white);
    }

    return this.done;
}

function basicRender(surface) {
    if (surface)
        surface.drawText(this.font, this.x, this.y, this.label + this._renderedText);
    else
        this.font.drawText(this.x, this.y, this.label + this._renderedText);
    return this.done;
}

exports.Input = Input;

// Use CommonJS if supported, regular global variables otherwise.
})(
    typeof exports == 'object' ? exports : (typeof GUI != 'object' ? this.GUI = {} : GUI)
);
