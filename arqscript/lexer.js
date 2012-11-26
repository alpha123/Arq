// Unfortunately, Sphere 1.6 doesn't have the JS version set to 170+, so `yield`
// isn't actually a keyword. Here I work around that to function the same regardless.
// Bizarrely, even in 170+, we can defined a function called yield. I use that to work
// around this in the following manner:
// - Test if we have yield as a keyword or not
// - Define a function called yield that just pushes its argument into an array
// - Call yield with parentheses so that it parses regardless of the JS version
// - If we do have yield as a keyword, it will do the normal behavior
// - Otherwise, push what would be yielded into a tokens array
// - If yield is not a keyword, return a generator expression iterating over that array

var hasYield = (function () {
    try {
	eval('var yield = 42;');
	return false;
    }
    catch (e) {
	return true;
    }
})();

exports.tokenizer = function (string, options) {
    var current, line = 1, from, index = 0, num, str, isAtom, tokens = [], prefix, suffix;

    function yield(value) {  // I'm not sure how this is legal, but I'm fortunate that it is.
	tokens.push(value);
    }

    options = options || {};
    prefix = options.prefix || '<>:/%.';
    suffix = options.suffix || '=>%.';

    function token(type, value) {
	return {
	    type: type,
	    value: value,
	    line: line,
	    from: from,
	    to: index
	};
    }

    function advance() {
	current = string[++index];
    }

    current = string[0];
    while (current) {
	from = index;
	if (current == '\n' || (current == '\r' && string[index + 1] == '\n')) {
	    ++line;
	    while (current == '\n' || current == '\r')
		advance();
	    yield(token('operator', 'nl'));
	}
	else if (current <= ' ')
	    advance();
	else if (/[a-zA-Z_$]/.test(current) || current == "'") {
	    isAtom = current == "'";
	    str = isAtom ? '' : current;
	    advance();
	    while (current && /[a-zA-Z0-9\-_$?!]/.test(current)) {
		str += current;
		advance();
	    }
	    yield(token(isAtom ? 'atom' : 'identifier', options.caseSensitive ? str : str.toLowerCase()));
	}
	else if (current >= '0' && current <= '9') {
	    str = current;
	    advance();
	    while (current && /[0-9_]/.test(current)) {
		if (current != '_')
		    str += current;
		advance();
	    }
	    if (current == '.') {
		do {
		    str += current;
		    advance();
		} while (current && /[0-9]/.test(current));
	    }
	    while (current && /[a-zA-Z]/.test(current))  // Number suffixes: 5px
		advance();  // Ignore
	    num = +str;
	    if (isFinite(num))
		yield(token('number', num));
	    else
		throw new Error('Invalid number "' + num + '" at line ' + line);
	}
	else if (current == '"') {
	    str = '';
	    advance();
	    while (current != '"') {
		str += current;
		advance();
		if (index >= string.length)
		    throw new Error('Unterminated string at line ' + line);
	    }
	    advance();
	    yield(token('string', str));
	}
	else if (current == '-' && string[index + 1] == '-') {
	    advance();
	    advance();
	    str = '';
	    while (current && current != '\n' && current != '\r') {
		str += current;
		advance();
	    }
	    yield(token('comment', str));
	}
	else if (prefix.indexOf(current) > -1) {
	    str = current;
	    advance();
	    while (index < string.length && suffix.indexOf(current) > -1) {
		str += current;
		advance();
	    }
	    yield(token('operator', str));
	}
	else {
	    str = current;
	    advance();
	    yield(token('operator', str));
	}
    }

    if (!hasYield)
	return (tokens[t] for (t in tokens) if (isFinite(+t)));
};
