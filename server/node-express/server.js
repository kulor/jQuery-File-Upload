#!/usr/bin/env node
/*jslint nomen: true, regexp: true, unparam: true */
/*global require, __dirname, unescape */
'use strict';

var express = require('express'),
    app = express(),
    port = 8888;

app.configure(function(){
    var options = {
        tmpDir: __dirname + '/tmp',
        publicDir: __dirname + '/public',
        uploadDir: __dirname + '/public/files',
        uploadUrl: '/files/',
        maxPostSize: 500000000, // 500 MB
        minFileSize: 1,
        maxFileSize: 100000000, // 100 MB
        acceptFileTypes: /.+/i,
        // Files not matched by this regular expression force a download dialog,
        // to prevent executing any scripts in the context of the service domain:
        safeFileTypes: /\.(gif|jpe?g|png)$/i,
        imageTypes: /\.(gif|jpe?g|png)$/i,
        imageVersions: {
            'thumbnail': {
                width: 80,
                height: 80
            }
        },
        accessControl: {
            allowOrigin: '*',
            allowMethods: 'OPTIONS, HEAD, GET, POST, PUT, DELETE'
        },
        /* Uncomment and edit this section to provide the service via HTTPS:
        ssl: {
            key: fs.readFileSync('/Applications/XAMPP/etc/ssl.key/server.key'),
            cert: fs.readFileSync('/Applications/XAMPP/etc/ssl.crt/server.crt')
        },
        */

        nodeStatic: {
            cache: 3600 // seconds to cache served files
        }
    };
    app.set('options', options);
    app.use(express.static(options.publicDir));
});

var uploadRoutes = require('./lib/upload-routes').configure(app.get('options'));

app.all('/', uploadRoutes.accessControl, uploadRoutes.options);
app.get('/', uploadRoutes.get);
app.post('/', uploadRoutes.post);
app.delete('/', uploadRoutes.delete);
app.head('/', uploadRoutes.head);

app.listen(port);
console.log('app running on localhost:' + port);