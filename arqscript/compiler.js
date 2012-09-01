var hasOwn = Object.prototype.hasOwnProperty, slice = Array.prototype.slice,
helpers = require('Arq/arqscript/helpers');

function val(object, default_) {
    return hasOwn.call(object, default_) ? object[default_] : default_;
}

function escapeName(name) {
    if (name.endsWith('?'))
	name = 'is' + name.slice(0, -1);
    return name.replace(/-/g, '').replace(/\?/g, '$__question__$').replace(/!/g, '$__exclamation__$');
}

exports.compiler = function (ast, options) {
    options = options || {};

    var header = options.bare ? '' : '(function (global, isFinite, undefined) {\n\n',
        footer = options.bare ? '' : '\n\n})(this, isFinite);',
        vars = {}, topLevel = '', indentLevel = 0, addedHelpers = {},
    binOps = {
	and: '&&',
	but: '&&',
	or: '||',
	'=': '===',
	'/=': '!==',
	in: function (node) $(node.second) + '.contains(' + $(node.first) + ')',
	of: function (node) $(node.first) + ' in ' + $(node.second),
	'(': function (node) {
	    var [kwargs, args] = node.second.partition(function (a) a.arity == 'binary' && a.value == ':'), kwcode;
	    if (kwargs.length) {
		if (!hasOwn.call(addedHelpers, 'keywordargs')) {
		    addedHelpers.keywordargs = true;
		    footer = '\n\n' + helpers.keywordargs + footer;
		}
		kwcode = kwargs.reduce(function (code, arg) {
		    return code + ', "' + escapeName(arg.first.value) + '": ' + $(arg.second);
		}, '').slice(2);
		return '__keywordargs$(' + $(node.first) + ')([' + $$(args, ', ', false).slice(0, -2) +
		                                             '], {' + kwcode + '})';
	    }
	    return $(node.first) + '(' + $$(args, ', ', false).slice(0, -2) + ')';
	},
	'.': function (node) {
	    return nameGet($(node.first), $(node.second));
	},
	'[': function () binOps['.'].apply(this, arguments),
	':': function (node) { throw new Error('":" outside of function call or definition at line ' + node.line); }
    },
    unOps = {
	not: '!'
    },
    statements = {
	for: function (node) {
	    if (hasOwn.call(statements, 'for' + node.type))
		return statements['for' + node.type].apply(this, arguments);
	    throw new Error('Invalid "for" statement at line ' + node.line);
	},
	forin: function (node) {
	    return indent(function () {
		if (typeOf(node.first) != 'array')
		    node.first = [node.first, {value: '__index$'}];
		else
		    vars[node.first[1].value] = true;
		vars[node.first[0].value] = true;

		var valueName = escapeName(node.first[0].value), indexName = escapeName(node.first[1].value),
		    code = '(function (__ref$, ' + indexName + ', ' + valueName + ') {\n' +
		     _() + 'for (; ' + valueName + ' = __ref$[' + indexName + ' - 1], ' + indexName + ' <= __ref$.length; ++' + indexName + ') {\n' +
		           indent(function () $$(node.third)) + _() + '}\n' +
		   _(-4) + '})(' + $(node.second) + ', 1)';

		delete vars[node.first[0].value];
		if (hasOwn.call(node.first[1], 'id'))  // Determine if we have a "real" variable name or __index$
		    delete vars[node.first[1].value];

		return code;
	    });
	},
	forof: function (node) {
	    return indent(function () {
		var keyName, valueName, code;
		if (typeOf(node.first) == 'array') {
		    vars[node.first[0].value] = vars[node.first[1].value] = true;
		    keyName = escapeName(node.first[0].value);
		    valueName = escapeName(node.first[1].value);
		}
		else {
		    vars[node.first.value] = true;
		    keyName = escapeName(node.first.value);
		}

		code = '(function (__ref$, ' + keyName + (valueName ? ', ' + valueName : '') + ') {\n' +
		 _() + 'for (' + keyName + ' in __ref$) {\n' +
		       (valueName ? _(4) + valueName + ' = __ref$[' + keyName + '];\n' : '') +
		       indent(function () $$(node.third)) + _() + '}\n' +
	       _(-4) + '})(' + $(node.second) + ')';

		if (valueName) {
		    delete vars[node.first[0].value];
		    delete vars[node.first[1].value];
		}
		else
		    delete vars[node.first.value];

		return code;
	    });
	},
	function: function (node) {
	    return compilers.assignment(node, compilers.lambda({first: node.second, second: node.third}));
	},
	if: function (node, prefix) {
	    if (prefix == null) prefix = '';
	    var code = indent(function () {
		return prefix + 'if (' + $(node.first) + ') {\n' + $$(node.second) + _(-4) + '}';
	    });
	    if (node.third && node.third.arity == 'statement' && node.third.value == 'if')
		code += statements.if(node.third, '\nelse ');
	    else if (node.third)
		code += indent(function () '\nelse {\n' + $$(node.third) + _(-4) + '}');
	    return code;
	},
	return: function (node) {
	    return 'return ' + $(node.first);
	},
	while: function (node) {
	    return indent(function () {
		return 'while (' + $(node.first) + ') {\n' +
		       $$(node.second) + _(-4) + '}';
	    });
	}
    },
    compilers = {
	assignment: function (node, value) {
	    if (node.first.arity == 'name' && !(node.first.value in vars)) {
		vars[node.first.value] = true;
		topLevel += _() + 'var ' + $(node.first) + ';\n';
	    }
	    if (node.first.arity == 'binary' && ['.', '['].contains(node.first.value))
		return nameSet($(node.first.first), $(node.first.second), (value == null ? $(node.second) : value));
	    return $(node.first) + ' = ' + (value == null ? $(node.second) : value);
	},
	binary: function (node) {
	    if (!hasOwn.call(binOps, node.value) || typeof val(node.value) == 'string')
		return $(node.first) + ' ' + val(binOps, node.value) + ' ' + $(node.second);
	    return binOps[node.value].apply(this, arguments);
	},
	lambda: function (node) {
	    var defaults = node.first.filter(function (param, index) {
		// Get all parameters that have default values, while replacing those parameters with just their name.
		var isDefault = param.arity == 'binary' && param.value == ':';
		if (isDefault)
		    node.first[index] = param.first;
		vars[node.first[index].value] = true;
		return isDefault;
	    }).reduce(function (code, param) {
		var paramName = $(param.first);
		return code + '\n' + _(4) + 'if (' + paramName + ' == null)\n' +
		                _(8) + paramName + ' = ' + $(param.second) + ';';
	    }, ''), oldTop = topLevel, oldVars = vars, args, body, code;
	    topLevel = '';
	    vars = Object.create(vars);
	    code = indent(function () {
		args = $$(node.first, ', ', false).slice(0, -2);
		body = node.second ? '\n' + $$(node.second) : defaults.length ? '\n' : ' ';
		return 'function (' + args + ') {' + defaults + (topLevel ? '\n' + topLevel : '') + body + _(-4) + '}';
	    });
	    topLevel = oldTop;
	    vars = oldVars;
	    return code;
	},
	literal: function (node) typeof node.value == 'string' ? '"' + node.value + '"' : node.value,
	name: function (node) {
	    if (!(node.value in vars))
		return nameGet('global', '"' + escapeName(node.value) + '"');
	    return escapeName(node.value);
	},
	statement: function (node) statements[node.value].apply(this, arguments),
	ternary: function (node) {
	    return '(function () {\n' +
	         _(4) + 'if (' + $(node.first) + ') {\n' + _(8) + 'return ' + $(node.second) + ';\n' + _(4) + '}\n' +
		 (node.third ? _(4) + 'else {\n' + _(8) + 'return ' + $(node.third) + ';\n' + _(4) + '}\n' : '') +
		   '})()';
	},
	unary: function (node) val(unOps, node.value) + $(node.first)
    }, $, $$;

    function _(diff) {
	if (diff == null) diff = 0;
	diff = diff.max(0);
	return Array(indentLevel + diff).join(' ');
    }

    function indent(level, block) {
	if (arguments.length == 1) {
	    block = level;
	    level = 4;
	}
	indentLevel += level;
	var code = block();
	indentLevel -= level;
	return code;
    }

    function indentstr(level, block) {
	if (arguments.length == 1) {
	    block = level;
	    level = 4;
	}
	return block().split('\n').map(function (line) _() + line).join('\n');
    }

    function nameGet(context, name) {
	if (!hasOwn.call(addedHelpers, 'bind')) {
	    addedHelpers.bind = true;
	    footer = '\n\n' + helpers.bind + footer;
	}

	// Do magic for case-insensitivity. Basically iterate through all keys of the context until
	// one is found that equals the target key, ignoring case.
	// Also, if the target key is a number, subtract 1, since ArqScript arrays are 1-based
	// and JavaScript arrays are 0-based.
	return indentstr(function () {
	    return '(function (__ref$, __name$, __key$) {\n' +
	           '    if (typeof __name$ == "number" && isFinite(__name$))\n' +
	           '        return __bind$(__ref$[__name$ - 1], __ref$);\n' +  // Array indices start from 1, not 0
	           '    if (__name$ in __ref$)\n' +
	           '        return __bind$(__ref$[__name$], __ref$);\n' +
	           '    for (__key$ in __ref$) {\n' +
	           '        if (__key$.toLowerCase() === __name$)\n' +
	           '            return __bind$(__ref$[__key$], __ref$);\n' +
	           '    }\n' +
	           // Do some ugly stuff to access methods like hasOwnProperty which aren't enumerable and therefore
	           // don't get searched through above. See https://github.com/alpha123/Arq/issues/4
	           '    if ((__name$ = __name$.replace(/_([a-z])/ig, function ($0, $1) $1.toUpperCase())) in __ref$)\n' +
	           '        return __bind$(__ref$[__name$], __ref$);\n' +
	           '})(Object(' + context + '), ' + name + ')';  // Cast to object so cases like "abc".slice(...) work.
	});
    }

    function nameSet(context, name, value) {
	// Really, I firmly believe in case-insensitivity.
	return indentstr(function () {
	    return '(function (__ref$, __name$, __value$, __key$) {\n' +
	           '    if (typeof __name$ == "number" && isFinite(__name$))\n' +
	           '        return __ref$[__name$ - 1] = __value$;\n' +
	           '    for (__key$ in __ref$) {\n' +
	           '        if (__key$.toLowerCase() === __name$)\n' +
	           '            return __ref$[__key$] = __value$;\n' +
	           '    }\n' +
	           '    return __ref$[__name$] = __value$;\n' +
	           '})(' + context + ', ' + name + ', ' + value + ')';
	});
    }

    function compileNode(node) {
	return node.assignment ? compilers.assignment.apply(this, arguments) :
	       compilers[node.arity].apply(this, arguments);
    }
    $ = compileNode;

    function compileNodes(ast, separator, indent) {
	if (separator == null) separator = ';\n';
	if (indent == null) indent = true;
	var self = this, args = slice.call(arguments, 3);
	return Array.from(ast).reduce(function (code, node) {
	    return code + (indent ? _() : '') + compileNode.apply(self, [node].concat(args)) + separator;
	}, '');
    }
    $$ = compileNodes;

    return function () {
	var body = compileNodes(ast);
	return header + topLevel + body + footer;
    };
};
