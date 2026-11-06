#!/usr/bin/env python3
"""Fix: Print Bill blocked by CORS (route set Access-Control-Allow-Origin: * which
conflicts with credentials). Removes the wildcard header; global cors() handles it.
Run from the repo root (folder containing retailflow-backend). Idempotent."""
import sys, pathlib
p = pathlib.Path('retailflow-backend/src/controllers/sale.controller.js')
if not p.exists():
    sys.exit('ERROR: run this from the repo root (retailflow-backend/ not found)')
s = p.read_text(encoding='utf-8')
old = "    'Content-Length':      pdf.length,\n    'Access-Control-Allow-Origin': '*',\n  }).send(pdf)"
new = "    'Content-Length':      pdf.length,\n  }).send(pdf)"
if old in s:
    assert s.count(old) == 1
    p.write_text(s.replace(old, new), encoding='utf-8')
    print('patched sale.controller.js')
elif "'Access-Control-Allow-Origin': '*'" in s:
    sys.exit('ERROR: wildcard header present but in unexpected shape; not patching')
else:
    print('already applied')
