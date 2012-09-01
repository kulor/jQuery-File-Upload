var fs = require('fs'),
    path = require('path'),
    nameCountRegexp = /(?:(?: \(([\d]+)\))?(\.[^.]+))?$/,
    nameCountFunc = function (s, index, ext) {
        return ' (' + ((parseInt(index, 10) || 0) + 1) + ')' + (ext || '');
    },
    _existsSync = fs.existsSync || path.existsSync;

var FileInfoClosure = function(options){
    var FileInfo = function (file) {
        this.name = file.name;
        this.size = file.size;
        this.type = file.type;
        this.delete_type = 'DELETE';
    };

    FileInfo.prototype.validate = function () {
        if (options.minFileSize && options.minFileSize > this.size) {
            this.error = 'minFileSize';
        } else if (options.maxFileSize && options.maxFileSize < this.size) {
            this.error = 'maxFileSize';
        } else if (!options.acceptFileTypes.test(this.name)) {
            this.error = 'acceptFileTypes';
        }
        return !this.error;
    };

    FileInfo.prototype.safeName = function () {
        // Prevent directory traversal and creating hidden system files:
        this.name = path.basename(this.name).replace(/^\.+/, '');
        // Prevent overwriting existing files:
        while (_existsSync(options.uploadDir + '/' + this.name)) {
            this.name = this.name.replace(nameCountRegexp, nameCountFunc);
        }
    };

    FileInfo.prototype.initUrls = function (req) {
        if (!this.error) {
            var that = this,
                baseUrl = (options.ssl ? 'https:' : 'http:') +
                    '//' + req.headers.host + options.uploadUrl;
            this.url = this.delete_url = baseUrl + encodeURIComponent(this.name);
            Object.keys(options.imageVersions).forEach(function (version) {
                if (_existsSync(
                        options.uploadDir + '/' + version + '/' + that.name
                    )) {
                    that[version + '_url'] = baseUrl + version + '/' +
                        encodeURIComponent(that.name);
                }
            });
        }
    };

    return FileInfo;
};

exports.FileInfo = function(options){
    return FileInfoClosure(options);
};