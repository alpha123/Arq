exports.loadFile = function (fileName) {
    try {
	var file = OpenRawFile('~/' + fileName), data = file.read(file.getSize());
	file.close();
    }
    catch (e) { throw new Error('Unable to load JSON file ' + fileName + ': ' + e); }
    return JSON.parse(CreateStringFromByteArray(data));
};

exports.saveFile = function (fileName, object) {
    var file, data = CreateByteArrayFromString(JSON.stringify(object));
    try {
	file = OpenRawFile('~/' + fileName, true);
	file.write(data);
	file.close();
    }
    catch (e) { throw new Error('Unable to save JSON file ' + fileName + ': ' + e); }
    return data;
};
