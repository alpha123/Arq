exports.Resource = new Class({
    initialize: function (directory, load, extensions, ignore, skipProcessing) {
        ignore = ignore || [];
        this.directory = directory;
        this.load = load;
        function loadFiles(base, dir, obj, useBase) {
            dir = base + '/' + dir;
            GetFileList(dir).each(function (file) {
                var f = file, parts = file.split('.'), name = parts.slice(0, -1).join('.'), ext = parts.getLast();
                if (useBase) 
                    f = dir + '/' + file;
                if (!ignore.contains(f) && (!extensions || extensions.contains(ext)))
                    obj[skipProcessing ? name : name.toLowerCase().camelCase()] = load(f);
            });
            GetDirectoryList(dir).each(function (d) {
                if (!ignore.contains(d))
                    loadFiles(dir, d, obj[skipProcessing ? d : d.camelCase().capitalize()] = {}, true);
            });
        }
        loadFiles('~', directory, this);
    }
});
