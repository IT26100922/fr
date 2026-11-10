"""Fixed local build/check/preview tasks. Run from the repository root.

No publishing, Git mutation, database deletion, or arbitrary shell execution.
QA tasks use only the separate friendfinder_redesign_qa database on port 55439.
"""
import argparse
import os
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT)
OUT=ROOT/'test-results'
OUT.mkdir(exist_ok=True)
PG=Path('C:/Program Files/PostgreSQL/18/bin')
DB='friendfinder_redesign_qa'
BASE='http://127.0.0.1:18092'
env=dict(os.environ,FF_TEST_BASE=BASE,FF_DB_URL=f'jdbc:postgresql://127.0.0.1:55439/{DB}',FF_DB_USER='postgres',FF_DB_PASSWORD='',FF_SERVER_PORT='18092',FF_MEDIA_PATH=str(OUT/'redesign-media'))

def run(args,log=None):
    if log:
        with (OUT/log).open('w',encoding='utf-8') as f:
            result=subprocess.run(args,env=env,stdout=f,stderr=subprocess.STDOUT)
        print((OUT/log).read_text(encoding='utf-8',errors='replace'))
    else:result=subprocess.run(args,env=env)
    if result.returncode:raise SystemExit(result.returncode)

def build(tests=False):
    sources=[str(p) for p in (ROOT/'backend/src').rglob('*.java')]
    if tests:sources += [str(p) for p in (ROOT/'backend/test').rglob('*.java')]
    run(['javac','--release','21','-encoding','UTF-8','-d','backend/build',*sources])
    print('PASS: Java compilation')

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('task',choices=['build','domain','syntax','restart','public','member','community-browser','message-browser','photo-browser','api','audit','smoke','unit','uploads','browser','migration','status','assets','docs','review','preview'])
args=parser.parse_args()
if args.task=='build':build()
elif args.task=='preview':run(['python','tools/preview.py'],'redesign-preview.log')
elif args.task=='assets':run(['python','tests/assets.py'],'redesign-assets.log')
elif args.task=='docs':run(['python','tests/documentation.py'],'redesign-docs.log')
elif args.task=='review':
    run(['git','diff','--check'])
    run(['git','status','--short'])
    run(['git','diff','--stat'])
elif args.task=='domain':
    build(True)
    run(['java','-cp','backend/build','com.friendfinder.DomainTest'],'redesign-domain.log')
    if (ROOT/'backend/test/com/friendfinder/PhotoTest.java').exists():run(['java','-cp','backend/build','com.friendfinder.PhotoTest'],'redesign-photo-domain.log')
elif args.task=='syntax':
    for p in (ROOT/'frontend/assets/js').glob('*.js'):run(['node','--check',str(p)])
    print('PASS: frontend JavaScript syntax')
elif args.task=='restart':
    pidfile=OUT/'redesign-server-18092.pid'
    # Validate the listener's Java main class; never stop another application.
    script="$listeners=Get-NetTCPConnection -State Listen -LocalPort 18092 -ErrorAction SilentlyContinue; foreach($listener in $listeners){$process=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$listener.OwningProcess); if($process.Name -ne 'java.exe' -or $process.CommandLine -notlike '*com.friendfinder.Main*'){throw 'QA port belongs to another application'}; Stop-Process -Id $listener.OwningProcess -Force -ErrorAction Stop}; exit 0"
    run(['C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe','-NoProfile','-Command',script])
    import socket,time
    for _ in range(50):
        with socket.socket() as connection:
            if connection.connect_ex(('127.0.0.1',18092))!=0:break
        time.sleep(.1)
    log=(OUT/'redesign-server-18092.log').open('w')
    p=subprocess.Popen(['java','-cp','backend/build;backend/lib/*','com.friendfinder.Main'],env=env,stdout=log,stderr=subprocess.STDOUT)
    pidfile.write_text(str(p.pid))
    import urllib.request
    for _ in range(100):
        if p.poll() is not None:raise RuntimeError('QA startup failed; inspect redesign-server-18092.log')
        try:urllib.request.urlopen(BASE+'/api/health',timeout=2).read();break
        except Exception:time.sleep(.1)
    else:raise RuntimeError('QA server did not become healthy')
    print('QA server healthy',p.pid,BASE)
elif args.task=='public':run(['node','tests/public-redesign.mjs'],'redesign-public-browser.log')
elif args.task=='member':run(['node','tests/member-discovery.mjs'],'redesign-member-browser.log')
elif args.task=='community-browser':
    run(['node','tests/communities-redesign.mjs'],'redesign-community-browser.log')
elif args.task=='message-browser':run(['node','tests/messaging-redesign.mjs'],'redesign-message-browser.log')
elif args.task=='photo-browser':run(['node','tests/photo-profile.mjs'],'redesign-photo-browser.log')
elif args.task=='api':run(['python','tests/integration.py','--base',BASE],'redesign-api.log')
elif args.task=='audit':run(['python','tests/schema_audit.py','--psql',str(PG/'psql.exe'),'--port','55439','--database',DB],'redesign-audit.log')
elif args.task=='smoke':run(['python','tests/http_smoke.py','--base',BASE],'redesign-smoke.log')
elif args.task=='unit':run(['node','tests/discovery.mjs'],'redesign-filter-unit.log')
elif args.task=='uploads':run(['python','tests/photo_uploads.py','--base',BASE],'redesign-photo-api.log')
elif args.task=='browser':run(['node','tests/authenticated-redesign.mjs'],'redesign-auth-browser.log')
elif args.task=='migration':run([str(PG/'psql.exe'),'-X','-q','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','55439','-U','postgres','-d',DB,'-f','database/migrations/001_profile_photos.sql'],'redesign-migration.log')
elif args.task=='status':
    for p in sorted(OUT.glob('redesign*.log')):
        print('\n'+p.name)
        print('\n'.join(p.read_text(encoding='utf-8',errors='replace').splitlines()[-4:]))
