'use strict';

// Application Dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const cors = require('cors');

// Load environment variables from .env file
require('dotenv').config();

// Application Setup
const app = express();
const PORT = process.env.PORT || 1331;

app.use(cors());

// Database Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// API Routes
app.get('/location', (request, response) => {
  getLocation(request.query.data)
    .then(location => {
      console.log('27', location);
      response.send(location)
    })
    .catch(error => handleError(error, response));
})

app.get('/weather', getWeather);
app.get('/meetups', getMeetups);
app.get('/movies', getMovies);
app.get('/yelp', getYelp);
app.get('/trails', getTrails);

// Make sure the server is listening for requests
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

// *********************
// MODELS
// *********************

function Location(query, res) {
  this.search_query = query;
  this.formatted_query = res.formatted_address;
  this.latitude = res.geometry.location.lat;
  this.longitude = res.geometry.location.lng;
}

function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
}

function Meetup(meetup) {
  this.link = meetup.link;
  this.name = meetup.group.name;
  this.creation_date = new Date(meetup.group.created).toString().slice(0, 15);
  this.host = meetup.group.who;
}

function Movie(movie) {
  this.title = movie.title;
  this.overview = movie.overview;
  this.average_votes = movie.vote_average;
  this.total_votes = movie.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
  this.popularity = movie.popularity;
  this.released_on = movie.release_date;
}

function Yelp(shop) {
  this.name = shop.name;
  this.image_url = shop.image_url;
  this.price = shop.price;
  this.rating = shop.rating;
  this.url = shop.url;
}

function Trail(trail) {}

// *********************
// HELPER FUNCTIONS
// *********************

function handleError(err, res) {
  console.error(err);
  if (res) res.status(500).send('Sorry, something went wrong');
}


function getLocation(query) {
  // CREATE the query string to check for the existence of the location
  const SQL = `SELECT * FROM locations WHERE search_query=$1;`;
  const values = [query];

  // Make the query of the database
  return client.query(SQL, values)
    .then(result => {
      // Check to see if the location was found and return the results
      if (result.rowCount > 0) {
        console.log('From SQL');
        return result.rows[0];

        // Otherwise get the location information from the Google API
      } else {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;

        return superagent.get(url)
          .then(data => {
            console.log('FROM API line 101');
            // Throw an error if there is a problem with the API request
            if (!data.body.results.length) { throw 'no Data' }

            // Otherwise create an instance of Location
            else {
              let location = new Location(query, data.body.results[0]);
              console.log('108', location);

              // Create a query string to INSERT a new record with the location data
              let newSQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING id;`;
              console.log('112', newSQL)
              let newValues = Object.values(location);
              console.log('114', newValues)

              // Add the record to the database
              return client.query(newSQL, newValues)
                .then(result => {
                  // Attach the id of the newly created record to the instance of location.
                  // This will be used to connect the location to the other databases.
                  console.log('121', 'id:', result.rows[0].id)
                  location.id = result.rows[0].id;
                  return location;
                })
                .catch(console.error);
            }
          })
          .catch(error => console.log('Error in SQL Call'));
      }
    });
}

function getWeather(request, response) {
  // CREATE the query string to check for the existence of the location
  const SQL = `SELECT * FROM weathers WHERE location_id=$1`;
  const values = [request.query.data.id];

  // Make the query of the database
  return client.query(SQL, values)
    .then(result => {
      // Check to see if the location was found and return the results
      if (result.rowCount > 0) {
        console.log('From SQL', result.rows[0]);
        response.send(result.rows);
        // Otherwise get the location information from Dark Sky
      } else {
        const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

        superagent.get(url)
          .then(result =>{
            const weatherSummaries = result.body.daily.data.map(day => {
              const summary = new Weather(day);
              return summary;
            });
            let newSQL = `INSERT INTO weathers(forecast, time, location_id) VALUES ($1, $2, $3);`;
            console.log('156', weatherSummaries[0]); // array of objects
            weatherSummaries.forEach(summary => {
              let newValues = Object.values(summary);
              newValues.push(request.query.data.id);
              // Add the record to the database
              return client.query(newSQL, newValues)
                .catch(console.error);
            })
            response.send(weatherSummaries);
          })
          .catch(error => handleError(error, response));
      }
    })
}

function getMeetups(request, response) {
  // CREATE the query string to check for the existence of the location
  const SQL = `SELECT * FROM meetups WHERE location_id=$1`;
  const values = [request.query.data.id];

  // Make the query of the database
  return client.query(SQL, values)
    .then(result => {
      // Check to see if the location was found and return the results
      if (result.rowCount > 0) {
        console.log('From SQL', result.rows[0]);
        response.send(result.rows);
        // Otherwise get the location information from Meetup
      } else {
        const url = `https://api.meetup.com/find/upcoming_events?&sign=true&photo-host=public&lon=${request.query.data.longitude}&page=20&lat=${request.query.data.latitude}&key=${process.env.MEETUP_API_KEY}`;

        superagent.get(url)
          .then(result =>{
            const meetupSummaries = result.body.events.map(event => {
              const summary = new Meetup(event);
              return summary;
            });
            let newSQL = `INSERT INTO meetups(link, name, creation_date, host, location_id) VALUES ($1, $2, $3, $4, $5);`;
            console.log('195', meetupSummaries[0]); // array of objects
            meetupSummaries.forEach(summary => {
              let newValues = Object.values(summary);
              newValues.push(request.query.data.id);
              // Add the record to the database
              return client.query(newSQL, newValues)
                .catch(console.error);
            })
            response.send(meetupSummaries);
          })
          .catch(error => handleError(error, response));
      }
    })
}

function getMovies(request, response) {
  const SQL = `SELECT * FROM movies WHERE location_id=$1`;
  const values = [request.query.data.id];

  return client.query(SQL, values)
    .then(result => {
      if (result.rowCount > 0) {
        console.log('217 From SQL', result.rows[0]);
        response.send(result.rows);
      } else {
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&query=${request.query.data.search_query}`;

        superagent.get(url)
          .then(result =>{
            const movieSummaries = result.body.results.map(movie => {
              const summary = new Movie(movie);
              return summary;
            });
            let newSQL = `INSERT INTO movies(title, overview, average_votes, total_votes, image_url, popularity, released_on, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`;
            movieSummaries.forEach(summary => {
              let newValues = Object.values(summary);
              newValues.push(request.query.data.id);
              return client.query(newSQL, newValues)
                .catch(console.error);
            })
            response.send(movieSummaries);
          })
          .catch(error => handleError(error, response));
      }
    })
}

function getYelp(request, response) {

  const SQL = `SELECT * FROM shops WHERE location_id=$1`;
  const values = [request.query.data.id];

  return client.query(SQL, values)
    .then(result => {
      if (result.rowCount > 0) {
        console.log('262 From SQL', result.rows[0]);
        response.send(result.rows);
      } else {
        const url = `https://api.yelp.com/v3/businesses/search?latitude=${request.query.data.latitude}&longitude=${request.query.data.longitude}`;

        superagent.get(url)
          .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
          .then(result =>{
            const yelpSummaries = result.body.businesses.map(shop => {
              const summary = new Yelp(shop);
              return summary;
            });
            let newSQL = `INSERT INTO shops(name, image_url, price, rating, url, location_id) VALUES ($1, $2, $3, $4, $5, $6);`;
            yelpSummaries.forEach(summary => {
              let newValues = Object.values(summary);
              newValues.push(request.query.data.id);
              return client.query(newSQL, newValues)
                .catch(console.error);
            })
            response.send(yelpSummaries);
          })
          .catch(error => handleError(error, response));
      }
    })
}