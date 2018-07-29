require('dotenv').config();
const fetch = require('node-fetch');
const express = require('express');
const MAP_QUEST_API_KEY = process.env.MAP_QUEST_API_KEY;
const STREETMAPS_WEBSITE = 'https://www.mapquestapi.com/geocoding/v1/reverse';
const PORT = process.env.PORT || 3000;
const GRIDID_PREFIX = 'AQUARIUS GRID ';
const app = express();

async function gridIDForLocation(lat, long) {
  const query = `?key=${MAP_QUEST_API_KEY}&location=${lat},${long}`;
  const url = STREETMAPS_WEBSITE + query;
  console.log('Retrieving grid for', lat, long);
  console.log('The overall url is', url);
  let gridID;
  await fetch(url)
    .then(function(response) {
      if (response.status !== 200) {
        console.log('Error, resource unable to be retreived. Status Code:' + response.status);
        return;
      }
      return response.json();
    })
    .then(function(data) {
      gridID = data['results'][0]['locations'][0]['postalCode'].substring(0, 2);
      return gridID;
    })
    .catch(function(err) {
      console.error('Fetch Error:', err);
    });
  return Promise.resolve(gridID);
}

app.get('/grid/id/:lat/:long', (req, res) => {
  const { lat, long } = req.params;
  const gridID = gridIDForLocation(lat, long).then((gridID) => {
    res.set('Content-Type', 'application/json');
    res.send({ lat, long, grid_id: GRIDID_PREFIX + gridID });
  });
});

app.listen(PORT, () => console.log(`Grid server listening on port ${PORT}`));
