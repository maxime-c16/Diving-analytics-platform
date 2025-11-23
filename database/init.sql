CREATE TABLE IF NOT EXISTS athletes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    birth_date DATE
);

CREATE TABLE IF NOT EXISTS competitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE,
    location VARCHAR(255),
    event_type VARCHAR(50) -- e.g., '1m', '3m', '10m'
);

CREATE TABLE IF NOT EXISTS dives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    athlete_id INT,
    competition_id INT,
    dive_code VARCHAR(10),
    position VARCHAR(1), -- A, B, C, D
    height DECIMAL(3,1),
    difficulty DECIMAL(3,1),
    judges_scores JSON,
    final_score DECIMAL(5,2),
    rank INT,
    FOREIGN KEY (athlete_id) REFERENCES athletes(id),
    FOREIGN KEY (competition_id) REFERENCES competitions(id)
);
