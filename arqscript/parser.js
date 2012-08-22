var hasOwn = Object.prototype.hasOwnProperty;

exports.parser = function (tokens) {
    var token,
    symbols = {},
    Symbol = {
	id: '',
	lbp: 0,
	value: null,
	first: null,
	second: null,
	third: null,

	nud: function () {
	    throw new Error('Syntax error "' + this.id + (this.line ? '" at line ' + this.line : '"'));
	},
	led: function (left) {
	    throw new Error('Unknown operator "' + this.id + (this.line ? '" at line ' + this.line : '"'));
	}
    },
    scope,
    Scope = {
	define: function (token) {
	    if (this.defined[token.id]) {
		if (this.defined[token.id].reserved)
		    throw new Error('Already reserved: ' + token.id);
		throw new Error('Already defined: ' + token.id);
	    }
	    this.defined[token.value] = token;
	    token.reserved = false;
	    token.nud = function () this;
	    token.led = null;
	    token.std = null;
	    token.lbp = 0;
	    token.scope = scope;
	    return token;
	},
	find: function (id) {
	    var self = this, sym;
	    while (true) {
		sym = self.defined[id];
		if (sym && hasOwn.call(self.defined, id))
		    return sym;
		self = self.parent;
		if (!self) {
		    sym = symbols[id];
		    return sym && hasOwn.call(symbols, id) ? sym : symbols['(name)'];
		}
	    }
	},
	pop: function () {
	    scope = this.parent;
	    return this;
	},
	reserve: function (token) {
	    if (token.arity != 'name' || token.reserved)
		return this;
	    var sym = this.defined[token.id];
	    if (sym) {
		if (sym.reserved)
		    return this;
		if (sym.arity == 'name')
		    throw new Error('Already defined: ' + token.id);
	    }
	    this.defined[token.id] = token;
	    token.reserved = true;
	}
    }, infix, infixr;

    function newScope() {
	var s = scope;
	scope = Object.create(Scope);
	scope.defined = {};
	scope.parent = s;
	return scope;
    }

    function symbol(id, bindingPower) {
	bindingPower = bindingPower || 0;

	var sym = symbols[id];
	if (sym)
	    sym.lbp = Math.max(sym.lbp, bindingPower);
	else {
	    sym = Object.create(Symbol);
	    sym.id = id;
	    sym.lbp = bindingPower;
	    symbols[id] = sym;
	}
	return sym;
    }

    function constant(name, value) {
	var sym = symbol(name);
	sym.nud = function () {
	    scope.reserve(this);
	    this.value = symbols[this.id].value;
	    this.arity = 'literal';
	    return this;
	};
	sym.value = value;
	return sym;
    }

    function makeInfix(subtrahend) {
	return function (id, bindingPower, led) {
	    var sym = symbol(id, bindingPower);
	    sym.led = led || function (left) {
		this.first = left;
		this.second = expression(bindingPower - subtrahend);
		this.arity = 'binary';
		return this;
	    };
	    return sym;
	};
    }
    infix = makeInfix(0);
    infixr = makeInfix(1);

    function assignment(id) {
	return infixr(id, 10, function (left) {
	    if (left.id != '.' && left.id != '[' && left.arity != 'name')
		throw new Error('Bad lvalue "' + left.id + '" at line ' + left.line);
	    this.first = left;
	    this.second = expression(9);
	    this.assignment = true;
	    this.arity = 'binary';
	    return this;
	});
    }

    function prefix(id, nud) {
	var sym = symbol(id);
	sym.nud = nud || function () {
	    scope.reserve(this);
	    this.first = expression(70);
	    this.arity = 'unary';
	    return this;
	};
	return sym;
    }

    function stmt(id, std) {
	var sym = symbol(id);
	sym.std = std;
	return sym;
    }

    function advance(id) {
	var type, sym, tok, value, line;
	if (id && token.id != id)
	    throw new Error('Expected "' + id + '", got "' + token.id + '" at line ' + token.line);
	try {
	    do {
		tok = tokens.next();
	    } while (tok.type == 'comment');  // Ignore comments, for now.
	}
	catch (e if e instanceof StopIteration) {
	    token = symbols['(end)'];
	    return token;
	}
	value = tok.value;
	type = tok.type;
	line = tok.line;
	if (type == 'identifier') {
	    sym = scope.find(value);
	    type = 'name';
	}
	else if (type == 'operator') {
	    sym = symbols[value];
	    if (!sym || !hasOwn.call(symbols, value))
		throw new Error('Unknown operator "' + value + '" at line ' + line);
	}
	else if (type == 'string' || type == 'number') {
	    sym = symbols['(literal)'];
	    type = 'literal';
	}
	else if (type == 'comment') {
	    sym = symbols['(comment)'];
	    type = 'comment';
	}
	else throw new Error('Unexpected token "' + value + '" at line ' + line);
	token = Object.create(sym);
	token.from = tok.from;
	token.to = tok.to;
	token.line = tok.line;
	token.value = value;
	token.arity = type;
	return token;
    }

    function expression(rbp) {
	var left, t = token;
	advance();
	left = t.nud();
	while (rbp < token.lbp) {
	    t = token;
	    advance();
	    left = t.led(left);
	}
	return left;
    }

    function statement() {
	var t = token, expr;
	if (t.std) {
	    advance();
	    scope.reserve(t);
	    return t.std();
	}
	expr = expression(0);
	advance(';');
	return expr;
    }

    function statements() {
	var statements = [], s;
	while (true) {
	    if (token.terminates)
		break;
	    s = statement();
	    if (s)
		statements.push(s);
	}
	return statements.length == 1 ? statements[0] : statements.length ? statements : null;
    }

    function block(keyword) {
	if (keyword)
	    advance(keyword);
	return statements();
    }

    function parameterList() {
	var args = [];
	while (true) {
	    if (token.arity != 'name' || (token.arity == 'binary' && token.value != ':'))
		throw new Error('Expected a parameter name at line ' + token.line);

	    if (token.arity == 'name')
		scope.define(token);
	    args.push(expression(0));
	    if (token.id != ',') break;
	    advance(',');
	}
	return args;
    }


    symbol('(name)').nud = function () this;
    symbol('(literal)').nud = function () this;
    symbol('(comment)').nud = function () this;
    symbol('(end)').terminates = true;
    symbol(';');
    symbol(',');
    symbol(')');
    symbol(']');
    symbol('end').terminates = true;
    symbol('else').terminates = true;
    symbol('then');
    symbol('in');

    constant('true', true);
    constant('false', false);
    constant('nil', null);

    symbol('self').nud = function () {
	scope.reserve(this);
	this.arity = 'self';
	return this;
    };

    assignment(':=');

    infix(':', 10, function (left) {
	if (left.arity != 'name')
	    throw new Error('Expected a name at line ' + left.line);
	this.first = left;
	this.second = expression(0);
	this.arity = 'binary';
	return this;
    });

    infix('if', 20, function (left) {
	this.first = expression(0);
	this.second = left;
	if (token.value == 'else') {
	    advance('else');
	    this.third = expression(0);
	}
	else
	    this.third = null;
	this.arity = 'ternary';
	return this;
    });

    infixr('and', 30);
    infixr('but', 30);
    infixr('or', 30);
    infixr('=', 40);
    infixr('/=', 40);
    infixr('<', 40);
    infixr('>', 40);
    infixr('<=', 40);
    infixr('>=', 40);
    infix('+', 50);
    infix('-', 50);
    infix('*', 60);
    infix('/', 60);

    infix('.', 80, function (left) {
	this.first = left;
	if (token.arity != 'name')
	    throw new Error('Expected a property name at line ' + token.line);
	token.arity = 'literal';
	this.second = token;
	this.arity = 'binary';
	advance();
	return this;
    });

    infix('[', 80, function (left) {
	this.first = left;
	this.second = expression(0);
	this.arity = 'binary';
	advance(']');
	return this;
    });

    infix('(', 80, function (left) {
	var args = [];
	this.arity = 'binary';
	this.first = left;
	this.second = args;
	if (token.id != ')') {
	    while (true) {
		args.push(expression(0));
		if (token.id != ',') break;
		advance(',');
	    }
	}
	advance(')');
	return this;
    });

    prefix('not');
    prefix('-');

    prefix('(', function () {
	var e = expression(0);
	advance(')');
	return e;
    });

    prefix('do', function () {
	var params = [];
	newScope();
	if (token.id == '(') {
	    advance();
	    if (token.id != ')')
		params = parameterList();
	    advance(')');
	}
	this.first = params;
	this.second = statements();
	advance('end');
	this.arity = 'lambda';
	scope.pop();
	return this;
    });

    stmt('function', function () {
	var params = [], sig;
	newScope();
	if (token.arity != 'name' || (token.arity == 'binary' && !['.', '['].contains(token.value)))
	    throw new Error('Expected a function name at line ' + token.line);

	if (token.arity == 'name')
	    scope.define(token);

	sig = expression(0);
	this.first = sig.first;
	this.second = sig.second;
	this.third = statements();
	advance('end');
	this.arity = 'statement';
	scope.pop();
	return this;
    });

    stmt('return', function () {
	if (token.id != ';')
	    this.first = expression(0);
	advance(';');
	if (token.id != 'end')
	    throw new Error('Unreachable statement at line ' + token.line);
	this.arity = 'statement';
	return this;
    });

    stmt('if', function ifStatement() {
	var nested = ifStatement.nested;
	this.first = expression(0);
	this.second = block('then');
	if (token.id == 'else') {
	    scope.reserve(token);
	    advance('else');
	    if (token.id == 'if') {
		ifStatement.nested = true;
		this.third = statement();
	    }
	    else
		this.third = block();
	    ifStatement.nested = false;
	}
	else
	    this.third = null;
	if (!nested)
	    advance('end');
	this.arity = 'statement';
	return this;
    });

    stmt('while', function () {
	this.first = expression(0);
	this.second = block('do');
	this.arity = 'statement';
	advance('end');
	return this;
    });

    stmt('for', function () {
	this.first = expression(0);
	advance('in');
	this.second = expression(0);
	this.third = block('do');
	this.arity = 'statement';
	advance('end');
	return this;
    });

    return function () {
	newScope();
	advance();
	var ast = statements();
	advance('(end)');
	scope.pop();
	return ast;
    };
};
