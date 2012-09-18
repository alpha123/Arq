// Helper functions for ArqScript

// Ugly Function constructor stuff is a workaround to get bound functions to work with keyword arguments.
// Otherwise, bound functions would appear as having no arguments.
exports.bind =
'function __bind$(fn, target) {\n\
    if (typeof fn != "function")\n\
        return fn;\n\
    var source = "" + fn,\n\
        args = source.substring(source.indexOf("(") + 1, source.indexOf(")")),\n\
        bound = Function(args, "return arguments.callee.fn.apply(arguments.callee.target, arguments);");\n\
    bound.fn = fn;\n\
    bound.target = target;\n\
    return bound;\n\
}';

exports.keywordargs =
'function __keywordargs$(fn) {\n\
    var source = "" + fn,\n\
        words = source.substring(source.indexOf("(") + 1, source.indexOf(")")).split(", ");\n\
    return function (args, kwargs) {\n\
        words.each(function (word, index) {\n\
            if (kwargs.hasOwnProperty(word))\n\
                args.splice(index, 0, kwargs[word]);\n\
        });\n\
        return fn.apply(this, args);\n\
    };\n\
}';
