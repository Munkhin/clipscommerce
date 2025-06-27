CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('admin'), ('user');

ALTER TABLE auth.users ADD COLUMN role_id INTEGER REFERENCES roles(id);
