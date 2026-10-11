import importlib.util
import json
from pathlib import Path
import tempfile
import subprocess
import unittest
spec = importlib.util.spec_from_file_location('bridge', 'scripts/obsidian_bridge.py')
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)

class ExportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.vault = self.root / 'Vault'
        self.vault.mkdir()
        self.config = {'vault':str(self.vault), 'state':str(self.root/'state.json')}
        self.export = b.Exporter(self.config)
        self.data = {'categories':['Area'], 'topics':[{'id':'p','title':'Lesson','category':'Area','notes':'<p>Hello <b>world</b>.</p>'}], 'studyItems':{'items':[{'pageId':'p','status':'review'},{'title':'Free item','status':'working'}]}}
    def tearDown(self):
        self.tmp.cleanup()
    def test_automatic_edits_and_restart(self):
        result = self.export.sync(self.data)
        self.assertEqual(result['topics'],1)
        p = self.vault/'Area/Lesson/Lesson.md'
        self.assertIn('Hello **world**.', p.read_text())
        self.data['topics'][0]['notes']='<p>Updated.</p>'
        self.export = b.Exporter(self.config)
        self.export.sync(self.data)
        self.assertIn('Updated.',p.read_text())
        self.assertNotIn('Hello',p.read_text())
        self.assertIn('Free item',(self.vault/'Çalıştıklarım.md').read_text())
        self.assertTrue(list((self.vault/'.notmonk-backups').glob('*.md')))
    def test_obsidian_edits_are_preserved_and_conflicts_do_not_accumulate(self):
        self.export.sync(self.data)
        p=self.vault/'Area/Lesson/Lesson.md'
        p.write_text(p.read_text()+'Obsidian edit\n')
        self.assertEqual(self.export.sync(self.data)['conflicts'],0)
        self.data['topics'][0]['notes']='<p>New NotMonk edit</p>'
        self.assertEqual(self.export.sync(self.data)['conflicts'],1)
        self.assertIn('Obsidian edit',p.read_text())
        copies=list((self.vault/'NotMonk Aktarım Kopyaları').glob('*.md'))
        self.assertEqual(len(copies),1)
        self.assertIn('New NotMonk edit',copies[0].read_text())
        self.export.sync(self.data)
        self.assertEqual(len(list((self.vault/'NotMonk Aktarım Kopyaları').glob('*.md'))),1)
    def test_identical_titles_keep_distinct_files_and_rename_keeps_links(self):
        self.data['topics'].append({'id':'q','title':'Lesson','category':'Area','notes':'Other'})
        self.export.sync(self.data)
        paths=[v['path'] for k,v in self.export.state['files'].items() if not k.startswith('index:')]
        self.assertEqual(len(set(paths)),2)
        self.data['topics'][0]['title']='Renamed'
        self.export.sync(self.data)
        self.assertIn('Renamed',(self.vault/paths[0]).read_text())
    def test_seed_protects_existing_edits_and_deletions_do_not_remove_files(self):
        template=self.root/'template';template.mkdir()
        (template/'Lesson.md').write_text('Old export')
        (self.vault/'Lesson.md').write_text('User edited')
        manifest=self.root/'manifest.json';manifest.write_text(json.dumps({'files':[{'id':'p','path':'Lesson.md'}]}))
        self.config.update(seedManifest=str(manifest),seedDirectory=str(template))
        self.export=b.Exporter(self.config)
        self.assertEqual(self.export.sync(self.data)['conflicts'],1)
        self.assertEqual((self.vault/'Lesson.md').read_text(),'User edited')
        self.export.sync({'categories':['Area'],'topics':[]})
        self.assertTrue((self.vault/'Lesson.md').exists())
    def test_paths_cannot_escape_vault_through_symlinks(self):
        outside=self.root/'outside';outside.mkdir()
        (self.vault/'Area').symlink_to(outside, target_is_directory=True)
        with self.assertRaises(ValueError):self.export.sync(self.data)
        self.assertFalse(list(outside.iterdir()))
    def test_code_nested_lists_tables_and_blank_body(self):
        text=b.markdown('<h2>Example</h2><pre><code class="language-c">int main() {\n\n\n  printf("&lt;%d&gt;", 3);\n}\n</code></pre><ul><li>One<ul><li>Two</li></ul></li></ul><table><tr><th>A</th><th>B</th></tr><tr><td>x</td><td>y</td></tr></table>')
        self.assertIn('```c\nint main() {\n\n\n  printf("<%d>", 3);',text)
        self.assertIn('- One',text)
        self.assertIn('  - Two',text)
        self.assertIn('| --- | --- |',text)
        self.assertEqual(b.markdown('<p><br></p>'),'')
    def test_empty_public_data_creates_no_personal_pages(self):
        result=self.export.sync({'categories':[], 'topics':[]})
        self.assertEqual(result['topics'],0)
        self.assertFalse(any(p.name == 'Lesson.md' for p in self.vault.rglob('*.md')))

if __name__=='__main__':unittest.main()
