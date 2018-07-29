var fetch = require('node-fetch');
const express = require('express');
const MAP_QUEST_API_KEY = ``;
const STREETMAPS_WEBSITE = 'https://www.mapquestapi.com/geocoding/v1/reverse';
const PORT = process.env.PORT || 3000;
const GRIDID_PREFIX = 'AQUARIUS GRID ';
const app = express();

function gridIDForLocation(lat, long) {
  const query = `?key=${MAP_QUEST_API_KEY}&location=${lat},${long}`;
  const url = STREETMAPS_WEBSITE + query;
  console.log('Retrieving grid for', lat, long);
  console.log('The overall url is', url);
  var postalCode;
  fetch(url)
    .then(function(response) {
      if (response.status !== 200) {
        console.log('Error, resource unable to be retreived. Status Code:' + response.status);
        return;
      }
      return response.json().then(function(data) {
        postalCode = data['results'][0]['locations'][0]['postalCode'];
        console.log(postalCode);
        return GRIDID_PREFIX.substring(0, 2);
      });
    })
    .catch(function(err) {
      console.error('Fetch Error:', err);
    });
}

app.get('/grid/id/:lat/:long', (req, res) => {
  const { lat, long } = req.params;
  const gridID = gridIDForLocation(lat, long);
  res.set('Content-Type', 'application/json');
  res.send({ lat, long, grid_id: gridID });
});

app.listen(PORT, () => console.log(`Grid server listening on port ${PORT}`));
