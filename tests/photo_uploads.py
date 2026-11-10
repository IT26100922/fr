"""Real authenticated upload/ownership/media tests against a disposable PostgreSQL database."""
import argparse
import http.cookiejar
import json
from pathlib import Path
import struct
import time
import urllib.error
import urllib.request
import zlib

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:8080')
base=parser.parse_args().base
checks=0
def check(value,label):
    global checks
    assert value,label
    checks+=1
    print('PASS',label)

class Client:
    def __init__(self):self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def request(self,path,data=None,expected=200,type='application/json',headers=None):
        if isinstance(data,dict):data=json.dumps(data).encode()
        request=urllib.request.Request(base+path,data=data,headers={**({'Content-Type':type} if data is not None else {}),**(headers or {})})
        try:response=self.opener.open(request,timeout=30)
        except urllib.error.HTTPError as e:response=e
        body=response.read()
        check(response.code==expected,f'{path}: expected {expected}, received {response.code}')
        if response.headers.get('Content-Type','').startswith('application/json'):return json.loads(body)
        return body,response.headers
    def register(self):
        name='photo_'+str(time.time_ns())[-13:]
        return self.request('/api/register',{'fullName':'Photo Test Member','username':name,'email':name+'@example.test','password':'Demo123!','confirmPassword':'Demo123!'},201)

png=Path('test-results/photo-valid.png').read_bytes()
jpeg=Path('test-results/photo-valid.jpg').read_bytes()
guest=Client();a=Client();b=Client();admin=Client()
aid=a.register()['user']['id'];bid=b.register()['user']['id']
guest.request('/api/photos',png,401,'image/png')
guest.request('/api/photos?userId='+str(aid),expected=401)
first=a.request('/api/photos',png,type='image/png',headers={'X-Filename':'../../do-not-create.html'})
url=first['photo_url']
check('file_key' not in first and 'path' not in first,'Storage paths are not returned')
me=a.request('/api/users/me');check(me['photo_url']==url,'Photo metadata persists on profile')
body,headers=b.request(url)
check(body.startswith(b'\x89PNG\r\n\x1a\n') and headers.get_content_type()=='image/png','Authorized member receives normalized PNG')
check(headers.get('X-Content-Type-Options')=='nosniff' and headers.get('Cache-Control')=='no-store','Media response security headers')
a.request('/api/photos',b'<svg><script>bad</script></svg>',415,'image/svg+xml')
a.request('/api/photos',b'not-an-image',400,'image/png')
a.request('/api/photos',png,400,'image/jpeg')
a.request('/api/photos',png[:20],400,'image/png')
a.request('/api/photos',b'x'*(2*1024*1024+1),413,'image/png')
b.request('/api/photos?userId='+str(aid),png,403,'image/png')
b.request('/api/photos/remove',{'userId':aid},403)
a.request('/api/photos',png,403,'image/png',{'Origin':'https://other.example'})
second=a.request('/api/photos',jpeg,type='image/jpeg')
check(second['photo_url']!=url,'Replacement creates a fresh version')
b.request(url,expected=404)
b.request(second['photo_url'])
check(a.request('/api/users/me')['photo_url']==second['photo_url'],'Replacement metadata is current')
guest.request('/media/profile-photos/do-not-create.html',expected=404)
b.request('/api/photos?userId=../../README.md',expected=400)
b.request('/api/photos/../../README.md',expected=404)
admin.request('/api/login',{'login':'admin','password':'Demo123!'})
admin.request('/api/photos',png,403,'image/png')
admin.request(second['photo_url'],expected=403)
admin.request('/api/admin/users/suspend',{'userId':aid})
a.request('/api/photos',png,403,'image/png')
b.request(second['photo_url'],expected=404)
admin.request('/api/admin/users/reactivate',{'userId':aid})
a.request('/api/photos/remove',{})
check(a.request('/api/users/me')['photo_url'] is None,'Removal restores avatar fallback')
b.request(second['photo_url'],expected=404)
a.request('/api/photos/remove',{},409)
a.request('/api/logout',{})
a.request('/api/photos',png,401,'image/png')
print(f'PASS: {checks} profile-photo HTTP/security checks')
