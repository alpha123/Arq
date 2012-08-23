var hasOwn = Object.prototype.hasOwnProperty;

function val(object, default_) {
    return hasOwn.call(object, default_) ? object[default_] : default_;
}

function escapeName(name) {
    if (name.endsWith('?'))
	name = 'is' + name.slice(0, -1);
    return name.replace(/-/g, '').replace(/\?/g, '$__question__$').replace(/!/g, '$__exclamation__$');
}

function nameGet(context, name) {
    // Do magic for case-insensitivity. Basically iterate through all keys of the context until
    // one is found that equals the target key, ignoring case.
    // Also, if the target key is a number, subtract 1, since ArqScript arrays are 1-based
    // and JavaScript arrays are 0-based.
    return '(function (__ref$, __name$, __key$) {\n' +
	   '    if (typeof __name$ == "number" && isFinite(__name$))\n' +
	   '        return __ref$[__name$ - 1];\n' +  // Array indices start from 1, not 0
	   '    for (__key$ in __ref$) {\n' +
	   '        if (__key$.toLowerCase() === __name$)\n' +
	   '            return __ref$[__key$];\n' +
	   '    }\n' +
	   '})(' + context + ', ' + name + ')';
}

function nameSet(context, name, value) {
    // Really, I firmly believe in case-insensitivity.
    return '(function (__ref$, __name$, __value$, __key$) {\n' +
	   '    if (typeof __name$ == "number" && isFinite(__name$))\n' +
	   '        return __ref$[__name$ - 1] = __value$;\n' +
	   '    for (__key$ in __ref$) {\n' +
	   '        if (__key$.toLowerCase() === __name$)\n' +
	   '            return __ref$[__key$] = __value$;\n' +
	   '    }\n' +
	   '    return __ref$[__name$] = __value$;\n' +
	   '})(' + context + ', ' + name + ', ' + value + ')';
}

exports.compiler = function (ast, options) {
    options = options || {};

    var header = options.bare ? '' : '(function (global, undefined) {\n\n',
        footer = options.bare ? '' : '\n\n})(this);',
        vars = {}, topLevel = '', indentLevel = 0,
    binOps = {
	and: '&&',
	but: '&&',
	or: '||',
	'=': '===',
	'/=': '!==',
	'(': function (node) {
	    return $(node.first) + '(' + $$(node.second, ', ', false).slice(0, -2) + ')';
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
	    if (hasOwn.call(statements, 'for' + node.first.value))
		return statements['for' + node.first.value].apply(this, arguments);
	    throw new Error('"for" statement without "in" or "of" at line ' + node.line);
	},
	forin: function (node) {
	    return indent(function () {
		vars[node.first.first.value] = true;
		var varName = $(node.first.first),
		    code = '(function (__ref$, __index$, ' + varName + ') {\n' +
		    _() + 'for (; ' + varName + ' = __ref$[__index$], __index$ < __ref$.length; ++__index$) {\n' +
		           indent(function () $$(node.second)) + _() + '}\n' +
		    _(-4) + '})(' + $(node.first.second) + ', 0)';
		delete vars[node.first.first.value];
		return code;
	    });
	},
	forof: function (node) {
	    return indent(function () {
		vars[node.first.first.value] = true;
		var varName = $(node.first.first),
		    code = '(function (__ref$, __key$, ' + varName + ') {\n' +
		    _() + 'for (__key$ in __ref$) {\n' + _(4) + varName + ' = __ref$[__key$];\n' +
		          indent(function () $$(node.second)) + _() + '}\n' +
		    _(-4) + '})(' + $(node.first.second) + ')';
		delete vars[node.first.first.value];
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

    function compileNode(node) {
	return node.assignment ? compilers.assignment.apply(this, arguments) :
	       compilers[node.arity].apply(this, arguments);
    }
    $ = compileNode;

    function compileNodes(ast, separator, indent) {
	if (separator == null) separator = ';\n';
	if (indent == null) indent = true;
	return Array.from(ast).reduce(function (code, node) {
	    return code + (indent ? _() : '') + compileNode(node) + separator;
	}, '');
    }
    $$ = compileNodes;

    return function () {
	var body = compileNodes(ast);
	return header + topLevel + body + footer;
    };
};
