# decorator
Decorate vector tiles with elastic search aggregations to facilitate choropleths

Given :
* A tile source with a key:[ID] for geometries.
* A ES endpoint
* A field (keyword) to do aggregations on in ES. 
* An x,y,z tile
* An ES field to filter tile geometry on.

Possibly an ID mapping function?
Distinct values will be matched to the IDs in the vector tiles.

Seperate module
ES: Given a query or simply a q, then add an additional geom filter for a given tile. As a starter it could support q only.

Together they can be combined to a generic service

getTile(x, y, z, choroplethSource, esSource, esAggField, esLocationField, [mapping])
that can build specialized ones

tiles/choropleth/:z/:x/:y.:mvt?q&query&grouping