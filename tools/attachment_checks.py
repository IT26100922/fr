"""Attachment checks against a disposable database, never the configured student database.

Run setup once, then start, api, restart, persistence and browser in that order.
The database and private test uploads are retained for inspection.
"""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
PG = Path('C:/Program Files/PostgreSQL/18/bin')
DB = 'friendfinder_attachment_checks_20261107'
BASE = 'http://127.0.0.1:18093'
UPLOADS = OUT / 'attachment-uploads-20261107'
env = dict(os.environ, DB_URL=f'jdbc:postgresql://127.0.0.1:55439/{DB}',
           DB_USER='postgres', DB_PASSWORD='', FF_DB_URL=f'jdbc:postgresql://127.0.0.1:55439/{DB}',
           FF_DB_USER='postgres', FF_DB_PASSWORD='', FF_SERVER_PORT='18093',
           FF_MEDIA_PATH=str(OUT / 'attachment-profile-media'), FF_UPLOAD_PATH=str(UPLOADS),
           FF_UPLOAD_MAX_BYTES='5242880', FF_TEST_BASE=BASE)

def run(command, log):
    with (OUT / log).open('w', encoding='utf-8') as output:
        result = subprocess.run(command, env=env, stdout=output, stderr=subprocess.STDOUT)
    print((OUT / log).read_text(encoding='utf-8', errors='replace'))
    if result.returncode:
        raise SystemExit(result.returncode)

def psql(database, *arguments):
    return [str(PG / 'psql.exe'), '-X', '-h', '127.0.0.1', '-p', '55439',
            '-U', 'postgres', '-w', '-d', database, '-v', 'ON_ERROR_STOP=1', *arguments]

def stop():
    # Check process identity before stopping the dedicated QA listener.
    script = "$listeners=Get-NetTCPConnection -State Listen -LocalPort 18093 -ErrorAction SilentlyContinue; foreach($listener in $listeners){$p=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$listener.OwningProcess); if($p.Name -ne 'java.exe' -or $p.CommandLine -notlike '*com.friendfinder.Main*'){throw 'QA port belongs to another application'}; Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop}; exit 0"
    subprocess.run(['powershell.exe', '-NoProfile', '-Command', script], check=True)

def start():
    log = (OUT / 'attachment-server-18093.log').open('a')
    process = subprocess.Popen(['java', '-cp', 'backend/build;backend/lib/*', 'com.friendfinder.Main'],
                               env=env, stdout=log, stderr=subprocess.STDOUT,
                               creationflags=subprocess.CREATE_NO_WINDOW)
    log.close()
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError('QA startup failed; inspect attachment-server-18093.log')
        try:
            urllib.request.urlopen(BASE + '/api/health', timeout=2).read()
            print('PASS: dedicated attachment server healthy', BASE)
            return
        except OSError:
            time.sleep(.1)
    raise RuntimeError('QA server did not become healthy')

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('task', choices=['setup', 'start', 'stop', 'restart', 'api', 'persistence', 'browser-start', 'browser', 'regression'])
task = parser.parse_args().task
if task == 'setup':
    # CREATE DATABASE refuses an existing database; no reset or drop is performed.
    run(psql('postgres', '-c', f'CREATE DATABASE {DB}'), 'attachment-create-db.log')
    for file in ['schema.postgresql.sql', 'seed.postgresql.sql', 'migrations/001_profile_photos.sql', 'migrations/002_photo_attachments.sql']:
        run(psql(DB, '-f', 'database/' + file), 'attachment-setup-' + Path(file).stem + '.log')
elif task == 'start':
    start()
elif task == 'stop':
    stop()
elif task == 'restart':
    stop()
    start()
elif task in ('api', 'persistence'):
    run([sys.executable, 'tests/photo_attachments.py', '--base', BASE, '--database', DB,
         '--upload-root', str(UPLOADS), '--phase', 'restart' if task == 'persistence' else 'initial'],
        'attachment-persistence.log' if task == 'persistence' else 'attachment-api.log')
elif task == 'browser-start':
    chrome = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
    subprocess.Popen([str(chrome), '--headless=new', '--disable-gpu', '--no-first-run',
                      '--remote-debugging-port=9222', '--user-data-dir=' + str(OUT / 'chrome-attachments-20261107'),
                      'about:blank'], creationflags=subprocess.CREATE_NO_WINDOW)
    for _ in range(100):
        try:
            urllib.request.urlopen('http://127.0.0.1:9222/json/list', timeout=2).read()
            print('PASS: dedicated Chrome CDP ready')
            break
        except OSError:
            time.sleep(.1)
    else:
        raise RuntimeError('Dedicated Chrome did not become ready')
elif task == 'browser':
    run(['node', 'tests/attachment-ui.mjs'], 'attachment-browser.log')
elif task == 'regression':
    run([sys.executable, 'tests/integration.py', '--base', BASE], 'attachment-regression.log')
