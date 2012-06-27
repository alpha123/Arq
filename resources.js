var Resource = require('Arq/resource').Resource, loading = require('Arq/loadscreen').loading;

loading('fonts');
exports.Fonts = new Resource('fonts', LoadFont, ['rfn']);

loading('images');
exports.Images = new Resource('images', LoadImage, ['png']);

loading('sounds');
exports.Sounds = new Resource('sounds', LoadSound, ['mp3', 'ogg', 'mid']);

loading('spritesets');
exports.Spritesets = new Resource('spritesets', LoadSpriteset, ['rss']);

loading('window styles');
exports.WindowStyles = new Resource('windowstyles', LoadWindowStyle, ['rws']);
