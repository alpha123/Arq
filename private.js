var id = 0;

global.__arqprivate = {};

function uid() {
    return ++id;
}
exports.uid = uid;

function varString() {
    return '__arqprivate._p' + uid();
}
exports.varString = varString;

function value(val) {
    var key = varString();
    Object.set(global, key, val);
    return [val, key];
}
exports.value = value;

exports.object = function () {
    return value({});
};

exports.array = function () {
    return value([]);
};
