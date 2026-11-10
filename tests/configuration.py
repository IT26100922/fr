"""Verify database environment precedence in isolated JVMs; no database required."""
import os
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
probe = '''import com.friendfinder.util.Config;
public class ConfigProbe {
    public static void main(String[] args) {
        for (int i = 0; i < args.length; i += 2) {
            if (!Config.get(args[i], "fallback").equals(args[i + 1]))
                throw new AssertionError("Configuration precedence failed for " + args[i]);
        }
    }
}'''
with tempfile.TemporaryDirectory(prefix='friendfinder-config-') as directory:
    work = Path(directory)
    (work / 'ConfigProbe.java').write_text(probe, encoding='utf-8')
    subprocess.run(['javac', '--release', '21', '-d', directory,
                    str(root / 'backend/src/com/friendfinder/util/Config.java'),
                    str(work / 'ConfigProbe.java')], check=True)
    clean = {k: v for k, v in os.environ.items() if not k.startswith(('DB_', 'FF_'))}
    def check(extra, expected):
        arguments = [item for pair in expected.items() for item in pair]
        subprocess.run(['java', '-cp', directory, 'ConfigProbe', *arguments],
                       cwd=directory, env={**clean, **extra}, check=True)
    check({}, {'db.url': 'fallback', 'db.user': 'fallback', 'db.password': 'fallback'})
    (work / 'config.local.properties').write_text(
        'db.url=file-url\ndb.user=file-user\ndb.password=file-password\nserver.port=8080\n')
    check({}, {'db.url': 'file-url', 'db.user': 'file-user', 'db.password': 'file-password'})
    check({'FF_DB_URL': 'legacy-url', 'FF_DB_USER': 'legacy-user', 'FF_DB_PASSWORD': 'legacy-password'},
          {'db.url': 'legacy-url', 'db.user': 'legacy-user', 'db.password': 'legacy-password'})
    check({'DB_URL': 'primary-url', 'DB_USER': 'primary-user', 'DB_PASSWORD': 'primary-password',
           'FF_DB_URL': 'legacy-url', 'FF_DB_USER': 'legacy-user', 'FF_DB_PASSWORD': 'legacy-password'},
          {'db.url': 'primary-url', 'db.user': 'primary-user', 'db.password': 'primary-password'})
    check({'DB_PASSWORD': '', 'FF_DB_PASSWORD': 'legacy-password'}, {'db.password': ''})
    check({'FF_SERVER_PORT': '18094'}, {'server.port': '18094'})
print('PASS: six configuration scenarios (fallback, file, legacy, standard precedence, empty password, server override)')
