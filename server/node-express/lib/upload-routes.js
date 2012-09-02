var fs = require('fs'),
    formidable = require('formidable'),
    imageMagick = require('imageMagick'),
    path = require('path');

var configure = function(options){
    var FileInfo = require('./file-info').FileInfo(options),
        setNoCacheHeaders = function (res) {
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Content-Disposition', 'inline; filename="files.json"');
        };

    return {
        get : function(req, res){
            var files = [];
            setNoCacheHeaders(res);
            
            fs.readdir(options.uploadDir, function (err, list) {
                list.forEach(function (name) {
                    var stats = fs.statSync(options.uploadDir + '/' + name),
                        fileInfo;
                    if (stats.isFile()) {
                        fileInfo = new FileInfo({
                            name: name,
                            size: stats.size
                        });
                        fileInfo.initUrls(req);
                        files.push(fileInfo);
                    }
                });
                res.writeHead(200, {
                    'Content-Type': req.headers.accept
                        .indexOf('application/json') !== -1 ?
                                'application/json' : 'text/plain'
                });
                res.end(JSON.stringify(files));
            });
        },

        post: function(req, res){
            var form = new formidable.IncomingForm(),
                tmpFiles = [],
                files = [],
                map = {},
                counter = 1,
                finish = function () {
                    counter -= 1;
                    if (!counter) {
                        files.forEach(function (fileInfo) {
                            fileInfo.initUrls(req);
                        });
                        res.end(JSON.stringify(files));
                    }
                };
            setNoCacheHeaders(res);

            form.uploadDir = options.tmpDir;
            form.on('fileBegin', function (name, file) {
                tmpFiles.push(file.path);
                var fileInfo = new FileInfo(file, req, true);
                fileInfo.safeName();
                map[path.basename(file.path)] = fileInfo;
                files.push(fileInfo);
            }).on('field', function (name, value) {
                if (name === 'redirect') {
                    res.redirect(value);
                }
            }).on('file', function (name, file) {
                var fileInfo = map[path.basename(file.path)];
                fileInfo.size = file.size;
                if (!fileInfo.validate()) {
                    fs.unlink(file.path);
                    return;
                }
                fs.renameSync(file.path, options.uploadDir + '/' + fileInfo.name);
                if (options.imageTypes.test(fileInfo.name)) {
                    Object.keys(options.imageVersions).forEach(function (version) {
                        counter += 1;
                        var opts = options.imageVersions[version];
                        imageMagick.resize({
                            width: opts.width,
                            height: opts.height,
                            srcPath: options.uploadDir + '/' + fileInfo.name,
                            dstPath: options.uploadDir + '/' + version + '/' +
                                fileInfo.name
                        }, finish);
                    });
                }
            }).on('aborted', function () {
                tmpFiles.forEach(function (file) {
                    fs.unlink(file);
                });
            }).on('progress', function (bytesReceived, bytesExpected) {
                if (bytesReceived > options.maxPostSize) {
                    req.connection.destroy();
                }
            }).on('end', finish).parse(req);
        },

        delete: function(req, res){
            var fileName;
            if (req.url.slice(0, options.uploadUrl.length) === options.uploadUrl) {
                fileName = path.basename(decodeURIComponent(handler.req.url));
                fs.unlink(options.uploadDir + '/' + fileName, function (ex) {
                    Object.keys(options.imageVersions).forEach(function (version) {
                        fs.unlink(options.uploadDir + '/' + version + '/' + fileName);
                    });
                    res.end(!ex);
                });
            } else {
                res.end(false);
            }
        },

        head: function(req, res){
            setNoCacheHeaders(res);
            res.end();
        },

        options: function(req, res, next){
            if (req.method === 'OPTIONS') {
                res.statusCode = 204;
                res.setHeader('Allow', '');
                res.end();
            } else {
                next();
            }
        },

        accessControl: function(req, res, next){
            res.setHeader(
                'Access-Control-Allow-Origin',
                options.accessControl.allowOrigin
            );
            res.setHeader(
                'Access-Control-Allow-Methods',
                options.accessControl.allowMethods
            );
            next();
        }
    }
}

exports.configure = configure;