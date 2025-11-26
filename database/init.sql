CREATE TABLE IF NOT EXISTS athletes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_athlete_name (name),
    INDEX idx_athlete_country (country)
);

CREATE TABLE IF NOT EXISTS competitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE,
    location VARCHAR(255),
    event_type VARCHAR(50), -- e.g., '1m', '3m', '10m'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_competition_name (name),
    INDEX idx_competition_date (date),
    INDEX idx_competition_event (event_type)
);

CREATE TABLE IF NOT EXISTS dives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    athlete_id INT,
    competition_id INT,
    dive_code VARCHAR(10) NOT NULL,
    position VARCHAR(1), -- A, B, C, D
    height DECIMAL(3,1),
    difficulty DECIMAL(3,1) NOT NULL,
    judges_scores JSON,
    final_score DECIMAL(5,2),
    `rank` INT,
    round_number INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE SET NULL,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL,
    INDEX idx_dive_code (dive_code),
    INDEX idx_dive_athlete (athlete_id),
    INDEX idx_dive_competition (competition_id),
    INDEX idx_dive_round (round_number)
);

CREATE TABLE IF NOT EXISTS ingestion_logs (
    id VARCHAR(36) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type ENUM('csv', 'pdf', 'json') NOT NULL,
    file_size INT NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed', 'partial') DEFAULT 'pending',
    total_rows INT DEFAULT 0,
    processed_rows INT DEFAULT 0,
    failed_rows INT DEFAULT 0,
    error_message TEXT,
    error_details JSON,
    competition_id INT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL,
    INDEX idx_ingestion_status (status),
    INDEX idx_ingestion_created (created_at)
);
