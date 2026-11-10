"""Prepare SQL and check constraints in a disposable seeded PostgreSQL database.

Usage: python tests/schema_audit.py --psql /path/psql --port 5432 --user postgres
Use PGPASSFILE or PGPASSWORD for authentication. No JDBC driver is required.
Run integration.py separately to verify JDBC/API behavior.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--psql', default='psql')
parser.add_argument('--host', default='127.0.0.1')
parser.add_argument('--port', default='5432')
parser.add_argument('--user', default='postgres')
parser.add_argument('--database', default='it_friend_finder')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
statements = set()
columns = re.search(r'PUBLIC_COLUMNS = "([^"]+)"',
                    (root / 'backend/src/com/friendfinder/dao/UserDAO.java').read_text()).group(1)
for path in (root / 'backend/src').rglob('*.java'):
    text = path.read_text(encoding='utf-8').replace('"SELECT " + PUBLIC_COLUMNS + "', '"SELECT ' + columns)
    for value in re.findall(r'"((?:[^"\\]|\\.)*)"', text):
        if re.match(r'^(SELECT|INSERT|UPDATE|DELETE)\s', value):
            value = json.loads('"' + value + '"')
            counter = iter(range(1, value.count('?') + 1))
            value = re.sub(r'\?', lambda _: '$' + str(next(counter)), value)
            # JDBC binds pair IDs as longs; untyped PREPARE otherwise infers text
            # for LEAST/GREATEST before considering the surrounding comparison.
            value = re.sub(r'(LEAST|GREATEST)\(([^)]+)\)',
                           lambda m: m[1] + '(' + re.sub(r'\$\d+', lambda p: p[0] + '::bigint', m[2]) + ')', value)
            statements.add(value)

sql = []
for index, statement in enumerate(sorted(statements)):
    # PREPARE parses and validates table/column names without modifying rows.
    sql += [f'PREPARE audit_{index} AS {statement};', f'DEALLOCATE audit_{index};']
command = [args.psql, '-X', '-w', '--host', args.host, '--port', args.port,
           '--username', args.user, '--dbname', args.database,
           '--set=ON_ERROR_STOP=1', '--set=VERBOSITY=verbose', '-At']
result = subprocess.run(command, input='\n'.join(sql), text=True, capture_output=True)
assert result.returncode == 0, result.stderr
print(f'PASS: {len(statements)} SQL statements prepared by PostgreSQL')

# Missing fixtures must not masquerade as successful constraint checks.
fixtures = """SELECT (SELECT COUNT(*) FROM users WHERE id IN (1,2,4,5,6))=5 AND
EXISTS(SELECT 1 FROM friend_requests WHERE sender_id=4 AND receiver_id=5) AND
EXISTS(SELECT 1 FROM community_members WHERE user_id=2 AND community_id=1) AND
EXISTS(SELECT 1 FROM conversations WHERE id=1) AND
NOT EXISTS(SELECT 1 FROM conversation_members WHERE conversation_id=1 AND user_id=6);"""
result = subprocess.run(command, input=fixtures, text=True, capture_output=True)
assert result.returncode == 0 and result.stdout.strip() == 't', result.stderr or 'Seed fixture preconditions failed'

def rejects(statement, sqlstate, label):
    result = subprocess.run(command, input='BEGIN; ' + statement + '; ROLLBACK;', text=True, capture_output=True)
    assert result.returncode != 0 and f'ERROR:  {sqlstate}:' in result.stderr, label + ': ' + result.stderr
    print('PASS:', label)

rejects("INSERT INTO friend_requests(sender_id,receiver_id) VALUES(4,4)", '23514', 'Database rejects self friendship')
rejects("INSERT INTO friend_requests(sender_id,receiver_id) VALUES(5,4)", '23505', 'Database rejects reverse duplicate friendship')
rejects("INSERT INTO community_members(user_id,community_id) VALUES(2,1)", '23505', 'Database rejects duplicate membership')
rejects("INSERT INTO user_interests(user_id,interest_id,rating) VALUES(1,1,6)", '23514', 'Database rejects invalid interest rating')
rejects("INSERT INTO messages(conversation_id,sender_id,body) VALUES(1,6,'Unauthorized')", '23503', 'Database rejects sender outside conversation')
rejects("INSERT INTO conversations(type,name,creator_id,private_low,private_high) VALUES('PRIVATE','',4,NULL,NULL)", '23514', 'Database rejects malformed private conversation')
