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

    var header = options.bare ? '' : '(function (global, isFinite, undefined) {',
        footer = options.bare ? '' : '\n\n})(this, isFinite);',
        vars = {}, topLevel = '', indentLevel = 0, addedHelpers = {},
    binOps = {
	and: '&&',
	but: '&&',
	or: '||',
	'%%': '%',
	'=': '===',
	'/=': '!==',
	'<': compareOp('<'), '<=': compareOp('<='),
	'>': compareOp('>'), '>=': compareOp('>='),
	'%': function (node) '(function (__ref$) (' + $(node.first) + ' % __ref$ + __ref$) % __ref$)(' + $(node.second) + ')',
	in: function (node) $(node.second) + '.contains(' + $(node.first) + ')',
	of: function (node) $(node.first) + ' in ' + $(node.second),
	'(': function (node) {
	    var [kwargs, args] = node.second.partition(function (a) a.arity == 'binary' && a.value == ':'),
	        fncode, argscode, kwcode, self = 'null', prefix = '', suffix = '';

	    function compileArgs(args) {
		function isSplat(arg) { return arg.arity == 'unary' && arg.value == '...'; }

		for (var code = '', arg, starti, i = 0; arg = args[i], i < args.length; ++i) {
		    if (i > 0) code += '.concat('
		    if (isSplat(arg))
			code += $(arg.first) + (i > 0 ? ')' : '');
		    else {
			code += '[';
			starti = i;
			for (; arg = args[i], i < args.length && !isSplat(arg); ++i)
			    code += $(arg) + ', ';
			code = code.slice(0, -2) + ']' + (starti > 0 ? ')' : '');
			arg = args[--i];
		    }
		}
		return code;
	    }

	    // Handle keyword arguments fn(a: "a", c: "c", "b")
	    if (kwargs.length) {
		addHelper('keywordargs');
		kwcode = kwargs.reduce(function (code, arg) {
		    return code + ', "' + escapeName(arg.first.value) + '": ' + $(arg.second);
		}, '').slice(2);
		fncode = '__keywordargs$(' + $(node.first) + ')';
		argscode = '(' + (args.length ? compileArgs(args) + ', {' : '[], {') + kwcode + '})';
	    }
	    else {
		// Handle splat operator fn(args...)
		if (args.some(function (a) a.arity == 'unary' && a.value == '...')) {
		    // Be sure not to mess up this/self
		    if (node.first.arity == 'binary' && node.first.value == '.') {
			prefix = '(function (__ref$) { return ';
			suffix = '; })(' + $(node.first.first) + ')';
			node.first.first = {arity: 'name', value: '__ref$'};
			self = '__ref$';
		    }
		    argscode = '.apply(' + self + ', ' + compileArgs(args) + ')';
		}
		else
		    argscode = '(' + $$(args, ', ', false).slice(0, -2) + ')';

		fncode = $(node.first);
	    }
	    return prefix + fncode + argscode + suffix;
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
	fork: function (node) {
	    if (!options.scenario)
		throw new Error('fork statement requires Scenario mode at line ' + node.line);
	    return options.scenario + '.beginFork();\n' + _(4) + indent(function () $$(node.first)) + _() + options.scenario + '.endFork();\n';
	},
	function: function (node) {
	    return compilers.assignment(node, compilers.lambda({first: node.second, second: node.third}, false));
	},
	if: conditionalStatement('if', '', ''),
	return: function (node) {
	    return 'return ' + $(node.first);
	},
	sync: function (node) {
	    return options.scenario + '.synchronize();';
	},
	unless: conditionalStatement('unless', '!(', ')'),
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
	atom: function (node) {
	    addHelper('atom' + node.value.id, true, 'var __atom' + node.value.id + '$ = {id: ' + node.value.id +
		                                    ', name: "' + node.value.name + '"}');
	    return '__atom' + node.value.id + '$';
	},
	binary: function (node) {
	    if (!hasOwn.call(binOps, node.value) || typeof val(binOps, node.value) == 'string')
		return $(node.first) + ' ' + val(binOps, node.value) + ' ' + $(node.second);
	    return binOps[node.value].apply(this, arguments);
	},
	binopfn: function (node) {
	    return 'function (__a$, __b$) { return ' + compilers.binary({
		value: node.value,
		first: {arity: 'name', value: '__a$'},
		second: {arity: 'name', value: '__b$'}
	    }) + '; }';
	},
	lambda: function (node, returnLastExpression) {
	    if (returnLastExpression == null) returnLastExpression = true;

	    // Handle default parameters do(a, b: 2, c: 3) end
	    var defaults = node.first.filter(function (param, index) {
		// Get all parameters that have default values, while replacing those parameters with just their name.
		var isDefault = param.arity == 'binary' && param.value == ':',
		    isRest = param.arity == 'unary' && param.value == '...';

		// Test for a keyword splat instead of a default parameter (they look similar: do(a: 1) end, do(kwargs: ...) end)
		if (isDefault && param.second.arity == 'operator' && param.second.value == '...') {
		    keywordSplat = param;
		    vars[param.first.value] = true;
		    param.first.value = '__kwargs$' + param.first.value;
		    node.first.splice(index, 1);
		    node.first.unshift(param.first);
		    isDefault = false;
		}
		else if (isRest)
		    rest = param;

		if (isDefault || isRest)
		    node.first[index] = param.first;
		if (!keywordSplat)
		    vars[node.first[index].value] = true;
		return isDefault;
	    }).reduce(function (code, param) {
		var paramName = $(param.first);
		return code + '\n' + _(4) + 'if (' + paramName + ' == null)\n' +
		                _(8) + paramName + ' = ' + $(param.second) + ';';
	    }, ''), oldTop = topLevel, oldVars = vars, args, rest, keywordSplat, body, code, lastExpression;

	    // Handle splat parameter do(args...) end
	    if (rest) {
		addHelper('slice', true, 'var __slice$ = [].slice;');
		defaults += '\n' + _(4) + $(rest.first) + ' = __slice$.call(arguments, ' + (node.first.length - 1) + ');';
	    }

	    // Handle keyword splat do(kwargs: ...) end
	    if (keywordSplat)
		defaults += '\n' + _(4) + 'var ' + escapeName(keywordSplat.first.value.slice(9)) + ' = ' + $(keywordSplat.first) + ' || {};';

	    topLevel = '';
	    vars = Object.create(vars);

	    if (returnLastExpression && node.second) {
		node.second = Array.from(node.second);
		lastExpression = node.second.getLast();
		if (lastExpression.arity != 'statement')
		    node.second[node.second.length - 1] = {arity: 'statement', value: 'return', first: lastExpression};
	    }

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
	    if (options.scenario && node.value == 'sync')
		return statements.sync(node);
	    if (!(node.value in vars) && !(node.value.startsWith('__') && node.value.endsWith('$')))
		return nameGet('global', '"' + escapeName(node.value) + '"');
	    return escapeName(node.value);
	},
	self: function (node) 'this',
	statement: function (node) statements[node.value].apply(this, arguments),
	ternary: function (node) {
	    var isUnless = node.value == 'unless';
	    return '(function () {\n' +
	    _(4) + 'if (' + (isUnless ? '!(' : '') + $(node.first) + (isUnless ? ')' : '') + ') {\n' +
	    _(8) + 'return ' + $(node.second) + ';\n' + _(4) + '}\n' +
		   (node.third ? _(4) + 'else {\n' + _(8) + 'return ' + $(node.third) + ';\n' + _(4) + '}\n' : '') +
		   '})()';
	},
	unary: function (node) val(unOps, node.value) + $(node.first),
	unopfn: function (node) {
	    return 'function (__a$) { return ' + compilers.unary({
		value: node.value,
		first: {arity: 'name', value: '__a$'}
	    }) + '; }';
	}
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

    function compareOp(op) {
	return function (node) {
	    if (node.second.arity == 'binary' && ['<', '>', '<=', '=>'].contains(node.second.value)) {
		var target = node.second.first;
		node.second.first = {arity: 'name', value: '__ref$'};
		return '(function (__ref$) { return ' + $(node.first) + ' ' + op + ' __ref$ && ' + $(node.second) + '; })(' + $(target) + ')';
	    }
	    return $(node.first) + ' ' + op + ' ' + $(node.second);
	};
    }

    function conditionalStatement(name, preCond, postCond) {
	return function (node, prefix) {
	    if (prefix == null) prefix = '';
	    var code = indent(function () {
		return prefix + 'if (' + preCond + $(node.first) + postCond + ') {\n' + $$(node.second) + _(-4) + '}';
	    });
	    if (node.third && node.third.arity == 'statement' && node.third.value == name)
		code += statements[name](node.third, '\nelse ');
	    else if (node.third)
		code += indent(function () '\nelse {\n' + $$(node.third) + _(-4) + '}');
	    return code;
	};
    }

    function addHelper(helper, useHeader, code) {
	if (!hasOwn.call(addedHelpers, helper)) {
	    addedHelpers[helper] = true;
	    if (useHeader)
		header += '\n' + code;
	    else
		footer = '\n\n' + helpers[helper] + footer;
	}
    }

    function nameGet(context, name) {
	if (options.caseSensitive)
	    return context + '[' + name + ']';

	addHelper('bind');

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
	if (options.caseSensitive)
	    return context + '[' + name + '] = ' + value;

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
	return header + '\n\n' + topLevel + body + footer;
    };
};
