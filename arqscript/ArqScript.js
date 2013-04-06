var {parser} = require('Arq/arqscript/parser'),
    {tokenize} = require('Arq/arqscript/lexer'),
    {compiler} = require('Arq/arqscript/compiler');

function evaluate(code, options, context) {
    var fn = eval(compiler(parser(tokenize(code, {caseSensitive: true}))(),
			   Object.merge({caseSensitive: true, asFunction: true}, options))());
    return fn.call(context);
}
exports.evaluate = evaluate;

exports.execute = function (filename, options, context) {
    var file = OpenRawFile('~/' + filename), code;
    try {
	code = CreateStringFromByteArray(file.read(file.getSize()));
    }
    finally { file.close(); }
    return evaluate(code, options, context);
};
