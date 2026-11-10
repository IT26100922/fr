"""Apply the additive migration and run the existing local demo."""
import os
from pathlib import Path
import subprocess
import time
import urllib.request
root=Path(__file__).resolve().parents[1]
os.chdir(root)
out=root/'test-results'
subprocess.run(['C:/Program Files/PostgreSQL/18/bin/psql.exe','-X','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','55439','-U','postgres','-d','friendfinder_demo','-f','database/migrations/001_profile_photos.sql'],check=True)
script="$listeners=Get-NetTCPConnection -State Listen -LocalPort 8081 -ErrorAction SilentlyContinue; foreach($listener in $listeners){$process=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$listener.OwningProcess); if($process.Name -ne 'java.exe' -or $process.CommandLine -notlike '*com.friendfinder.Main*'){throw 'Preview port belongs to another application'}; Stop-Process -Id $listener.OwningProcess -Force -ErrorAction Stop}; exit 0"
subprocess.run(['C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe','-NoProfile','-Command',script],check=True)
env={k:v for k,v in os.environ.items() if not k.startswith('FF_')}
env.update(FF_DB_URL='jdbc:postgresql://127.0.0.1:55439/friendfinder_demo',FF_DB_USER='postgres',FF_DB_PASSWORD='',FF_SERVER_PORT='8081',FF_MEDIA_PATH=str(root/'media/profile-photos'))
with (out/'friendfinder-web.log').open('w') as log:
    p=subprocess.Popen(['java','-cp','backend/build;backend/lib/*','com.friendfinder.Main'],env=env,stdout=log,stderr=subprocess.STDOUT)
(out/'friendfinder-web.pid').write_text(str(p.pid))
for _ in range(100):
    if p.poll() is not None:raise RuntimeError('Preview exited; inspect friendfinder-web.log')
    try:
        urllib.request.urlopen('http://127.0.0.1:8081/api/health',timeout=2).read()
        urllib.request.urlopen('http://127.0.0.1:8081/api/public/communities',timeout=2).read()
        print('PASS: existing demo upgraded; healthy preview at http://localhost:8081')
        break
    except OSError:time.sleep(.2)
else:raise RuntimeError('Preview did not become healthy')
