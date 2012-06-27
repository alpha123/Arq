var cash = 0;

exports.init = function (options) {
    cash = options.amount;
};

exports.load = function (saved) {
    cash = saved.cash;
};

exports.save = function () {
    return {cash: cash};
};

exports.__defineGetter__('cash', function () cash);
exports.__defineSetter__('cash', function (amount) { cash = amount; });
