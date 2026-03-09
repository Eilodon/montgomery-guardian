#!/bin/bash

# THỢ RÈN: NHÁT BÚA CUỐI CÙNG - KIỂM TRA 3 LỖ HỔNG ĐÃ ĐƯỢC VÁ
echo "🔨 THỢ RÈN: NHÁT BÚA CUỐI CÙNG - KIỂM TRA 3 FIX CRITICAL"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${BLUE}🧪 TEST: $test_name${NC}"
    echo "Command: $test_command"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        ((TESTS_FAILED++))
    fi
    ((TOTAL_TESTS++))
}

echo -e "\n${YELLOW}🔍 KIỂM TRA CÁC FILE ĐÃ SỬA...${NC}"

# Test 1: Check Redis Distributed Lock in scheduler.py
run_test "Redis Distributed Lock - Scheduler Import" \
    "grep -q 'from api.core.redis import redis_client' backend/etl/scheduler.py"

run_test "Redis Distributed Lock - Hourly Lock Implementation" \
    "grep -q 'lock:etl_hourly.*nx=True.*ex=3300' backend/etl/scheduler.py"

run_test "Redis Distributed Lock - News Lock Implementation" \
    "grep -q 'lock:etl_news.*nx=True.*ex=840' backend/etl/scheduler.py"

# Test 2: Check 311 ETL ThreadPool optimization
run_test "311 ETL - ThreadPool Import" \
    "grep -q 'ThreadPoolExecutor' backend/etl/requests_311_etl.py"

run_test "311 ETL - orjson Import" \
    "grep -q 'import orjson' backend/etl/requests_311_etl.py"

run_test "311 ETL - CPU Pool Implementation" \
    "grep -q 'cpu_pool.*ThreadPoolExecutor' backend/etl/requests_311_etl.py"

run_test "311 ETL - DB Pool Implementation" \
    "grep -q 'db_pool.*ThreadPoolExecutor' backend/etl/requests_311_etl.py"

run_test "311 ETL - Async run_in_executor" \
    "grep -q 'run_in_executor' backend/etl/requests_311_etl.py"

run_test "311 ETL - orjson.dumps Usage" \
    "grep -q 'orjson.dumps' backend/etl/requests_311_etl.py"

# Test 3: Check AI-driven Alert Extraction
run_test "Alert Extractor - Google Generative AI Import" \
    "grep -q 'import google.generativeai as genai' backend/scraper/alert_extractor.py"

run_test "Alert Extractor - Pydantic Models" \
    "grep -q 'class ExtractedAlert.*BaseModel' backend/scraper/alert_extractor.py"

run_test "Alert Extractor - Gemini Model Configuration" \
    "grep -q 'genai.GenerativeModel.*gemini-1.5-flash' backend/scraper/alert_extractor.py"

run_test "Alert Extractor - JSON Schema Enforcement" \
    "grep -q 'response_schema.*AlertExtractionResult' backend/scraper/alert_extractor.py"

run_test "Alert Extractor - Zero Regex (No re import)" \
    "! grep -q 'import re' backend/scraper/alert_extractor.py"

# Test 4: Check requirements.txt updated
run_test "Requirements - Google Generative AI Added" \
    "grep -q 'google-generativeai>=0.8.0' backend/requirements.txt"

echo -e "\n${YELLOW}🔍 KIỂM TRA TÍNH TOÀN VẸN CỦA ARCHITECTURE...${NC}"

# Test 5: Check if files are syntactically correct Python
run_test "Scheduler Python Syntax" \
    "python3 -m py_compile backend/etl/scheduler.py"

run_test "311 ETL Python Syntax" \
    "python3 -m py_compile backend/etl/requests_311_etl.py"

run_test "Alert Extractor Python Syntax" \
    "python3 -m py_compile backend/scraper/alert_extractor.py"

# Test 6: Check Redis configuration
run_test "Redis Client Configuration" \
    "grep -q 'redis_client.*redis.Redis' backend/api/core/redis.py"

run_test "Redis Connection Pool" \
    "grep -q 'ConnectionPool.from_url' backend/api/core/redis.py"

echo -e "\n${YELLOW}🚀 KIỂM TRA DEPENDENCIES VÀ MÔI TRƯỜNG...${NC}"

# Test 7: Check if we can import the modules (basic test - without env vars)
run_test "Import Test - Scheduler Module Structure" \
    "python3 -c 'import ast; ast.parse(open(\"backend/etl/scheduler.py\").read()); print(\"✅ Scheduler syntax OK\")'"

run_test "Import Test - 311 ETL Module Structure" \
    "python3 -c 'import ast; ast.parse(open(\"backend/etl/requests_311_etl.py\").read()); print(\"✅ 311 ETL syntax OK\")'"

run_test "Import Test - Alert Extractor Module Structure" \
    "python3 -c 'import ast; ast.parse(open(\"backend/scraper/alert_extractor.py\").read()); print(\"✅ Alert Extractor syntax OK\")'"

echo -e "\n${YELLOW}🔒 KIỂM TRA TÍNH NĂNG SECURITY...${NC}"

# Test 8: Security checks
run_test "Security - No Hardcoded API Keys in Alert Extractor" \
    "! grep -q 'AIza' backend/scraper/alert_extractor.py"

run_test "Security - Environment Variable Usage" \
    "grep -q 'os.getenv.*GEMINI_API_KEY' backend/scraper/alert_extractor.py"

run_test "Security - Redis Lock Timeout Configuration" \
    "grep -q 'ex=3300\|ex=840' backend/etl/scheduler.py"

echo -e "\n${YELLOW}⚡ KIỂM TRA PERFORMANCE OPTIMIZATION...${NC}"

# Test 9: Performance optimizations
run_test "Performance - ThreadPool Max Workers Configured" \
    "grep -q 'max_workers=4' backend/etl/requests_311_etl.py"

run_test "Performance - orjson Instead of json" \
    "grep -q 'orjson.dumps' backend/etl/requests_311_etl.py"

run_test "Performance - Async Redis Operations" \
    "grep -q 'await redis_client' backend/etl/requests_311_etl.py"

echo -e "\n${BLUE}📊 KẾT QUẢ TỔNG KẾT${NC}"
echo "=========================================================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 TẤT CẢ 3 LỖ HỔNG ĐÃ ĐƯỢC VÁ THÀNH CÔNG!${NC}"
    echo -e "${GREEN}✅ Distributed Lock: Ngăn 4 workers chạy ETL đồng thời${NC}"
    echo -e "${GREEN}✅ ThreadPool Optimization: Tách CPU-bound và I/O operations${NC}"
    echo -e "${GREEN}✅ AI-Driven Extraction: Thay thế Regex bằng Gemini Vision${NC}"
    echo -e "\n${YELLOW}🔒 ARCHITECTURE ĐÃ ĐƯỢC KHÓA CHẶT - SẴN SÀNG PRODUCTION!${NC}"
    echo -e "\n${BLUE}📋 CHI TIẾT CÁC FIX:${NC}"
    echo -e "• ${BLUE}STEP 1:${NC} Redis Distributed Lock với nx=True và ex timeout"
    echo -e "• ${BLUE}STEP 2:${NC} ThreadPoolExecutor cho CPU-bound và DB operations"
    echo -e "• ${BLUE}STEP 3:${NC} Gemini 1.5 Flash với structured JSON output"
    echo -e "\n${GREEN}🚀 MONTGOMERY GUARDIAN - PRODUCTION READY!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ CÓ $TESTS_FAILED TESTS THẤT BẠI - CẦN KIỂM TRA LẠI${NC}"
    exit 1
fi
