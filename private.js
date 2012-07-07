var id = 0;

Arq.__private = {};

function uid() {
    return ++id;
}
exports.uid = uid;

exports.varString = function () {
    return 'Arq.__private._p' + uid();
};
