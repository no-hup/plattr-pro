#!/usr/bin/env python3
"""
Response Guard - Extract Contracts from HTML Specs

Parses the HTML specification files to extract API response contracts
(mandatory fields, optional fields, sample responses) for validation.
"""

import json
import os
import re
from pathlib import Path
from html.parser import HTMLParser

# Try to import BeautifulSoup, fall back to basic HTML parsing
try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False
    print("Warning: beautifulsoup4 not installed. Using basic HTML parsing.")
    print("Install with: pip install beautifulsoup4")


class BasicHTMLExtractor(HTMLParser):
    """Basic HTML parser for extracting JSON from pre/code blocks."""
    
    def __init__(self):
        super().__init__()
        self.in_code_block = False
        self.current_data = []
        self.json_blocks = []
        
    def handle_starttag(self, tag, attrs):
        if tag in ('pre', 'code'):
            self.in_code_block = True
            self.current_data = []
            
    def handle_endtag(self, tag):
        if tag in ('pre', 'code') and self.in_code_block:
            self.in_code_block = False
            content = ''.join(self.current_data).strip()
            if content.startswith('{') or content.startswith('['):
                self.json_blocks.append(content)
                
    def handle_data(self, data):
        if self.in_code_block:
            self.current_data.append(data)


def extract_fields_from_json(json_str: str) -> dict:
    """Extract field names and types from a JSON string."""
    # Clean up the JSON string (remove comments, handle trailing commas)
    cleaned = re.sub(r'//.*', '', json_str)  # Remove // comments
    cleaned = re.sub(r',\s*}', '}', cleaned)  # Remove trailing commas
    cleaned = re.sub(r',\s*]', ']', cleaned)
    
    try:
        data = json.loads(cleaned)
        return analyze_structure(data)
    except json.JSONDecodeError:
        return {"error": "Could not parse JSON"}


def analyze_structure(obj, path="") -> dict:
    """Recursively analyze JSON structure to identify fields and types."""
    fields = {}
    
    if isinstance(obj, dict):
        for key, value in obj.items():
            field_path = f"{path}.{key}" if path else key
            
            if isinstance(value, dict):
                fields[field_path] = {
                    "type": "object",
                    "children": analyze_structure(value, field_path)
                }
            elif isinstance(value, list):
                if len(value) > 0:
                    fields[field_path] = {
                        "type": "array",
                        "itemType": type(value[0]).__name__,
                        "children": analyze_structure(value[0], f"{field_path}[]") if isinstance(value[0], dict) else {}
                    }
                else:
                    fields[field_path] = {"type": "array", "itemType": "unknown"}
            else:
                fields[field_path] = {
                    "type": type(value).__name__,
                    "sampleValue": str(value)[:50] if value is not None else "null"
                }
    
    return fields


def extract_from_html_with_bs4(html_content: str, filename: str) -> dict:
    """Extract contracts using BeautifulSoup."""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    contracts = {}
    
    # Find all API accordion sections
    accordions = soup.find_all(class_='api-accordion')
    
    for accordion in accordions:
        # Get API name from header
        header = accordion.find(class_='api-name')
        if not header:
            continue
            
        api_name = header.get_text().strip()
        
        # Get API type (public, internal, trigger)
        type_badge = accordion.find(class_=re.compile(r'api-type'))
        api_type = type_badge.get_text().strip() if type_badge else "unknown"
        
        # Get description
        desc = accordion.find(class_='api-desc')
        description = desc.get_text().strip() if desc else ""
        
        # Find JSON blocks in content
        content = accordion.find(class_='api-content')
        if not content:
            continue
            
        json_blocks = content.find_all(class_='json-block')
        
        # Separate request and response blocks
        sample_request = None
        sample_response = None
        mandatory_fields = []
        optional_fields = []
        
        for block in json_blocks:
            # Check for field coloring to determine mandatory/optional
            mandatory_spans = block.find_all(class_='field-mandatory')
            optional_spans = block.find_all(class_='field-optional')
            
            for span in mandatory_spans:
                field_name = span.get_text().strip().strip('"').strip(':')
                if field_name and field_name not in mandatory_fields:
                    mandatory_fields.append(field_name)
                    
            for span in optional_spans:
                field_name = span.get_text().strip().strip('"').strip(':')
                if field_name and field_name not in optional_fields:
                    optional_fields.append(field_name)
            
            # Get the raw JSON content
            block_text = block.get_text()
            if '"data"' in block_text and 'restaurantId' in block_text:
                sample_request = block_text[:500]  # Truncate for storage
            elif '"status"' in block_text or '"success"' in block_text:
                sample_response = block_text[:1000]
        
        contracts[api_name] = {
            "type": api_type,
            "description": description,
            "specFile": filename,
            "mandatoryFields": mandatory_fields,
            "optionalFields": optional_fields,
            "sampleRequest": sample_request,
            "sampleResponse": sample_response
        }
    
    return contracts


def extract_from_html_basic(html_content: str, filename: str) -> dict:
    """Extract contracts using basic HTML parsing."""
    parser = BasicHTMLExtractor()
    parser.feed(html_content)
    
    contracts = {}
    for i, json_block in enumerate(parser.json_blocks):
        fields = extract_fields_from_json(json_block)
        contracts[f"block_{i}"] = {
            "specFile": filename,
            "fields": fields,
            "rawJson": json_block[:500]  # Truncate
        }
    
    return contracts


def extract_from_scenario_file(html_content: str, filename: str) -> dict:
    """Extract sample request/response from scenario HTML files."""
    if HAS_BS4:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Get title
        title = soup.find('h1')
        title_text = title.get_text() if title else filename
        
        # Find request and response sections
        request_section = None
        response_section = None
        
        for h2 in soup.find_all('h2'):
            if 'Request' in h2.get_text():
                next_pre = h2.find_next('pre')
                if next_pre:
                    request_section = next_pre.get_text()[:500]
            elif 'Response' in h2.get_text():
                next_pre = h2.find_next('pre')
                if next_pre:
                    response_section = next_pre.get_text()[:1000]
        
        return {
            "scenario": title_text,
            "file": filename,
            "sampleRequest": request_section,
            "sampleResponse": response_section
        }
    else:
        parser = BasicHTMLExtractor()
        parser.feed(html_content)
        
        return {
            "scenario": filename,
            "jsonBlocks": [block[:500] for block in parser.json_blocks[:2]]
        }


def main():
    # Paths
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent
    contracts_dir = root_dir / "contracts"
    output_file = contracts_dir / "extracted_contracts.json"
    
    # Spec files location
    spec_dir = Path("/Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/warp/complete_app_flow_html/specs")
    scenario_dir = Path("/Users/shauryajaiswal/Desktop/dev/plattr-pro/backend-overview/scenarios")
    
    # Create contracts directory
    contracts_dir.mkdir(exist_ok=True)
    
    print("🔍 Response Guard - Contract Extractor")
    print("=" * 40)
    
    all_contracts = {
        "extractedAt": "",
        "specContracts": {},
        "scenarios": {}
    }
    
    # Extract from spec files
    if spec_dir.exists():
        print(f"\n📄 Processing spec files from: {spec_dir}")
        for html_file in spec_dir.glob("*.html"):
            if "api_reference" in html_file.name:
                # API reference files have the detailed contracts
                print(f"  - {html_file.name}")
                try:
                    content = html_file.read_text(encoding='utf-8')
                    if HAS_BS4:
                        contracts = extract_from_html_with_bs4(content, html_file.name)
                    else:
                        contracts = extract_from_html_basic(content, html_file.name)
                    all_contracts["specContracts"].update(contracts)
                except Exception as e:
                    print(f"    ⚠️ Error: {e}")
    else:
        print(f"⚠️ Spec directory not found: {spec_dir}")
    
    # Extract from scenario files
    if scenario_dir.exists():
        print(f"\n📁 Processing scenario files from: {scenario_dir}")
        for subdir in scenario_dir.iterdir():
            if subdir.is_dir():
                for html_file in subdir.glob("*.html"):
                    print(f"  - {subdir.name}/{html_file.name}")
                    try:
                        content = html_file.read_text(encoding='utf-8')
                        scenario = extract_from_scenario_file(content, f"{subdir.name}/{html_file.name}")
                        scenario_key = f"{subdir.name}/{html_file.stem}"
                        all_contracts["scenarios"][scenario_key] = scenario
                    except Exception as e:
                        print(f"    ⚠️ Error: {e}")
    else:
        print(f"⚠️ Scenario directory not found: {scenario_dir}")
    
    # Add timestamp
    from datetime import datetime
    all_contracts["extractedAt"] = datetime.utcnow().isoformat() + "Z"
    
    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_contracts, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Contracts extracted to: {output_file}")
    print(f"   - Spec contracts: {len(all_contracts['specContracts'])}")
    print(f"   - Scenarios: {len(all_contracts['scenarios'])}")


if __name__ == "__main__":
    main()
