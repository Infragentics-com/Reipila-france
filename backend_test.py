"""
reipila Backend API Testing
Tests all endpoints with demo credentials: demo@reipila.com / demo1234
"""
import requests
import sys
import json
from datetime import datetime

class ReipilaAPITester:
    def __init__(self, base_url="https://prop-signal-build.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failed_tests = []
        self.test_parcel_ref = None

    def log(self, msg, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {msg}")

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, return_data=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        self.log(f"Testing {name}...", "TEST")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - {name} - Status: {response.status_code}", "PASS")
                if return_data:
                    try:
                        return True, response.json()
                    except:
                        return True, {}
                return True, {}
            else:
                self.tests_failed += 1
                self.failed_tests.append(f"{name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"❌ FAILED - {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                try:
                    error_detail = response.json()
                    self.log(f"   Error detail: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response text: {response.text[:200]}", "ERROR")
                return False, {}

        except Exception as e:
            self.tests_failed += 1
            self.failed_tests.append(f"{name} - Exception: {str(e)}")
            self.log(f"❌ FAILED - {name} - Exception: {str(e)}", "FAIL")
            return False, {}

    def test_auth_login(self):
        """Test login with demo credentials"""
        self.log("=" * 60, "INFO")
        self.log("TESTING AUTH ENDPOINTS", "INFO")
        self.log("=" * 60, "INFO")
        
        success, response = self.run_test(
            "POST /api/auth/login",
            "POST",
            "auth/login",
            200,
            data={"email": "demo@reipila.com", "password": "demo1234"},
            return_data=True
        )
        if success and 'token' in response:
            self.token = response['token']
            self.log(f"   Token obtained: {self.token[:20]}...", "INFO")
            return True
        return False

    def test_auth_me(self):
        """Test /api/auth/me endpoint"""
        success, response = self.run_test(
            "GET /api/auth/me",
            "GET",
            "auth/me",
            200,
            return_data=True
        )
        if success:
            self.log(f"   User: {response.get('email')} - {response.get('name')}", "INFO")
        return success

    def test_stats_overview(self):
        """Test /api/stats/overview"""
        self.log("=" * 60, "INFO")
        self.log("TESTING STATS & FEED ENDPOINTS", "INFO")
        self.log("=" * 60, "INFO")
        
        success, response = self.run_test(
            "GET /api/stats/overview",
            "GET",
            "stats/overview",
            200,
            return_data=True
        )
        if success:
            self.log(f"   Stats: {response}", "INFO")
        return success

    def test_feed(self):
        """Test /api/feed"""
        success, response = self.run_test(
            "GET /api/feed",
            "GET",
            "feed",
            200,
            params={"limit": 10},
            return_data=True
        )
        if success:
            feed_items = response.get('feed', [])
            self.log(f"   Feed items: {len(feed_items)}", "INFO")
            if feed_items:
                # Store first parcel ref for later tests
                self.test_parcel_ref = feed_items[0].get('ref_cadastrale')
                self.log(f"   First parcel ref: {self.test_parcel_ref}", "INFO")
        return success

    def test_map_parcelles(self):
        """Test /api/map/parcelles (GeoJSON)"""
        self.log("=" * 60, "INFO")
        self.log("TESTING MAP ENDPOINTS", "INFO")
        self.log("=" * 60, "INFO")
        
        success, response = self.run_test(
            "GET /api/map/parcelles",
            "GET",
            "map/parcelles",
            200,
            params={"min_conviction": 40, "limit": 100},
            return_data=True
        )
        if success:
            features = response.get('features', [])
            self.log(f"   GeoJSON features: {len(features)}", "INFO")
            if features and not self.test_parcel_ref:
                # Store a parcel ref if we don't have one yet
                self.test_parcel_ref = features[0].get('properties', {}).get('ref_cadastrale')
                self.log(f"   Parcel ref from map: {self.test_parcel_ref}", "INFO")
        return success

    def test_parcelle_detail(self):
        """Test /api/parcelles/{ref}"""
        if not self.test_parcel_ref:
            self.log("⚠️  No parcel ref available, skipping parcelle detail test", "WARN")
            return True
        
        success, response = self.run_test(
            f"GET /api/parcelles/{self.test_parcel_ref}",
            "GET",
            f"parcelles/{self.test_parcel_ref}",
            200,
            return_data=True
        )
        if success:
            parcelle = response.get('parcelle', {})
            signals = response.get('signals', [])
            conv_log = response.get('convergence_log', {})
            self.log(f"   Parcelle: {parcelle.get('commune_nom')} - Score: {parcelle.get('conviction_score')}%", "INFO")
            self.log(f"   Signals: {len(signals)}", "INFO")
            self.log(f"   Convergence log steps: {len(conv_log.get('steps', []))}", "INFO")
        return success

    def test_signals(self):
        """Test /api/signals"""
        self.log("=" * 60, "INFO")
        self.log("TESTING SIGNALS & OPPORTUNITIES ENDPOINTS", "INFO")
        self.log("=" * 60, "INFO")
        
        success, response = self.run_test(
            "GET /api/signals",
            "GET",
            "signals",
            200,
            params={"min_conviction": 40, "limit": 20},
            return_data=True
        )
        if success:
            signals = response.get('signals', [])
            self.log(f"   Signals: {len(signals)}", "INFO")
        return success

    def test_opportunities(self):
        """Test /api/opportunities"""
        success, response = self.run_test(
            "GET /api/opportunities",
            "GET",
            "opportunities",
            200,
            params={"limit": 20},
            return_data=True
        )
        if success:
            opps = response.get('opportunities', [])
            self.log(f"   Opportunities: {len(opps)}", "INFO")
        return success

    def test_pipeline(self):
        """Test /api/pipeline (GET, POST, PATCH, DELETE)"""
        self.log("=" * 60, "INFO")
        self.log("TESTING PIPELINE ENDPOINTS", "INFO")
        self.log("=" * 60, "INFO")
        
        # GET pipeline
        success, response = self.run_test(
            "GET /api/pipeline",
            "GET",
            "pipeline",
            200,
            return_data=True
        )
        if not success:
            return False
        
        initial_count = len(response.get('pipeline', []))
        self.log(f"   Initial pipeline items: {initial_count}", "INFO")
        
        # POST - Add to pipeline
        if not self.test_parcel_ref:
            self.log("⚠️  No parcel ref available, skipping pipeline POST test", "WARN")
            return True
        
        success, response = self.run_test(
            "POST /api/pipeline",
            "POST",
            "pipeline",
            200,
            data={"ref_cadastrale": self.test_parcel_ref},
            return_data=True
        )
        if not success:
            return False
        
        pipeline_item_id = response.get('id')
        self.log(f"   Added to pipeline: {pipeline_item_id}", "INFO")
        
        # PATCH - Update status
        if pipeline_item_id:
            success, _ = self.run_test(
                "PATCH /api/pipeline/{id}",
                "PATCH",
                f"pipeline/{pipeline_item_id}",
                200,
                data={"status": "qualified"}
            )
            if not success:
                return False
        
        # DELETE - Remove from pipeline
        if pipeline_item_id:
            success, _ = self.run_test(
                "DELETE /api/pipeline/{id}",
                "DELETE",
                f"pipeline/{pipeline_item_id}",
                200
            )
            if not success:
                return False
        
        return True

    def test_market(self):
        """Test /api/market"""
        self.log("=" * 60, "INFO")
        self.log("TESTING MARKET ENDPOINTS", "INFO")
        self.log("=" * 60, "INFO")
        
        success, response = self.run_test(
            "GET /api/market",
            "GET",
            "market",
            200,
            return_data=True
        )
        if success:
            communes = response.get('communes', [])
            levels = response.get('conviction_levels', {})
            breakdown = response.get('signal_breakdown', [])
            self.log(f"   Communes: {len(communes)}", "INFO")
            self.log(f"   Conviction levels: {levels}", "INFO")
            self.log(f"   Signal breakdown: {len(breakdown)} types", "INFO")
        return success

    def test_search(self):
        """Test /api/search"""
        self.log("=" * 60, "INFO")
        self.log("TESTING SEARCH ENDPOINT", "INFO")
        self.log("=" * 60, "INFO")
        
        success, response = self.run_test(
            "GET /api/search?q=Lyon",
            "GET",
            "search",
            200,
            params={"q": "Lyon"},
            return_data=True
        )
        if success:
            results = response.get('results', [])
            self.log(f"   Search results: {len(results)}", "INFO")
        return success

    def test_communes(self):
        """Test /api/communes"""
        self.log("=" * 60, "INFO")
        self.log("TESTING SETTINGS/INGESTION ENDPOINTS", "INFO")
        self.log("=" * 60, "INFO")
        
        success, response = self.run_test(
            "GET /api/communes",
            "GET",
            "communes",
            200,
            return_data=True
        )
        if success:
            communes = response.get('communes', [])
            self.log(f"   Communes: {len(communes)}", "INFO")
        return success

    def test_ingest_status(self):
        """Test /api/ingest/status"""
        success, response = self.run_test(
            "GET /api/ingest/status",
            "GET",
            "ingest/status",
            200,
            return_data=True
        )
        if success:
            self.log(f"   Total parcelles: {response.get('total_parcelles')}", "INFO")
            self.log(f"   Communes ingested: {response.get('communes_ingested')}", "INFO")
            self.log(f"   Running: {response.get('running')}", "INFO")
        return success

    def test_ingest_runs(self):
        """Test /api/ingest/runs"""
        success, response = self.run_test(
            "GET /api/ingest/runs",
            "GET",
            "ingest/runs",
            200,
            return_data=True
        )
        if success:
            runs = response.get('runs', [])
            self.log(f"   Ingestion runs: {len(runs)}", "INFO")
        return success

    def test_ai_interpret(self):
        """Test /api/ai/interpret (ONLY ONE CALL to save credits)"""
        self.log("=" * 60, "INFO")
        self.log("TESTING AI ENDPOINTS (LIMITED TO 1 CALL)", "INFO")
        self.log("=" * 60, "INFO")
        
        if not self.test_parcel_ref:
            self.log("⚠️  No parcel ref available, skipping AI test", "WARN")
            return True
        
        self.log("⚠️  Testing AI interpret (this consumes LLM credits)", "WARN")
        success, response = self.run_test(
            "POST /api/ai/interpret",
            "POST",
            "ai/interpret",
            200,
            data={"ref_cadastrale": self.test_parcel_ref},
            return_data=True
        )
        if success:
            interpretation = response.get('interpretation', '')
            self.log(f"   AI interpretation length: {len(interpretation)} chars", "INFO")
            self.log(f"   Preview: {interpretation[:100]}...", "INFO")
        return success

    def print_summary(self):
        """Print test summary"""
        self.log("=" * 60, "INFO")
        self.log("TEST SUMMARY", "INFO")
        self.log("=" * 60, "INFO")
        self.log(f"Total tests run: {self.tests_run}", "INFO")
        self.log(f"Tests passed: {self.tests_passed} ✅", "INFO")
        self.log(f"Tests failed: {self.tests_failed} ❌", "INFO")
        
        if self.failed_tests:
            self.log("", "INFO")
            self.log("FAILED TESTS:", "ERROR")
            for failed in self.failed_tests:
                self.log(f"  - {failed}", "ERROR")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log("", "INFO")
        self.log(f"Success rate: {success_rate:.1f}%", "INFO")
        self.log("=" * 60, "INFO")
        
        return self.tests_failed == 0

def main():
    """Run all backend tests"""
    print("\n" + "=" * 60)
    print("reipila Backend API Testing")
    print("Demo credentials: demo@reipila.com / demo1234")
    print("=" * 60 + "\n")
    
    tester = ReipilaAPITester()
    
    # Auth tests
    if not tester.test_auth_login():
        print("\n❌ Login failed, cannot continue with authenticated tests")
        return 1
    
    if not tester.test_auth_me():
        print("\n❌ Auth verification failed")
        return 1
    
    # Stats & Feed
    tester.test_stats_overview()
    tester.test_feed()
    
    # Map & Parcelles
    tester.test_map_parcelles()
    tester.test_parcelle_detail()
    
    # Signals & Opportunities
    tester.test_signals()
    tester.test_opportunities()
    
    # Pipeline
    tester.test_pipeline()
    
    # Market
    tester.test_market()
    
    # Search
    tester.test_search()
    
    # Settings/Ingestion
    tester.test_communes()
    tester.test_ingest_status()
    tester.test_ingest_runs()
    
    # AI (only ONE call)
    tester.test_ai_interpret()
    
    # Print summary
    success = tester.print_summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
