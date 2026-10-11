#!/usr/bin/env python3
"""Install the local exporter as a per-user macOS service."""
import argparse
import json
import os
from pathlib import Path
import plistlib
import secrets
import subprocess
import sys
parser=argparse.ArgumentParser()
parser.add_argument('--vault',required=True)
args=parser.parse_args()
repo=Path(__file__).resolve().parent.parent
vault=Path(args.vault).expanduser().resolve()
if not vault.is_dir():raise SystemExit('Kasa bulunamadı; mevcut bir Obsidian kasası seç.')
scratch=repo/'scratch';scratch.mkdir(exist_ok=True)
config_path=scratch/'obsidian-bridge-config.local.json'
config=json.loads(config_path.read_text()) if config_path.exists() else {'token':secrets.token_urlsafe(32)}
config.update(vault=str(vault),state=str(scratch/'obsidian-bridge-state.local.json'),origins=['chrome-extension://jhlegegnkbabnlfncflbcmpeeefoaplf'])
manifest=scratch/'obsidian-export-manifest.local.json'
if manifest.exists() and (repo/'exports/NotMonk').is_dir():
    config.update(seedManifest=str(manifest),seedDirectory=str(repo/'exports/NotMonk'))
config_path.write_text(json.dumps(config,ensure_ascii=False,indent=2));config_path.chmod(0o600)
client=repo/'obsidian-local-config.local.js'
client.write_text('globalThis.NOTMONK_OBSIDIAN_LOCAL = '+json.dumps({'token':config['token']})+';\n');client.chmod(0o600)
label='com.notmonk.obsidian-bridge'
folder=Path.home()/'Library/LaunchAgents';folder.mkdir(parents=True,exist_ok=True)
plist=folder/(label+'.plist')
settings={'Label':label,'ProgramArguments':[sys.executable,str(repo/'scripts/obsidian_bridge.py'),'--config',str(config_path)],'RunAtLoad':True,'KeepAlive':True,'WorkingDirectory':str(repo),'StandardOutPath':str(scratch/'obsidian-bridge.stdout.local.log'),'StandardErrorPath':str(scratch/'obsidian-bridge.stderr.local.log'),'ThrottleInterval':10}
plist.write_bytes(plistlib.dumps(settings));plist.chmod(0o600)
domain='gui/'+str(os.getuid())
subprocess.run(['launchctl','bootout',domain+'/'+label],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
subprocess.run(['launchctl','bootstrap',domain,str(plist)],check=True)
print('Yerel Obsidian servisi kuruldu: '+str(vault))
