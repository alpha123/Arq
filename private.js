var id = 0;

Arq.__private = {};

function uid() {
    return ++id;
}
exports.uid = uid;

function varString() {
    return 'Arq.__private._p' + uid();
}
exports.varString = varString;

exports.object = function () {
    var object = {}, key = varString();
    Object.set(global, key, object);
    return [object, key];
};
