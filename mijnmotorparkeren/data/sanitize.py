#!/usr/bin/env python3
import json
import os

base_dir = './gemeentes'
DEFAULT_NOTE = "Er zijn geen gegevens over parkeerregels beschikbaar voor deze gemeente."

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.json'):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # 1️⃣ Minimize boundaries.coordinates if exists
                compact_coords = None
                if isinstance(data, dict) and 'boundaries' in data:
                    boundaries = data['boundaries']
                    if isinstance(boundaries, dict) and 'coordinates' in boundaries:
                        coords = boundaries['coordinates']
                        compact_coords = json.dumps(coords, separators=(',', ':'))
                        del boundaries['coordinates']

                # 2️⃣ Ensure parkingRules is a dict
                if not isinstance(data.get('parkingRules'), dict):
                    data['parkingRules'] = {}

                # 3️⃣ Update notes if empty / null / missing
                motorcycle = data['parkingRules'].setdefault('motorcycleSpecific', {})
                notes = motorcycle.get('notes')
                if notes is None or (isinstance(notes, str) and notes.strip() == ""):
                    motorcycle['notes'] = DEFAULT_NOTE

                # 4️⃣ Pretty-print the rest
                pretty_json = json.dumps(data, indent=4, ensure_ascii=False)

                # 5️⃣ Reinsert compact coordinates if present
                if compact_coords:
                    pretty_json = pretty_json.replace(
                        '"boundaries": {',
                        '"boundaries": {\n        "coordinates": ' + compact_coords + ','
                    )

                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(pretty_json)

                print(f"Updated: {file_path}")

            except Exception as e:
                print(f"Failed to process {file_path}: {e}")
