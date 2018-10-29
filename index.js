const express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  cookieParser = require("cookie-parser"),
  tileHelper = require("./points/tileQuery"),
  // significantTile = require("./points/significant"),
  // tileDecorator = require("./decorator/tileDecorator"),
  port = 3000;

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true
  })
);
app.use(cookieParser());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  // res.header("Content-Type", "application/x-protobuf");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

app.use(express.static("public"));

app.get("/api/tile/point/:x/:y/:z.mvt", function (req, res) {
  let filter = req.query.filter,
    url = req.query.url,
    countBy = req.query.countBy,
    field = req.query.field,
    resolution = parseInt(req.query.resolution),
    x = parseInt(req.params.x),
    y = parseInt(req.params.y),
    z = parseInt(req.params.z);

  try {
    filter = JSON.parse(filter);
  } catch (err) {
    filter = undefined;
  }

  tileHelper
    .getTile(x, y, z, filter, countBy, url, resolution, field)
    .then(function (data) {
      res.send(new Buffer(data, "binary"));
    })
    .catch(function (err) {
      res.status(500);
      console.log(err);
      res.send(err.message);
    });
});
/*
app.get("/api/tile/significant/:x/:y/:z.mvt", function (req, res) {
  let filter = req.query.filter,
    url = req.query.url,
    countBy = req.query.countBy,
    field = req.query.field,
    significantField = req.query.significantField,
    resolution = parseInt(req.query.resolution),
    x = parseInt(req.params.x),
    y = parseInt(req.params.y),
    z = parseInt(req.params.z);

  try {
    filter = JSON.parse(filter);
  } catch (err) {
    filter = undefined;
  }

  significantTile
    .getTile(x, y, z, filter, countBy, url, resolution, field, significantField)
    .then(function (data) {
      res.send(new Buffer(data, "binary"));
    })
    .catch(function (err) {
      res.status(500);
      console.log(err);
      res.send(err.message);
    });
});

app.get('/api/tile/raw/:source/:z/:x/:y', function (req, res) {
  mbtiles[req.params.source].getTile(req.params.z, req.params.x, req.params.y, function (err, tile, headers) {
    if (err) {
      res.set({ "Content-Type": "text/plain" });
      res.status(404).send('Tile rendering error: ' + err + '\n');
    } else {
      res.set(headers);
      res.send(tile);
    }
  });
});

app.get('/api/tile/decorated/:z/:x/:y', function (req, res) {
  let options = {
    x: Number(req.params.x),
    y: Number(req.params.y),
    z: Number(req.params.z),
    query: req.query.query,
    esLocationField: req.query.esLocationField,
    esAggField: req.query.esAggField,
    esEndpoint: req.query.esEndpoint,
    tileField: req.query.tileField,
    source: req.query.source
  };

  tileDecorator(options)
    .then(function (tile) {
      res.send(tile);
    })
    .catch(function (err) {
      if (err.message === 'Tile does not exist') {
        res.status(204).send(err);
      } else {
        res.status(500).send(err);
      }

    });
});

app.get('/api/tile/political/:z/:x/:y', function (req, res) {
  let options = {
    x: Number(req.params.x),
    y: Number(req.params.y),
    z: Number(req.params.z),
    query: req.query.query,
    esLocationField: req.query.esLocationField || 'coordinate_point',
    esAggField: 'countryCode',
    esEndpoint: req.query.esEndpoint || 'http://es1.gbif-dev.org:9200/gadm/_search',
    tileField: 'key',
    source: 'country',
    tileLayerName: 'country'
  };

  if (options.z > 4) {
    options.esAggField = 'gadm.GID_1';
    options.tileField = 'GID_1';
    options.source = 'denmark';
    options.tileLayerName = 'gadm36_DNK_1';
  }

  if (options.z > 5) {
    options.esAggField = 'gadm.GID_2';
    options.tileField = 'GID_2';
    options.source = 'denmark';
    options.tileLayerName = 'gadm36_DNK_2';
  }

  if (options.z > 7) {
    tileHelper
      .getTile(options.x, options.y, options.z, options.query, undefined, options.esEndpoint, undefined, options.esLocationField)
      .then(function (data) {
        res.send(new Buffer(data, "binary"));
      })
      .catch(function (err) {
        res.status(500);
        res.send(err);
      });
  } else {
    tileDecorator(options)
      .then(function (tile) {
        res.send(tile);
      })
      .catch(function (err) {
        if (err.message === 'Tile does not exist') {
          res.status(204).send(err);
        } else {
          console.log(err);
          res.status(500).send('Unable to process');
        }
      });
  }
});
*/
app.listen(port);
console.log("listen on part " + port);
