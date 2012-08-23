// Helper functions for ArqScript

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
