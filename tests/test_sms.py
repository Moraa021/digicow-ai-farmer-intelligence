import os
import unittest
from unittest.mock import patch

import api


class SendSmsTests(unittest.TestCase):
    def setUp(self):
        os.environ['AFRICASTAKING_API_KEY'] = 'test-api-key'
        os.environ['AFRICASTAKING_USERNAME'] = 'test-username'
        os.environ['AFRICASTAKING_URL'] = 'https://example.test/sms'
        self.client = api.app.test_client()

    def test_send_sms_includes_provider_api_key_header(self):
        class FakeResponse:
            status_code = 200
            text = '{"SMSMessageData":{"Message":"Sent to 1/1 Total Cost: KES 1.50"}}'

        with patch('api.requests.post', return_value=FakeResponse()) as mocked_post:
            response = self.client.post('/send-sms', json={
                'to': '+254700000000',
                'message': 'Hello farmer'
            })

        self.assertEqual(response.status_code, 200)
        mocked_post.assert_called_once()
        _, kwargs = mocked_post.call_args
        self.assertEqual(kwargs['headers']['apiKey'], 'test-api-key')
        self.assertEqual(kwargs['data']['username'], 'test-username')
        self.assertEqual(kwargs['data']['to'], '+254700000000')
        self.assertEqual(kwargs['data']['message'], 'Hello farmer')

    def test_send_sms_normalizes_kenyan_local_number(self):
        class FakeResponse:
            status_code = 200
            text = '{"SMSMessageData":{"Message":"Sent to 1/1 Total Cost: KES 1.50"}}'

        with patch('api.requests.post', return_value=FakeResponse()) as mocked_post:
            response = self.client.post('/send-sms', json={
                'to': '0700000000',
                'message': 'Hello farmer'
            })

        self.assertEqual(response.status_code, 200)
        _, kwargs = mocked_post.call_args
        self.assertEqual(kwargs['data']['to'], '+254700000000')


if __name__ == '__main__':
    unittest.main()
