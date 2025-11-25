#!/bin/bash
# E2E Test Script for Diving Analytics API

API_BASE="http://localhost/api/v1"
PASS=0
FAIL=0

echo "=== Diving Analytics E2E Tests ==="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -n "Testing: $name ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_BASE$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE$endpoint")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC} (HTTP $status_code)"
        ((PASS++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (Expected $expected_status, got $status_code)"
        echo "Response: $body"
        ((FAIL++))
        return 1
    fi
}

echo "--- Health Checks ---"
test_endpoint "API Health" "GET" "/health" "" "200"
test_endpoint "Scores Health" "GET" "/scores/health" "" "200"

echo ""
echo "--- Score Calculation (5 Judges) ---"
test_endpoint "Calculate 103B" "POST" "/scores/calculate" \
    '{"diveCode":"103B","judgeScores":[7.0,7.5,8.0,7.5,8.5]}' "200"

test_endpoint "Calculate 201A" "POST" "/scores/calculate" \
    '{"diveCode":"201A","judgeScores":[8.0,8.5,9.0,8.5,8.0]}' "200"

echo ""
echo "--- Score Calculation (7 Judges) ---"
test_endpoint "Calculate 5132D" "POST" "/scores/calculate" \
    '{"diveCode":"5132D","judgeScores":[6.5,7.0,7.5,8.0,7.5,8.0,6.0]}' "200"

echo ""
echo "--- Error Cases ---"
test_endpoint "Invalid dive code" "POST" "/scores/calculate" \
    '{"diveCode":"INVALID","judgeScores":[7.0,7.5,8.0,7.5,8.5]}' "400"

test_endpoint "Invalid judge count (4)" "POST" "/scores/calculate" \
    '{"diveCode":"103B","judgeScores":[7.0,7.5,8.0,7.5]}' "400"

test_endpoint "Invalid judge count (6)" "POST" "/scores/calculate" \
    '{"diveCode":"103B","judgeScores":[7.0,7.5,8.0,7.5,8.5,8.0]}' "400"

echo ""
echo "--- Batch Processing ---"
test_endpoint "Batch calculate 3 dives" "POST" "/scores/batch" \
    '{"dives":[{"diveCode":"103B","judgeScores":[7.0,7.5,8.0,7.5,8.5]},{"diveCode":"201A","judgeScores":[8.0,8.5,9.0,8.5,8.0]},{"diveCode":"5132D","judgeScores":[6.5,7.0,7.5,8.0,7.5,8.0,6.0]}]}' "200"

echo ""
echo "--- Total Score Calculation ---"
test_endpoint "Calculate total (3 dives)" "POST" "/scores/calculate-total" \
    '[{"diveCode":"103B","judgeScores":[7.0,7.5,8.0,7.5,8.5]},{"diveCode":"201A","judgeScores":[8.0,8.5,9.0,8.5,8.0]},{"diveCode":"301B","judgeScores":[7.5,8.0,8.0,7.5,8.5]}]' "200"

echo ""
echo "=============================="
echo "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "=============================="

if [ $FAIL -eq 0 ]; then
    exit 0
else
    exit 1
fi
