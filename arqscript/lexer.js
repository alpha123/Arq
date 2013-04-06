exports.tokenize = function (string, options) {
    var current, line = 1, from, index = 0, num, str, isAtom, tokens = [], prefix, suffix;

    options = options || {};
    prefix = options.prefix || '<>:|/%.';
    suffix = options.suffix || '=>|%.';

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
	    tokens.push(token('operator', 'nl'));
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
	    tokens.push(token(isAtom ? 'atom' : 'identifier', options.caseSensitive ? str : str.toLowerCase()));
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
		tokens.push(token('number', num));
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
	    tokens.push(token('string', str));
	}
	else if (current == '-' && string[index + 1] == '-') {
	    advance();
	    advance();
	    str = '';
	    while (current && current != '\n' && current != '\r') {
		str += current;
		advance();
	    }
	    tokens.push(token('comment', str));
	}
	else if (prefix.indexOf(current) > -1) {
	    str = current;
	    advance();
	    while (index < string.length && suffix.indexOf(current) > -1) {
		str += current;
		advance();
	    }
	    tokens.push(token('operator', str));
	}
	else {
	    str = current;
	    advance();
	    tokens.push(token('operator', str));
	}
    }

    return tokens;
};
