"""Build flat, per-member study folders and verified ZIPs from the presentation plan."""
from pathlib import Path
import hashlib
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'presentation-packages'
BASE = 'backend/src/com/friendfinder/'
PLAN = ROOT / 'BACKEND_SIX_MEMBER_PRESENTATION.md'
shared = ['Main.java', 'controller/ApiController.java', 'util/Config.java',
          'util/DatabaseConnection.java', 'dao/Jdbc.java', 'util/Input.java',
          'util/Json.java', 'util/ApiException.java']
parts = [
    ('Backend_Introduction_and_Friendships',
     ['controller/StaticController.java', 'model/FriendRequest.java',
      'service/FriendService.java', 'dao/FriendDAO.java'],
     ['friend_requests'], ['users'],
     'ApiController.java: handle(), route(), and the GET/POST /api/friends routes. '
     'Start with Main.java and StaticController.java, then trace FriendService -> FriendDAO -> friend_requests.'),
    ('Communities_and_Administration',
     ['model/Community.java', 'model/CommunityMembership.java', 'model/CommunityLeader.java',
      'service/CommunityService.java', 'dao/CommunityDAO.java', 'service/AdminService.java'],
     ['communities', 'community_members'], ['users', 'interests', 'activity_logs'],
     'ApiController.java: /api/public/communities, /api/communities, /api/communities/members, '
     '/api/communities/join, /api/communities/leave, and /api/admin/communities routes. '
     'AdminService.java: community() and assign(); suspend() belongs to Member 5.'),
    ('Posts_Comments_Moderation_and_Reports',
     ['model/Post.java', 'model/Comment.java', 'interfacepkg/Approvable.java',
      'service/PostService.java', 'dao/PostDAO.java', 'model/ActivityLog.java',
      'dao/ActivityDAO.java', 'service/ReportService.java', 'report/DailyReport.java',
      'interfacepkg/Reportable.java'],
     ['posts', 'comments', 'activity_logs'], ['communities', 'community_members', 'users'],
     'ApiController.java: /api/posts (including mine, pending, approve, reject), /api/comments, '
     '/api/admin/dashboard, /api/admin/report, and /api/admin/activity. '
     'Explain photo moderation at overview level; Member 6 covers photo storage.'),
    ('Questionnaire_and_Matching',
     ['model/QuestionnaireResponse.java', 'service/ProfileService.java',
      'service/MatchingService.java', 'dao/UserDAO.java'],
     ['questionnaire_responses', 'user_interests', 'user_goals', 'interests'],
     ['users', 'friend_requests', 'communities', 'activity_logs'],
     'ApiController.java: /api/interests, /api/questionnaire, /api/matches, '
     'and /api/communities/recommended. ProfileService.java: questionnaire(). '
     'UserDAO.java: interests(), questionnaire(), saveQuestionnaire(), and candidates(). '
     'ProfileService.edit() and the account methods in UserDAO belong to Member 5.'),
    ('Authentication_Profiles_and_Accounts',
     ['service/AuthService.java', 'util/Passwords.java', 'model/User.java', 'model/Member.java',
      'model/Admin.java', 'model/CommunityLeader.java', 'dao/UserDAO.java',
      'service/ProfileService.java', 'service/AdminService.java'],
     ['users'], ['activity_logs', 'questionnaire_responses', 'user_interests', 'user_goals', 'interests'],
     'ApiController.java: register/login/logout, handle() session checks, cookie(), setCookie(), '
     '/api/users/me, /api/users/profile, /api/admin/users, and suspend/reactivate routes. '
     'ProfileService.java: edit(). AdminService.java: suspend(). '
     'UserDAO.java: find(), credentials(), create(), model(), searchUsers(), updateProfile(), suspend(). '
     'Explain photo URLs briefly; Member 6 covers photo processing.'),
    ('Messaging_Photos_and_File_Access',
     ['model/Conversation.java', 'model/PrivateConversation.java', 'model/GroupConversation.java',
      'model/Message.java', 'service/MessageService.java', 'dao/MessageDAO.java',
      'controller/PhotoController.java', 'service/PhotoService.java', 'dao/PhotoDAO.java',
      'model/ProfilePhoto.java', 'util/PhotoProcessor.java', 'controller/AttachmentController.java',
      'service/AttachmentService.java', 'dao/AttachmentDAO.java', 'model/PhotoAttachment.java',
      'util/MultipartUpload.java', 'util/AttachmentPhotoProcessor.java'],
     ['conversations', 'conversation_members', 'messages', 'profile_photos', 'photo_attachments'],
     ['users', 'friend_requests', 'posts', 'communities', 'community_members', 'activity_logs'],
     'ApiController.java: /api/conversations, /api/conversations/private, /api/conversations/group, '
     'and /api/messages. PhotoController.java and AttachmentController.java: upload/download handling '
     'and access checks. Main.java: registration of their handlers.'),
]


def build():
    OUT.mkdir(exist_ok=True)
    plan = PLAN.read_text(encoding='utf-8')
    schema = (ROOT / 'database/schema.postgresql.sql').read_text(encoding='utf-8')
    migrations = sorted((ROOT / 'database/migrations').glob('*.sql'))
    all_sql = schema + '\n' + '\n'.join(p.read_text(encoding='utf-8') for p in migrations)
    sections = re.split(r'(?m)^## Member \d+[^\n]*\n', plan)[1:]
    assert len(sections) == 6
    index = ['# Member presentation packages', '',
             'Each ZIP contains one flat study folder. Start with START_HERE.md.', '',
             'These are presentation study copies of the current working files, not runnable projects.', '']
    for number, (title, own, main_tables, supporting, focus) in enumerate(parts, 1):
        name = f'Member_{number}_{title}'
        folder = OUT / name
        folder.mkdir(exist_ok=True)
        sources = list(dict.fromkeys(BASE + p for p in own + shared))
        # Include ancestor classes needed for Member 2's inheritance example.
        if number == 2:
            sources += [BASE + 'model/User.java', BASE + 'model/Member.java']
        sources += ['database/schema.postgresql.sql']
        sources += [p.relative_to(ROOT).as_posix() for p in migrations]
        sources += ['BACKEND_SIX_MEMBER_PRESENTATION.md']
        assert len({Path(p).name for p in sources}) == len(sources), 'Flat filename collision'
        manifest = ['# Original file locations', '', '| File in this folder | Original location |', '|---|---|']
        for source in sources:
            path = ROOT / source
            assert path.is_file(), source
            shutil.copyfile(path, folder / path.name)
            manifest.append(f'| {path.name} | `{source}` |')
        (folder / 'FILE_ORIGINS.md').write_text('\n'.join(manifest) + '\n', encoding='utf-8')
        section = sections[number - 1].split('## Shared Knowledge for Every Member')[0].strip()
        (folder / 'MY_PRESENTATION_PART.md').write_text(
            f'# Member {number}: {title.replace("_", " ")}\n\n' + section + '\n', encoding='utf-8')
        excerpts = ['-- STUDY EXCERPTS ONLY: not a standalone database setup script.',
                    '-- Use schema.postgresql.sql then migrations 001 and 002 for full setup.',
                    '-- Queries with ? placeholders are in your DAO Java files (JDBC prepared statements).', '']
        enums = re.findall(r'^CREATE TYPE [^;]+;', schema, re.M)
        excerpts += ['-- Enum definitions (shared reference)', *enums, '']
        for category, tables in [('MAIN TABLES TO EXPLAIN', main_tables), ('SUPPORTING TABLES FOR CONTEXT', supporting)]:
            excerpts.append('-- ' + category)
            for table in tables:
                match = re.search(r'CREATE TABLE (?:IF NOT EXISTS )?' + re.escape(table) + r'\s*\([\s\S]*?\n\);', all_sql)
                assert match, table
                excerpts.extend([f'-- Table: {table}', match.group(), ''])
        if number == 4:
            trigger = re.search(r'CREATE OR REPLACE FUNCTION update_questionnaire_timestamp\(\)[\s\S]*?EXECUTE FUNCTION update_questionnaire_timestamp\(\);', schema)
            assert trigger
            excerpts.extend(['-- Questionnaire timestamp maintenance', trigger.group(), ''])
        (folder / 'MY_SQL_PART.sql').write_text('\n'.join(excerpts) + '\n', encoding='utf-8')
        primary = '\n'.join('- ' + Path(p).name for p in own)
        guide = f'''# Member {number}: {title.replace('_', ' ')}

All your study files are together in this folder. Java and original SQL files are unchanged copies.
This is a study pack, not a standalone runnable Java project; use the original project to run demonstrations.

## Start here

1. Read MY_PRESENTATION_PART.md for your explanation, OOP example, and demonstration.
2. Study your main files listed below.
3. Use the focus notes to find your part in files shared with other members.
4. Read MY_SQL_PART.sql for your main tables and supporting relationships; show the actual SELECT/INSERT/UPDATE/DELETE queries in your DAO files.
5. Explain purpose -> files -> request flow -> database -> rules -> OOP -> demonstration, including one rejected action.

## Your main files

{primary}

## Focus within shared files

{focus}

## Shared overview files

{', '.join(Path(p).name for p in shared)}.

Understand these at overview level and explain their use in your feature. Full shared files are included because several members explain different sections of the same file. FILE_ORIGINS.md records the original package paths.

## Database focus

Main tables: {', '.join(main_tables)}.
Supporting tables: {', '.join(supporting)}.

MY_SQL_PART.sql contains selected definitions for study, not a runnable setup script. The complete schema and both migrations are also included for reference and foreign-key context; tables outside your focus do not become extra presentation assignments. For database setup, use the original project's instructions: base schema, then 001_profile_photos.sql, then 002_photo_attachments.sql.

BACKEND_SIX_MEMBER_PRESENTATION.md is the full team plan. Your assigned section is copied into MY_PRESENTATION_PART.md.
'''
        (folder / 'START_HERE.md').write_text(guide, encoding='utf-8')
        expected = {Path(p).name for p in sources} | {'FILE_ORIGINS.md', 'MY_PRESENTATION_PART.md', 'MY_SQL_PART.sql', 'START_HERE.md'}
        assert {p.name for p in folder.iterdir()} == expected
        archive = OUT / (name + '.zip')
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
            for path in sorted(folder.iterdir()):
                z.write(path, f'{name}/{path.name}')
        with zipfile.ZipFile(archive) as z:
            assert z.testzip() is None
            assert len(z.namelist()) == len(expected)
            for path in folder.iterdir():
                assert z.read(f'{name}/{path.name}') == path.read_bytes()
            for source in sources:
                assert hashlib.sha256(z.read(f'{name}/{Path(source).name}')).digest() == hashlib.sha256((ROOT / source).read_bytes()).digest()
        index.append(f'- [Member {number}: {title.replace("_", " ")}]({archive.name}) ({len(expected)} files)')
        print(f'Verified {archive.name}: {len(expected)} files, {archive.stat().st_size:,} bytes')
    (OUT / 'README.md').write_text('\n'.join(index) + '\n', encoding='utf-8')


if __name__ == '__main__':
    build()
