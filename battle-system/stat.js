exports.Stat = new Class({
    Implements: Events,

    current: 0,
    max: 0,

    initialize: function (current, max) {
	this.current = current;
	this.max = max;
    },
    set: function (value) {
	var old = this.current;
	this.current = value.limit(0, this.max);
	this.fireEvent('change', [this.current, old]);
	if (this.current == 0)
	    this.fireEvent('zero');
	return this;
    },
    deplete: function () {
	var old = this.current;
	this.current = 0;
	this.fireEvent('change', [0, old]);
	this.fireEvent('zero');
	return this;
    },
    restore: function () {
	var old = this.current;
	this.current = this.max;
	this.fireEvent('change', [this.current, old]);
	return this;
    },
    modify: function (amount) {
	var old = this.current;
	this.current = (this.current + amount).limit(0, this.max);
	this.fireEvent('change', [this.current, old]);
	if (this.current == 0)
	    this.fireEvent('zero');
	return this.current;
    },
    damage: function (amount) { return this.modify(-amount.max(0)); },
    heal: function (amount) { return this.modify(amount.max(0)); },
    lower: function (amount) {
	this.max = (this.max - amount).max(0);
	return this;
    },
    raise: function (amount) {
	this.max += amount;
	return this;
    },
    decrease: function (amount) {
	this.lower(amount);
	this.modify(-amount);
	return this;
    },
    increase: function (amount) {
	this.raise(amount);
	this.modify(amount);
	return this;
    }
});
