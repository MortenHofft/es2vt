var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    tileHelper = require('./tileQuery');

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
app.use(cookieParser());

app.use(express.static('public'));

app.get('/api/tile/:x/:y/:z.mvt', function (req, res) {
    let q = req.query.q,
        url = req.query.url,
        countBy = req.query.countBy,
        field = req.query.field,
        resolution = parseInt(req.query.resolution),
        x = parseInt(req.params.x),
        y = parseInt(req.params.y),
        z = parseInt(req.params.z);

    tileHelper.getTile(x, y, z, q, countBy, url, resolution, field).then(function (data) {
        res.send(new Buffer(data, 'binary'));
    }).catch(function (err) {
        res.status(500);
        res.send(err);
    });
});

app.get('/api/query/tile/:x/:y/:z.mvt', function (req, res) {
    let filter = req.query.filter,
        url = req.query.url,
        countBy = req.query.countBy,
        field = req.query.field,
        resolution = parseInt(req.query.resolution),
        x = parseInt(req.params.x),
        y = parseInt(req.params.y),
        z = parseInt(req.params.z);

    tileHelper.getFilteredTile(x, y, z, filter, countBy, url, resolution, field).then(function (data) {
        res.send(new Buffer(data, 'binary'));
    }).catch(function (err) {
        res.status(500);
        res.send(err);
    });
});

let port = 5000;
app.listen(port);
console.log('listen on part ' + port);