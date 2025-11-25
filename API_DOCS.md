# Diving Analytics Platform - API Documentation

## 🚀 Quick Start

### Access Swagger UI
Once the services are running, access the interactive API documentation at:

- **Via Nginx (Recommended)**: http://localhost/api/docs
- **Direct Backend**: http://localhost:3000/api/docs

### Start Services
```bash
docker compose up -d
```

---

## 📚 API Endpoints

### Health Checks

#### GET `/api/v1/health`
Root API health check

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-23T21:00:00.000Z",
  "uptime": 123.456
}
```

#### GET `/api/v1/scores/health`
Scores service health check

**Response:**
```json
{
  "status": "ok",
  "service": "scores",
  "timestamp": "2025-11-23T21:00:00.000Z",
  "features": ["5-judge", "7-judge", "fina-rules"]
}
```

---

### Score Calculation

#### POST `/api/v1/scores/calculate`
Calculate score for a single dive using FINA rules

**Request Body:**
```json
{
  "diveCode": "103B",
  "judgeScores": [7.0, 7.5, 8.0, 7.5, 8.5]
}
```

**Response:**
```json
{
  "diveCode": "103B",
  "difficulty": 1.7,
  "judgeScores": [7.0, 7.5, 8.0, 7.5, 8.5],
  "droppedScores": [7.0, 8.5],
  "effectiveScores": [7.5, 8.0, 7.5],
  "rawScore": 23.0,
  "finalScore": 39.1
}
```

**FINA Rules:**
- **5 judges**: Drop 1 highest, 1 lowest → sum 3 middle scores × difficulty
- **7 judges**: Drop 2 highest, 2 lowest → sum 3 middle scores × difficulty

**Dive Code Format (FINA Rules):**

Dive codes are designated by 3 or 4 numerals followed by a single letter indicating position.

**Groups 1-4** (Front/Back/Reverse/Inward): `[Group][Flying][Half-Somersaults][Position]`
- First digit: Group (1=Front, 2=Back, 3=Reverse, 4=Inward)
- Second digit: Flying action (0=no flying, 1=flying)
- Third digit(s): Number of half-somersaults (3=1.5 somersaults, 11=5.5 somersaults)
- Letter: Position (A=Straight, B=Pike, C=Tuck, D=Free)
- Example: `103B` = Forward (1), No flying (0), 1.5 somersaults (3), Pike (B)
- Example: `113C` = Forward (1), Flying (1), 1.5 somersaults (3), Tuck (C)

**Group 5** (Twisting): `[5][Direction][Half-Somersaults][Half-Twists][Position]`
- First digit: 5 (Twisting group)
- Second digit: Direction (1=Front, 2=Back, 3=Reverse, 4=Inward)
- Third digit(s): Number of half-somersaults
- Next digit(s): Number of half-twists
- Letter: Position
- Example: `5132D` = Twisting (5), Forward direction (1), 1.5 somersaults (3), 1 twist (2 half-twists), Free (D)

**Group 6** (Armstand): `[6][Direction][Half-Somersaults][Half-Twists]?[Position]`
- First digit: 6 (Armstand group)
- Second digit: Direction (1=Front, 2=Back, 3=Reverse, 4=Inward)
- Third digit(s): Number of half-somersaults
- Optional digit(s): Number of half-twists (if any)
- Letter: Position
- Example: `612B` = Armstand (6), Front direction (1), 1 somersault (2), Pike (B)
- Example: `6122B` = Armstand (6), Front direction (1), 1 somersault (2), 1 twist (2 half-twists), Pike (B)

---

#### POST `/api/v1/scores/calculate-total`
Calculate total score across multiple dives

**Request Body:**
```json
[
  {
    "diveCode": "103B",
    "judgeScores": [7.0, 7.5, 8.0, 7.5, 8.5]
  },
  {
    "diveCode": "201A",
    "judgeScores": [8.0, 8.5, 9.0, 8.5, 8.0]
  },
  {
    "diveCode": "301B",
    "judgeScores": [7.5, 8.0, 8.0, 7.5, 8.5]
  }
]
```

**Response:**
```json
{
  "dives": [
    {
      "diveCode": "103B",
      "difficulty": 1.7,
      "finalScore": 39.1,
      ...
    },
    {
      "diveCode": "201A",
      "difficulty": 1.5,
      "finalScore": 37.5,
      ...
    },
    {
      "diveCode": "301B",
      "difficulty": 1.9,
      "finalScore": 45.6,
      ...
    }
  ],
  "totalScore": 122.2,
  "numDives": 3
}
```

---

#### POST `/api/v1/scores/batch`
Batch process multiple dive calculations

**Request Body:**
```json
{
  "dives": [
    {
      "diveCode": "103B",
      "judgeScores": [7.0, 7.5, 8.0, 7.5, 8.5]
    },
    {
      "diveCode": "5132D",
      "judgeScores": [6.5, 7.0, 7.5, 8.0, 7.5, 8.0, 6.0]
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "diveCode": "103B",
      "finalScore": 39.1,
      ...
    },
    {
      "diveCode": "5132D",
      "finalScore": 48.4,
      ...
    }
  ],
  "total": 2
}
```

---

## 🔬 Compute Engine Analytics (Python)

The Python compute-engine service provides advanced analytics:

### POST `http://localhost:5000/api/analytics/statistics`
Calculate advanced statistics for score distributions

**Request:**
```json
{
  "scores": [39.1, 37.5, 48.4, 42.0, 35.5, 40.0]
}
```

**Response:**
```json
{
  "count": 6,
  "mean": 40.42,
  "median": 39.55,
  "std": 4.52,
  "variance": 20.43,
  "min": 35.5,
  "max": 48.4,
  "range": 12.9,
  "q1": 37.8,
  "q3": 42.0,
  "iqr": 4.2,
  "skewness": 0.23,
  "kurtosis": -0.89
}
```

---

### POST `http://localhost:5000/api/analytics/judge-consistency`
Analyze judge scoring consistency across multiple dives

**Request:**
```json
{
  "dives": [
    {
      "judgeScores": [7.0, 7.5, 8.0, 7.5, 8.5]
    },
    {
      "judgeScores": [8.0, 8.5, 9.0, 8.5, 8.0]
    }
  ]
}
```

**Response:**
```json
{
  "judges": [
    {
      "judgeIndex": 0,
      "mean": 7.5,
      "std": 0.71,
      "min": 7.0,
      "max": 8.0,
      "consistency": "high"
    },
    ...
  ],
  "overallStd": 0.65,
  "numDives": 2,
  "consistency": "high"
}
```

---

### POST `http://localhost:5000/api/analytics/predict-score`
Predict future scores based on historical performance

**Request:**
```json
{
  "historicalScores": [39.1, 37.5, 42.0, 38.5],
  "difficulty": 2.2
}
```

**Response:**
```json
{
  "predictedScore": 86.5,
  "confidence": 3.8,
  "lowerBound": 82.7,
  "upperBound": 90.3,
  "basedOnDives": 4,
  "trend": "improving"
}
```

---

### POST `http://localhost:5000/api/analytics/competition-insights`
Generate competition rankings and insights

**Request:**
```json
{
  "athletes": [
    {
      "id": 1,
      "name": "Alice Smith",
      "scores": [39.1, 42.0, 38.5]
    },
    {
      "id": 2,
      "name": "Bob Johnson",
      "scores": [37.5, 40.0, 36.0]
    }
  ]
}
```

**Response:**
```json
{
  "athletes": [
    {
      "athleteId": 1,
      "athleteName": "Alice Smith",
      "rank": 1,
      "totalScore": 119.6,
      "averageScore": 39.87,
      "bestDive": 42.0,
      "worstDive": 38.5,
      "consistency": 1.76,
      "numDives": 3
    },
    {
      "athleteId": 2,
      "athleteName": "Bob Johnson",
      "rank": 2,
      "totalScore": 113.5,
      "averageScore": 37.83,
      "bestDive": 40.0,
      "worstDive": 36.0,
      "consistency": 2.02,
      "numDives": 3
    }
  ],
  "competitionStats": {
    "totalAthletes": 2,
    "highestScore": 119.6,
    "averageScore": 116.55
  }
}
```

---

## 🧪 Testing

### Run E2E Tests
```bash
./scripts/e2e-test.sh
```

### Manual Testing
```bash
# Calculate single dive (5 judges)
curl -X POST http://localhost/api/v1/scores/calculate \
  -H "Content-Type: application/json" \
  -d '{"diveCode":"103B","judgeScores":[7.0,7.5,8.0,7.5,8.5]}'

# Calculate single dive (7 judges)
curl -X POST http://localhost/api/v1/scores/calculate \
  -H "Content-Type: application/json" \
  -d '{"diveCode":"5132D","judgeScores":[6.5,7.0,7.5,8.0,7.5,8.0,6.0]}'

# Batch process
curl -X POST http://localhost/api/v1/scores/batch \
  -H "Content-Type: application/json" \
  -d '{"dives":[{"diveCode":"103B","judgeScores":[7.0,7.5,8.0,7.5,8.5]},{"diveCode":"201A","judgeScores":[8.0,8.5,9.0,8.5,8.0]}]}'
```

---

## 📖 FINA Dive Codes Reference

### Diving Number Designations (FINA Rules 1.5.1 - 1.5.9)

All dives shall be designated by a system of 3 or 4 numerals followed by a single letter.

### Dive Groups (First Digit)
1. **Forward (1)**: Diver faces forward, rotates forward
2. **Back (2)**: Diver faces backward, rotates backward
3. **Reverse (3)**: Diver faces forward, rotates backward
4. **Inward (4)**: Diver faces backward, rotates forward
5. **Twisting (5)**: Dive with twists (second digit indicates direction)
6. **Armstand (6)**: Handstand takeoff, platform only (second digit indicates direction)

### Second Digit Rules
**Groups 1-4** (Front/Back/Reverse/Inward):
- `0` = No flying action
- `1` = Flying action during the dive

**Groups 5-6** (Twisting/Armstand):
- `1` = Front direction
- `2` = Back direction
- `3` = Reverse direction
- `4` = Inward direction

### Third Digit (Half-Somersaults)
- Indicates the number of half-somersaults being performed
- Examples: 1=½, 2=1, 3=1½, 4=2, 5=2½, 6=3, 7=3½, 8=4, 9=4½
- For more than 4½ somersaults: use two digits (e.g., 10=5, 11=5½ as in 1011B)

### Fourth Digit (Half-Twists) - Groups 5-6 Only
- Indicates the number of half-twists being performed
- Examples: 1=½ twist, 2=1 twist, 3=1½ twists, 4=2 twists

### Position Codes (Letter)
- **A**: Straight
- **B**: Pike
- **C**: Tuck
- **D**: Free (combination of other positions, restricted in some twisting dives)

### Platform Codes (Not included in the dive code)
- **1M**: 1m springboard
- **3M**: 3m springboard
- **5M - 10M**: 5m, 7.5m, or 10m platform

### Examples
- `103B`: Forward (1), No flying (0), 1½ somersaults (3), Pike (B)
- `113C`: Forward (1), Flying (1), 1½ somersaults (3), Tuck (C)
- `201A`: Back (2), No flying (0), ½ somersault (1), Straight (A)
- `301B`: Reverse (3), No flying (0), ½ somersault (1), Pike (B)
- `5132D`: Twisting (5), Forward direction (1), 1½ somersaults (3), 1 twist (2), Free (D)
- `5134D`: Twisting (5), Forward direction (1), 1½ somersaults (3), 2 twists (4), Free (D)
- `612B`: Armstand (6), Front direction (1), 1 somersault (2), Pike (B)
- `6243D`: Armstand (6), Back direction (2), 2 somersaults (4), 1½ twists (3), Free (D)
- `1011B`: Forward (1), No flying (0), 5½ somersaults (11), Pike (B)

---

## 🔧 Error Handling

### 400 Bad Request
**Invalid Dive Code:**
```json
{
  "statusCode": 400,
  "message": "Invalid FINA dive code",
  "error": "Bad Request"
}
```

**Invalid Judge Count:**
```json
{
  "statusCode": 400,
  "message": "Must have exactly 5 or 7 judges",
  "error": "Bad Request"
}
```

**Invalid Score Range:**
```json
{
  "statusCode": 400,
  "message": [
    "each value in judgeScores must not be less than 0",
    "each value in judgeScores must not be greater than 10"
  ],
  "error": "Bad Request"
}
```

---

## 🛠️ Development

### Rebuild Backend with New Dependencies
```bash
docker compose build api-service
docker compose up -d api-service
```

### View Logs
```bash
docker compose logs -f api-service
```

### Database Access
```bash
docker exec -it mariadb mysql -u root -prootpassword diving_analytics
```

---

## 📦 Dependencies

### Backend (NestJS)
- `@nestjs/swagger` - OpenAPI/Swagger documentation
- `@nestjs/typeorm` - Database ORM
- `class-validator` - DTO validation
- `class-transformer` - DTO transformation

### Compute Engine (Python)
- `flask` - Web framework
- `numpy` - Numerical computing
- `scipy` - Statistical functions

---

## 🎯 Roadmap

- [x] Score calculation API (5/7 judges)
- [x] Swagger/OpenAPI documentation
- [x] Analytics endpoints (statistics, predictions)
- [ ] Data ingestion (CSV/PDF upload)
- [ ] OCR for PDF processing
- [ ] Frontend dashboard
- [ ] Authentication & authorization
- [ ] Performance optimization

---

## 📄 License

This project is licensed under the MIT License.
