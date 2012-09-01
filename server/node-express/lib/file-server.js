var nodeStatic = require('node-static'),
    path = require('path'),
    utf8encode = function (str) {
        return unescape(encodeURIComponent(str));
    };

exports.fileServer = function(options){
    var fileServer = new nodeStatic.Server(options.publicDir, options.nodeStatic);
    fileServer.respond = function (pathname, status, _headers, files, stat, req, res, finish) {
        if (!options.safeFileTypes.test(files[0])) {
            // Force a download dialog for unsafe file extensions:
            res.setHeader(
                'Content-Disposition',
                'attachment; filename="' + utf8encode(path.basename(files[0])) + '"'
            );
        } else {
            // Prevent Internet Explorer from MIME-sniffing the content-type:
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }
        nodeStatic.Server.prototype.respond
            .call(this, pathname, status, _headers, files, stat, req, res, finish);
    };
    return fileServer;
};