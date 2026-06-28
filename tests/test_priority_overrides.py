import os
import tempfile
import unittest
from unittest.mock import patch

import api


class PriorityOverrideTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.sqlite_path = os.path.join(self.temp_dir.name, "test.db")
        self.addCleanup(self.temp_dir.cleanup)
        self._original_sqlite_path = api.SQLITE_PATH
        api.SQLITE_PATH = self.sqlite_path
        api.ensure_sqlite()
        self.client = api.app.test_client()

    def tearDown(self):
        api.SQLITE_PATH = self._original_sqlite_path

    def test_set_and_get_priority_override(self):
        response = self.client.put(
            "/priority-override/FarmerA",
            json={"score": 88, "reason": "Follow-up visit"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["score"], 88)
        self.assertEqual(payload["reason"], "Follow-up visit")

        get_response = self.client.get("/priority-override/FarmerA")
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.get_json()["score"], 88)

    def test_clear_priority_override(self):
        self.client.put(
            "/priority-override/FarmerA",
            json={"score": 91, "reason": "Recovered"},
        )

        delete_response = self.client.delete("/priority-override/FarmerA")
        self.assertEqual(delete_response.status_code, 200)

        get_response = self.client.get("/priority-override/FarmerA")
        self.assertEqual(get_response.status_code, 200)
        self.assertIsNone(get_response.get_json())


if __name__ == "__main__":
    unittest.main()
