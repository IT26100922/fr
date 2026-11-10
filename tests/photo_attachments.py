"""Attachment workflows. Run ONLY against a separate, seeded test database.

Requires Pillow for JPEG/WebP test fixtures; it is not an application dependency.
Use --phase restart after restarting the same test server to check persistence.
"""
import argparse
import http.cookiejar
import io
import json
from pathlib import Path
import subprocess
import urllib.error
import urllib.request
import uuid
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:8092')
parser.add_argument('--database', default='friendfinder_attachment_checks_20261105')
parser.add_argument('--pg-bin', default='C:/Program Files/PostgreSQL/18/bin')
parser.add_argument('--upload-root', default='test-results/attachment-uploads')
parser.add_argument('--phase', choices=['initial', 'restart'], default='initial')
args = parser.parse_args()
assert args.database.startswith('friendfinder_attachment_checks_'), 'Use a disposable attachment test database'
checks = 0


def check(condition, label):
    global checks
    assert condition, label
    checks += 1
    print('PASS', label)


def sql(command):
    return subprocess.check_output([str(Path(args.pg_bin) / 'psql.exe'), '-h', '127.0.0.1', '-p', '55439', '-U', 'postgres', '-w', '-d', args.database, '-v', 'ON_ERROR_STOP=1', '-At', '-c', command], text=True).strip()


class Client:
    def __init__(self, username=None):
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        if username:
            self.request('/api/login', {'login': username, 'password': 'Demo123!'})

    def request(self, path, data=None, expected=200, content_type='application/json', headers=None):
        if isinstance(data, dict):
            data = json.dumps(data).encode()
        request = urllib.request.Request(args.base + path, data=data, headers={**({'Content-Type': content_type} if data is not None else {}), **(headers or {})})
        try:
            response = self.opener.open(request, timeout=40)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read()
        if response.code != expected:
            raise AssertionError(f'{path}: expected {expected}, got {response.code}: {body[:160]!r}')
        check(True, f'{path}: HTTP {expected}')
        if response.headers.get_content_type() == 'application/json':
            return json.loads(body)
        return body, response.headers

    def upload(self, path, fields, photos, expected=200, **kwargs):
        boundary = 'photo-' + uuid.uuid4().hex
        body = bytearray()
        for name, value in fields.items():
            body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
        for photo in photos:
            # Deliberately misleading name and MIME: actual bytes must decide the format.
            body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="photos"; filename="../../unsafe.html"\r\nContent-Type: text/html\r\n\r\n'.encode())
            body.extend(photo)
            body.extend(b'\r\n')
        body.extend(f'--{boundary}--\r\n'.encode())
        return self.request(path, bytes(body), expected, 'multipart/form-data; boundary=' + boundary, **kwargs)


def fixture(format, size=(80, 60)):
    output = io.BytesIO()
    Image.new('RGB', size, (63, 120, 180)).save(output, format=format)
    return output.getvalue()


a, b, outsider, leader, wrong_leader, admin, guest = [Client(name) for name in ('jason', 'nethmi', 'ravi', 'ai_leader', 'tech_leader', 'admin', None)]
state_path = Path('test-results/attachment-restart-state.json')
if args.phase == 'restart':
    state = json.loads(state_path.read_text())
    for url in state['urls']:
        pixels, headers = b.request(url)
        check(pixels.startswith(b'\x89PNG'), 'Attachment survives Java restart')
    print(f'PASS: {checks} restart checks')
    raise SystemExit

png, jpeg, webp = [fixture(format) for format in ('PNG', 'JPEG', 'WEBP')]
cid = a.request('/api/conversations/private', {'userId': 5})['id']
message_fields = {'conversationId': cid, 'body': ''}
post_fields = {'communityId': 1, 'title': '', 'body': ''}
text_id = a.request('/api/messages', {'conversationId': cid, 'body': 'Text-only attachment regression'})['id']
photo_id = a.upload('/api/messages/with-photo', message_fields, [png])['id']
caption_id = a.upload('/api/messages/with-photo', {**message_fields, 'body': 'A caption'}, [jpeg])['id']
webp_id = a.upload('/api/messages/with-photo', message_fields, [webp])['id']
messages = b.request('/api/messages?conversationId=' + str(cid))['messages']
check(any(m['id'] == text_id and m['body'] and not m['attachments'] for m in messages), 'Text-only messages unchanged')
check(any(m['id'] == caption_id and m['body'] == 'A caption' for m in messages), 'Caption persists')
urls = [m['attachments'][0]['url'] for m in messages if m['id'] in (photo_id, caption_id, webp_id)]
check(len(urls) == 3, 'PNG, JPEG and WebP messages persisted')
for url in urls:
    body, headers = b.request(url)
    check(body.startswith(b'\x89PNG\r\n\x1a\n'), 'Recipient receives safe normalized PNG')
    check(headers.get_content_type() == 'image/png' and headers['X-Content-Type-Options'] == 'nosniff' and headers['Cache-Control'] == 'no-store', 'Safe image response headers')
    check(headers['Content-Disposition'].startswith('inline; filename=photo-'), 'Generated download name')
    outsider.request(url, expected=403)
    guest.request(url, expected=401)
    admin.request(url, expected=403)

text_post = a.request('/api/posts', {'communityId': 1, 'title': 'Text post regression', 'body': 'Text only'})['id']
leader.request('/api/posts/approve', {'postId': text_post})
pid = a.upload('/api/posts/with-photos', post_fields, [png, jpeg, webp, png])['id']
mine = a.request('/api/posts/mine?communityId=1')
post = next(p for p in mine if p['id'] == pid)
check(post['status'] == 'PENDING' and len(post['attachments']) == 4, 'Photo-only post starts pending with four photos')
pending_urls = [photo['url'] for photo in post['attachments']]
for url in pending_urls:
    a.request(url)
    leader.request(url)
    b.request(url, expected=403)
    outsider.request(url, expected=403)
    wrong_leader.request(url, expected=403)
    guest.request(url, expected=401)
check(not any(p['id'] == pid for p in b.request('/api/posts')), 'Pending photo post absent from approved feed')
wrong_leader.request('/api/posts/approve', {'postId': pid}, 403)
leader.request('/api/posts/approve', {'postId': pid})
approved = next(p for p in b.request('/api/posts') if p['id'] == pid)
check(len(approved['attachments']) == 4, 'Approved feed contains all photo metadata')
for url in pending_urls:
    b.request(url)
    outsider.request(url)
urls.extend(pending_urls)
caption_post = a.upload('/api/posts/with-photos', {**post_fields, 'title': 'Project day', 'body': 'Team photo'}, [png])['id']
leader.request('/api/posts/reject', {'postId': caption_post})
rejected = next(p for p in a.request('/api/posts/mine') if p['id'] == caption_post)
a.request(rejected['attachments'][0]['url'])
b.request(rejected['attachments'][0]['url'], expected=403)
leader.request(rejected['attachments'][0]['url'], expected=403)
a.upload('/api/posts/with-photos', {**post_fields, 'communityId': 2}, [png], 403)
wrong_leader.upload('/api/messages/with-photo', message_fields, [png], 403)
group = a.request('/api/conversations/group', {'name': 'Text group unchanged', 'participants': [5]})['id']
a.request('/api/messages', {'conversationId': group, 'body': 'Group text'})
a.upload('/api/messages/with-photo', {**message_fields, 'conversationId': group}, [png], 403)

before_files = set(Path(args.upload_root).rglob('*.png'))
before_count = sql('SELECT count(*) FROM photo_attachments')
for source, status in [(b'', 400), (b'not an image', 415), (b'<svg/>', 415), (png[:24], 400), (jpeg[:-2], 400), (webp[:-2], 400), (b'x' * (5 * 1024 * 1024 + 1), 413), (fixture('PNG', (4097, 1)), 400)]:
    a.upload('/api/messages/with-photo', message_fields, [source], status)
corrupt = bytearray(png)
corrupt[29] ^= 1
a.upload('/api/messages/with-photo', message_fields, [bytes(corrupt)], 400)
a.upload('/api/messages/with-photo', message_fields, [png, png], 413 if len(png) > 3_000_000 else 400)
a.upload('/api/posts/with-photos', post_fields, [png] * 5, 400)
a.upload('/api/messages/with-photo', message_fields, [], 400)
a.upload('/api/messages/with-photo', {**message_fields, 'ownerId': 5}, [png], 400)
a.upload('/api/messages/with-photo', message_fields, [png], 403, headers={'Origin': 'https://unrelated.example'})
a.request('/api/messages/with-photo', b'broken', 400, 'multipart/form-data; boundary=broken')
a.request('/api/messages/with-photo', b'x' * (5 * 1024 * 1024 + 65537), 413, 'multipart/form-data; boundary=limit')
# No Content-Length: urllib sends the iterable body with chunked transfer encoding.
a.request('/api/messages/with-photo', iter([b'x' * (5 * 1024 * 1024 + 65537)]), 413, 'multipart/form-data; boundary=limit')
a.request('/api/messages', {'conversationId': cid, 'body': ''}, 400)
check(set(Path(args.upload_root).rglob('*.png')) == before_files and sql('SELECT count(*) FROM photo_attachments') == before_count, 'Invalid uploads leave no files or records')

# Fail after one valid image has been written; the service must remove that file.
a.upload('/api/posts/with-photos', post_fields, [png, b'not an image'], 415)
check(set(Path(args.upload_root).rglob('*.png')) == before_files, 'Partial multi-photo failure cleans up files')

# Fail the metadata INSERT after the message and files have been prepared.
sql("CREATE FUNCTION reject_attachment_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated attachment failure'; END $$; CREATE TRIGGER reject_attachment_test BEFORE INSERT ON photo_attachments FOR EACH ROW EXECUTE FUNCTION reject_attachment_test();")
message_count = sql('SELECT count(*) FROM messages')
try:
    a.upload('/api/messages/with-photo', message_fields, [png], 503)
finally:
    sql('DROP TRIGGER reject_attachment_test ON photo_attachments; DROP FUNCTION reject_attachment_test();')
check(sql('SELECT count(*) FROM messages') == message_count and sql('SELECT count(*) FROM photo_attachments') == before_count, 'Database failure rolls back message and metadata')
check(set(Path(args.upload_root).rglob('*.png')) == before_files, 'Database failure removes orphaned file')

# Simulate one missing file, then restore it without modifying the metadata.
attachment_id = int(urls[0].rsplit('/', 1)[1])
filename = sql(f'SELECT stored_filename FROM photo_attachments WHERE id={attachment_id}')
file = Path(args.upload_root) / 'messages' / filename
saved = file.read_bytes()
file.unlink()
try:
    b.request(urls[0], expected=404)
finally:
    file.write_bytes(saved)
b.request(urls[0])
guest.request('/data/uploads/messages/' + filename, expected=404)
a.request('/api/attachments/999999999', expected=404)
a.request('/api/attachments/../../config.local.properties', expected=404)

# Former friends cannot retrieve either the private history or its photos.
a.request('/api/friends/remove', {'userId': 5})
try:
    b.request(urls[0], expected=403)
    b.request('/api/messages?conversationId=' + str(cid), expected=403)
finally:
    rid = a.request('/api/friends/request', {'userId': 5})['id']
    b.request('/api/friends/accept', {'requestId': rid})
state_path.parent.mkdir(exist_ok=True)
state_path.write_text(json.dumps({'urls': urls, 'conversationId': cid}))
print(f'PASS: {checks} attachment HTTP/PostgreSQL checks')
