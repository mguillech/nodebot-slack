'use strict';

/**
 *
 * Main application
 */
var express = require("express"),
    morgan = require("morgan"),
    errorHandler = require('errorhandler'),
    bodyParser = require('body-parser'),
    http = require('http'),
    app = express();

// Some uses
app.use(morgan('dev'));
app.use(bodyParser.json());

// Require the master (cluster) app
require('./master')(app);

// development only
if (app.get('env') == 'development') {
    app.use(errorHandler());
}
else {      // production error handling
    app.use(function(err, req, res, next){
        console.error(err.stack);
        res.send(500, 'Something broke!');
    });
}


var port = Number(process.env.PORT || 5000);

http.createServer(app).listen(port, function(){
    console.log('Express server listening on port ' + port);
});
