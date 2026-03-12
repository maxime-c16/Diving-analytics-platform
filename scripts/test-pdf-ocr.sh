#!/bin/bash
# ============================================
# PDF OCR Testing Script
# ============================================
# Tests the PDF OCR processing workflow:
# 1. Worker service health check
# 2. Upload a PDF for OCR processing
# 3. Poll for job completion
# 4. Import extracted data
# ============================================

set -e

# Configuration
WORKER_URL="${WORKER_URL:-http://localhost:8080}"
API_URL="${API_URL:-http://localhost/api}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "PDF OCR Processing Test Suite"
echo "============================================"
echo ""

# Test 1: Worker Health Check
echo -e "${YELLOW}Test 1: Worker Service Health Check${NC}"
HEALTH_RESPONSE=$(curl -s "${WORKER_URL}/health" 2>/dev/null || echo '{"error": "connection failed"}')

if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✓ Worker service is healthy${NC}"
    echo "  Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Worker service health check failed${NC}"
    echo "  Response: $HEALTH_RESPONSE"
    echo ""
    echo "Make sure the worker service is running:"
    echo "  docker compose up -d worker-service"
    exit 1
fi
echo ""

# Test 2: Create a test PDF (simple text-based for testing)
echo -e "${YELLOW}Test 2: Creating Test PDF${NC}"
TEST_PDF_PATH="/tmp/test-diving-results.pdf"

# Create a simple PDF using Python (if available)
python3 - << 'PYTHON_SCRIPT'
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    
    pdf_path = "/tmp/test-diving-results.pdf"
    c = canvas.Canvas(pdf_path, pagesize=letter)
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "World Diving Championships 2025")
    c.setFont("Helvetica", 12)
    c.drawString(100, 730, "Budapest, Hungary - November 26, 2025")
    c.drawString(100, 710, "Event: 3m Springboard Men")
    
    # Header
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 680, "Rank")
    c.drawString(90, 680, "Athlete")
    c.drawString(200, 680, "Country")
    c.drawString(260, 680, "Dive")
    c.drawString(310, 680, "DD")
    c.drawString(350, 680, "J1")
    c.drawString(380, 680, "J2")
    c.drawString(410, 680, "J3")
    c.drawString(440, 680, "J4")
    c.drawString(470, 680, "J5")
    c.drawString(500, 680, "Score")
    
    # Results data
    c.setFont("Helvetica", 10)
    results = [
        ("1", "John Smith", "USA", "105B", "2.4", "7.5", "8.0", "7.5", "8.0", "7.5", "55.2"),
        ("2", "Michael Chen", "CHN", "405C", "3.0", "7.0", "7.5", "7.0", "7.5", "7.0", "64.5"),
        ("3", "David Brown", "GBR", "205B", "3.0", "6.5", "7.0", "6.5", "7.0", "6.5", "60.0"),
        ("4", "Hans Mueller", "GER", "107B", "3.1", "7.0", "6.5", "7.0", "7.0", "6.5", "63.55"),
        ("5", "Pierre Dubois", "FRA", "305C", "3.0", "6.5", "6.5", "7.0", "6.5", "6.5", "58.5"),
    ]
    
    y = 660
    for result in results:
        c.drawString(55, y, result[0])
        c.drawString(90, y, result[1])
        c.drawString(200, y, result[2])
        c.drawString(260, y, result[3])
        c.drawString(310, y, result[4])
        c.drawString(350, y, result[5])
        c.drawString(380, y, result[6])
        c.drawString(410, y, result[7])
        c.drawString(440, y, result[8])
        c.drawString(470, y, result[9])
        c.drawString(500, y, result[10])
        y -= 20
    
    c.save()
    print("PDF created successfully")
except ImportError:
    # Fallback: Create a minimal PDF manually
    pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 400 >>
stream
BT
/F1 16 Tf
100 750 Td
(World Diving Championships 2025) Tj
0 -20 Td
/F1 12 Tf
(Budapest, Hungary - Event: 3m Springboard) Tj
0 -30 Td
(1. John Smith USA 105B 2.4 7.5 8.0 7.5 8.0 7.5 55.2) Tj
0 -20 Td
(2. Michael Chen CHN 405C 3.0 7.0 7.5 7.0 7.5 7.0 64.5) Tj
0 -20 Td
(3. David Brown GBR 205B 3.0 6.5 7.0 6.5 7.0 6.5 60.0) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000262 00000 n
0000000715 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
792
%%EOF"""
    with open("/tmp/test-diving-results.pdf", "wb") as f:
        f.write(pdf_content)
    print("Minimal PDF created (reportlab not available)")
PYTHON_SCRIPT

if [ -f "$TEST_PDF_PATH" ]; then
    echo -e "${GREEN}✓ Test PDF created: $TEST_PDF_PATH${NC}"
else
    echo -e "${RED}✗ Failed to create test PDF${NC}"
    exit 1
fi
echo ""

# Test 3: Upload PDF via API
echo -e "${YELLOW}Test 3: Upload PDF via Ingestion API${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "${API_URL}/ingestion/upload/pdf" \
    -F "file=@${TEST_PDF_PATH}" \
    -F "competitionName=Test World Championships" \
    -F "eventType=3m" 2>/dev/null || echo '{"error": "connection failed"}')

echo "Upload response: $UPLOAD_RESPONSE"

if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
    JOB_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✓ PDF uploaded successfully${NC}"
    echo "  Job ID: $JOB_ID"
else
    echo -e "${RED}✗ PDF upload failed${NC}"
    echo ""
    echo "Make sure the API service is running and can reach the worker:"
    echo "  docker compose up -d api-service worker-service"
    exit 1
fi
echo ""

# Test 4: Poll for job completion
echo -e "${YELLOW}Test 4: Polling for Job Completion${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    STATUS_RESPONSE=$(curl -s "${API_URL}/ingestion/pdf/status/${JOB_ID}" 2>/dev/null || echo '{"error": "connection failed"}')
    STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    echo "  Attempt $ATTEMPT: Status = $STATUS"
    
    if [ "$STATUS" = "completed" ]; then
        echo -e "${GREEN}✓ OCR processing completed${NC}"
        DIVES_COUNT=$(echo "$STATUS_RESPONSE" | grep -o '"divesExtracted":[0-9]*' | cut -d':' -f2)
        CONFIDENCE=$(echo "$STATUS_RESPONSE" | grep -o '"confidence":[0-9.]*' | cut -d':' -f2)
        echo "  Dives extracted: $DIVES_COUNT"
        echo "  Confidence: $CONFIDENCE"
        break
    elif [ "$STATUS" = "failed" ]; then
        echo -e "${RED}✗ OCR processing failed${NC}"
        echo "  Response: $STATUS_RESPONSE"
        exit 1
    fi
    
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}✗ Timeout waiting for OCR processing${NC}"
    exit 1
fi
echo ""

# Test 5: Import extracted data
echo -e "${YELLOW}Test 5: Import Extracted Data${NC}"
IMPORT_RESPONSE=$(curl -s -X POST "${API_URL}/ingestion/pdf/import/${JOB_ID}" \
    -H "Content-Type: application/json" \
    -d '{"competitionName": "Test World Championships 2025", "eventType": "3m"}' 2>/dev/null || echo '{"error": "connection failed"}')

echo "Import response: $IMPORT_RESPONSE"

if echo "$IMPORT_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Data imported successfully${NC}"
else
    echo -e "${YELLOW}⚠ Data import may have issues (check response)${NC}"
fi
echo ""

# Test 6: Direct Worker Test (via worker HTTP API)
echo -e "${YELLOW}Test 6: Direct Worker Health Check${NC}"
DIRECT_HEALTH=$(curl -s "${WORKER_URL}/health" 2>/dev/null || echo '{"error": "connection failed"}')
echo "Direct worker response: $DIRECT_HEALTH"

if echo "$DIRECT_HEALTH" | grep -q '"tesseract_available":true'; then
    echo -e "${GREEN}✓ Tesseract OCR is available${NC}"
else
    echo -e "${YELLOW}⚠ Tesseract may not be properly installed${NC}"
fi
echo ""

# Cleanup
rm -f "$TEST_PDF_PATH"

echo "============================================"
echo -e "${GREEN}PDF OCR Test Suite Complete${NC}"
echo "============================================"
echo ""
echo "API Endpoints Available:"
echo "  POST ${API_URL}/ingestion/upload/pdf     - Upload PDF for OCR"
echo "  GET  ${API_URL}/ingestion/pdf/status/:id - Check job status"
echo "  POST ${API_URL}/ingestion/pdf/import/:id - Import extracted data"
echo ""
echo "Worker Endpoints:"
echo "  GET  ${WORKER_URL}/health    - Worker health check"
echo "  POST ${WORKER_URL}/process   - Queue OCR job (internal)"
echo "  GET  ${WORKER_URL}/job/:id   - Get job status (internal)"
echo ""
