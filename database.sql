CREATE DATABASE IF NOT EXISTS strom_store;
USE strom_store;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    is_admin TINYINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    price INT,
    thumb TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total INT,
    items TEXT,
    status VARCHAR(50) DEFAULT 'new',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
