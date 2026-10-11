#!/usr/bin/env python3
"""Authenticated loopback-only Markdown export. No external services or dependencies."""
import argparse
import base64
import hashlib
import html
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path
import re
import secrets
import tempfile
import time


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def atom(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.notmonk-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            stream.write(value)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def safe(value):
    value = re.sub(r'[\\/:*?"<>|\x00-\x1f]', '-', str(value)).strip(' .')
    return (value or 'Başlıksız')[:150]


def val(value):
    return json.dumps(value, ensure_ascii=False)


class Node:
    def __init__(self, tag='', attrs=None):
        self.tag, self.attrs, self.children = tag, dict(attrs or []), []


class Tree(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed(text)
        self.close()

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in {'br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr'}:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def plain(node):
    if isinstance(node, str):
        return node
    if node.tag == 'br':
        return '\n'
    return ''.join(plain(child) for child in node.children)


def markdown(text, image_writer=None):
    if not re.search(r'</?[a-zA-Z][^>]*>', text or ''):
        return text or ''

    def render(node, depth=0):
        if isinstance(node, str):
            return re.sub(r'\s+', ' ', node).replace('\\', '\\\\').replace('*', '\\*').replace('_', '\\_').replace('[', '\\[').replace(']', '\\]')
        tag, attrs = node.tag, node.attrs
        if tag in {'script', 'style', 'button', 'svg', 'iframe'}:
            return ''
        if tag == 'pre':
            code = next((c for c in node.children if isinstance(c, Node) and c.tag == 'code'), node)
            match = re.search(r'(?:language-|lang-)([\w+-]+)', code.attrs.get('class', '') + ' ' + attrs.get('class', ''))
            lang = match.group(1) if match else attrs.get('data-language', '')
            lang = re.sub(r'[^\w+-]', '', lang)
            content = plain(code).replace('\r\n', '\n').strip('\n')
            longest = max([len(m) for m in re.findall(r'`+', content)] + [2])
            fence = '`' * (longest + 1)
            return '\n\n' + fence + lang + '\n' + content + '\n' + fence + '\n\n'
        if tag == 'code':
            content = plain(node)
            fence = '`' * (max([len(m) for m in re.findall(r'`+', content)] + [0]) + 1)
            return fence + (' ' if content.startswith('`') else '') + content + (' ' if content.endswith('`') else '') + fence
        if tag in {'ul', 'ol'}:
            lines = []
            number = int(attrs.get('start', '1')) if attrs.get('start', '1').isdigit() else 1
            for child in node.children:
                if not isinstance(child, Node) or child.tag != 'li':
                    continue
                text = ''.join(render(c, depth+1) for c in child.children).strip()
                checkbox = next((c for c in child.children if isinstance(c, Node) and c.tag == 'input' and c.attrs.get('type') == 'checkbox'), None)
                marker = str(number) + '. ' if tag == 'ol' else '- '
                if checkbox is not None:
                    marker += '[x] ' if 'checked' in checkbox.attrs else '[ ] '
                lines.append(marker + text.replace('\n', '\n' + ' ' * len(marker)))
                number += 1
            return '\n\n' + '\n'.join(lines) + '\n\n'
        if tag == 'table':
            def rows(n):
                if not isinstance(n, Node):
                    return []
                return [n] if n.tag == 'tr' else [r for c in n.children for r in rows(c)]
            data = [[render(c).strip().replace('|', '\\|').replace('\n', '<br>') for c in r.children if isinstance(c, Node) and c.tag in {'th', 'td'}] for r in rows(node)]
            if not data:
                return ''
            width = max(map(len, data))
            data = [r + [''] * (width-len(r)) for r in data]
            data.insert(1, ['---'] * width)
            return '\n\n' + '\n'.join('| ' + ' | '.join(r) + ' |' for r in data) + '\n\n'
        if tag == 'img':
            src = attrs.get('src', '')
            if src.startswith('data:image/') and image_writer:
                src = image_writer(src)
            if not src.startswith(('https://', 'http://', 'assets/')):
                return ''
            return '![[' + src + ']]' if src.startswith('assets/') else '![' + attrs.get('alt', '').replace(']', '') + '](<' + src.replace('>', '%3E') + '>)'
        content = ''.join(render(c, depth) for c in node.children)
        if tag in {'strong', 'b'}:
            return '**' + content + '**'
        if tag in {'em', 'i'}:
            return '*' + content + '*'
        if tag in {'s', 'strike', 'del'}:
            return '~~' + content + '~~'
        if tag == 'a':
            url = attrs.get('href', '')
            return '[' + content + '](<' + url.replace('>', '%3E') + '>)' if url.startswith(('http://', 'https://', 'mailto:', '#')) else content
        if re.fullmatch(r'h[1-6]', tag):
            return '\n\n' + '#' * int(tag[1]) + ' ' + content.strip() + '\n\n'
        if tag in {'p', 'div', 'section', 'article'}:
            return '\n\n' + content.strip() + '\n\n' if content.strip() else ''
        if tag == 'blockquote':
            return '\n\n' + '\n'.join('> ' + line for line in content.strip().splitlines()) + '\n\n'
        if tag == 'br':
            return '  \n'
        if tag == 'hr':
            return '\n\n---\n\n'
        if tag == 'input':
            return ''
        return content
    # Normalize spacing without changing fenced code (blank lines/indentation matter).
    raw = render(Tree(text or '').root).strip()
    pieces = re.split(r'(^`{3,}[^\n]*\n.*?^`{3,}\s*$)', raw, flags=re.M | re.S)
    return ''.join(piece if i % 2 else re.sub(r'\n{3,}', '\n\n', piece) for i, piece in enumerate(pieces))


class Exporter:
    def __init__(self, config):
        self.config = config
        self.vault = Path(config['vault']).resolve()
        if not self.vault.is_dir():
            raise ValueError('Obsidian kasası bulunamadı.')
        self.state_path = Path(config['state'])
        self.state = json.loads(self.state_path.read_text()) if self.state_path.exists() else {'files': {}}
        if not self.state_path.exists() and config.get('seedManifest'):
            manifest = json.loads(Path(config['seedManifest']).read_text())
            base = Path(config['seedDirectory'])
            for item in manifest['files']:
                p = base / item['path']
                self.state['files'][item['id']] = {'path':item['path'], 'hash':digest(p.read_text()), 'source':None}
            for p in base.rglob('*.md'):
                rel = p.relative_to(base).as_posix()
                if not any(item['path'] == rel for item in manifest['files']):
                    self.state['files']['index:' + rel] = {'path':rel, 'hash':digest(p.read_text()), 'source':None}

    def target(self, rel):
        p = self.vault / rel
        if not p.resolve().is_relative_to(self.vault) or p.is_symlink():
            raise ValueError('Kasa dışına yazılamaz.')
        return p

    def image(self, data):
        m = re.fullmatch(r'data:image/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=\s]+)', data)
        if not m:
            return ''
        content = base64.b64decode(m[2], validate=False)
        rel = 'assets/notmonk/' + hashlib.sha256(content).hexdigest() + '.' + m[1]
        p = self.target(rel)
        if not p.exists():
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(content)
        return rel

    def write(self, key, rel, content):
        entry = self.state['files'].get(key)
        source = digest(content)
        if entry and entry.get('source') == source and self.target(entry['path']).exists():
            return bool(entry.get('conflict'))
        # Stable filenames keep existing Obsidian links valid when titles change.
        rel = entry['path'] if entry else rel
        p = self.target(rel)
        current = p.read_text() if p.exists() else None
        if current is not None and digest(current) != source and (not entry or digest(current) != entry['hash']):
            copy = 'NotMonk Aktarım Kopyaları/' + safe(p.stem) + '-' + digest(key)[:8] + '-' + source[:10] + '.md'
            copy_path = self.target(copy)
            if not copy_path.exists():
                atom(copy_path, content)
            self.state['files'][key] = {**(entry or {'path':rel, 'hash':digest(current)}), 'source':source, 'conflict':copy}
            return True
        if current != content:
            if current is not None:
                backup = self.target('.notmonk-backups/' + digest(current) + '.md')
                if not backup.exists():
                    atom(backup, current)
            atom(p, content)
        self.state['files'][key] = {'path':rel, 'hash':source, 'source':source}
        return False

    def sync(self, data):
        pages = data.get('topics', [])
        categories = data.get('categories', [])
        if not isinstance(pages, list) or not isinstance(categories, list):
            raise ValueError('Geçersiz sayfa listesi.')
        by_id = {p['id']:p for p in pages}
        if len(by_id) != len(pages):
            raise ValueError('Sayfa kimlikleri benzersiz olmalı.')
        order = [c for c in data.get('moduleOrder', []) if c in categories]
        categories = list(dict.fromkeys(order + categories + [p.get('category') or 'Diğer' for p in pages]))
        folders, paths, reserved, children = {}, {}, set(), {}
        for category in categories:
            folder = safe(category)
            if folder.casefold() in reserved:
                folder += '-' + digest(category)[:8]
            folders[category] = folder
            reserved.add(folder.casefold())
        reserved = {entry['path'].casefold() for entry in self.state['files'].values()}
        for page in pages:
            children.setdefault(page.get('parentTopicId'), []).append(page)
        def path_for(page, visiting=None):
            key = page['id']
            if key in paths:
                return paths[key]
            visiting = set() if visiting is None else visiting
            if key in visiting:
                raise ValueError('Sayfa ağacında döngü var.')
            visiting.add(key)
            parent = by_id.get(page.get('parentTopicId'))
            if parent:
                directory = Path(path_for(parent, visiting)).parent
                if children.get(key):
                    directory /= safe(page['title'])
            else:
                directory = Path(folders[page.get('category') or 'Diğer']) / safe(page['title'])
            proposed = (directory / (safe(page['title']) + '.md')).as_posix()
            entry = self.state['files'].get(key)
            if entry:
                proposed = entry['path']
            elif proposed.casefold() in reserved:
                proposed = (directory / (safe(page['title']) + '-' + digest(key)[:8] + '.md')).as_posix()
            reserved.add(proposed.casefold())
            paths[key] = proposed
            visiting.remove(key)
            return proposed
        for page in pages:
            path_for(page)
        def link(page):
            label = str(page['title']).replace('|', '-').replace(']', '')
            return '[[' + str(Path(paths[page['id']]).with_suffix('')) + '|' + label + ']]'
        conflicts = 0
        status = {'todo':'Yapılacak','in_progress':'Çalışıyorum','done':'Bitirdim','review':'Tekrar edeceğim'}
        for page in pages:
            lines = ['---','notmonk_id: ' + val(page['id']), 'aliases: [' + val(page['title']) + ']', 'durum: ' + val(status.get(page.get('status'), 'Yapılacak')), 'alan: ' + val('[[' + folders[page.get('category') or 'Diğer'] + '/Alan|' + (page.get('category') or 'Diğer') + ']]')]
            for key, field in [('priority','öncelik'),('estimatedMinutes','tahmini_dakika'),('learningObjective','öğrenme_hedefi'),('resource','kaynak')]:
                if page.get(key):
                    lines.append(field + ': ' + val(page[key]))
            if page.get('parentTopicId') in by_id:
                lines.append('üst_sayfa: ' + val(link(by_id[page['parentTopicId']])))
            for field, values in [('alt_sayfalar', children.get(page['id'], [])), ('ön_koşullar', [by_id[i] for i in page.get('prerequisiteIds', []) if i in by_id])]:
                if values:
                    lines += [field + ':'] + ['  - ' + val(link(p)) for p in values]
            lines += ['---','',markdown(page.get('notes', ''), self.image),'']
            conflicts += self.write(page['id'], paths[page['id']], '\n'.join(lines))
        indexes = {}
        for category in categories:
            rel = folders[category] + '/Alan.md'
            indexes[rel] = '# ' + category + '\n\n' + '\n'.join('- ' + link(p) for p in pages if (p.get('category') or 'Diğer') == category and p.get('parentTopicId') not in by_id) + '\n'
        indexes['NotMonk.md'] = '# NotMonk\n\n' + '\n'.join('- [[' + folders[c] + '/Alan|' + c + ']]' for c in categories) + '\n\n[[Çalıştıklarım]]\n'
        board = ['# Çalıştıklarım','']
        for key, title in [('working','Çalışıyorum'), ('review','Tekrar edeceğim'), ('done','Bitirdim')]:
            board += ['## ' + title, '']
            for item in (data.get('studyItems') or {}).get('items', []):
                if item.get('archived') or item.get('status', 'working') != key:
                    continue
                board.append('- ' + (link(by_id[item['pageId']]) if item.get('pageId') in by_id else str(item.get('title', '')).replace('\n', ' ')))
            board.append('')
        indexes['Çalıştıklarım.md'] = '\n'.join(board) + '\n'
        for rel, content in indexes.items():
            conflicts += self.write('index:' + rel, rel, content)
        self.state['lastSync'] = int(time.time() * 1000)
        atom(self.state_path, json.dumps(self.state, ensure_ascii=False, indent=2))
        return {'vault':str(self.vault), 'vaultName':self.vault.name, 'topics':len(pages), 'areas':len(categories), 'conflicts':conflicts}


def handler(exporter, token, origins):
    class Handler(BaseHTTPRequestHandler):
        def allowed(self):
            origin = self.headers.get('Origin')
            host = self.headers.get('Host', '')
            return host == '127.0.0.1:8771' and (not origin or origin in origins)

        def send(self, status, data):
            self.send_response(status)
            origin = self.headers.get('Origin')
            if origin in origins:
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Vary', 'Origin')
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode())

        def do_OPTIONS(self):
            if not self.allowed():
                return self.send(403, {'error':'Origin'})
            self.send_response(204)
            origin = self.headers.get('Origin')
            if origin in origins:
                self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
            self.send_header('Access-Control-Allow-Private-Network', 'true')
            self.end_headers()

        def authorized(self):
            return self.allowed() and secrets.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token)

        def do_GET(self):
            if not self.authorized():
                return self.send(403, {'error':'Authorization'})
            if self.path != '/health':
                return self.send(404, {})
            self.send(200, {'vault':str(exporter.vault), 'vaultName':exporter.vault.name, 'lastSync':exporter.state.get('lastSync', 0)})

        def do_POST(self):
            if not self.authorized():
                return self.send(403, {'error':'Authorization'})
            if self.path != '/sync':
                return self.send(404, {})
            size = int(self.headers.get('Content-Length', '0'))
            if size <= 0 or size > 50 * 1024 * 1024:
                return self.send(413, {})
            try:
                data = json.loads(self.rfile.read(size))
                self.send(200, exporter.sync(data))
            except (ValueError, KeyError, TypeError, OSError) as error:
                self.send(422, {'error':str(error)})

        def log_message(self, *_args):
            pass  # Never log notes or credentials.
    return Handler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', required=True)
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    server = HTTPServer(('127.0.0.1', 8771), handler(Exporter(config), config['token'], config['origins']))
    server.serve_forever()


if __name__ == '__main__':
    main()
