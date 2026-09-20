import requests
import time

time.sleep(2)
try:
    res = requests.get('http://127.0.0.1:8000/')
    print('Server Status:', res.status_code, res.json())
except Exception as e:
    print('Server not running:', e)
