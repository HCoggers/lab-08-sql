DROP TABLE IF EXISTS trails, shops, movies, weathers, meetups, locations;

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(8, 6),
  longitude NUMERIC(9, 6)
);

CREATE TABLE IF NOT EXISTS weathers (
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  time VARCHAR(255),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS meetups (
  id SERIAL PRIMARY KEY,
  link VARCHAR(255),
  name VARCHAR(255),
  creation_date CHAR(15),
  host VARCHAR(255),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500),
  overview VARCHAR(1000),
  average_votes NUMERIC(3, 1),
  total_votes NUMERIC(9, 0),
  image_url VARCHAR(500),
  popularity NUMERIC(5, 3),
  released_on CHAR(10),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  image_url VARCHAR(500),
  price VARCHAR(5),
  rating NUMERIC(3, 1),
  url VARCHAR(500),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS trails (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  location VARCHAR(255),
  length NUMERIC(5, 1),
  stars NUMERIC(3, 1),
  star_votes NUMERIC(9, 0),
  summary VARCHAR(1000),
  trail_url VARCHAR(500),
  conditions VARCHAR(255),
  condition_date CHAR(10),
  condition_time CHAR(8),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);