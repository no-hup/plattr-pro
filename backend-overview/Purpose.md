# Backend Overview Package Purpose

This package renders an interactive, zoomable canvas that documents the end-to-end flow of prioritized backend APIs. It is the single source of truth for:

- Visualizing how callable/HTTP functions connect to each other in the consumer journey
- Exploring API-specific scenarios with sample requests/responses
- Tracking remaining endpoints that still need to be mapped (see `TODO.md`)

## Maintenance Workflow

1. **Update the data source**  
   - Edit `data/mockdata2.json` to add/modify API nodes, links, or scenario metadata.  
   - Follow the existing schema (`metadata`, `groups`, `apis`, `links`). Reuse group IDs when possible.

2. **Provide scenario samples**  
   - For every scenario entry, create a matching HTML file under `scenarios/<module>/<api>-<scenario>.html`.  
   - Keep the structure: title, short description, request payload, response payload, and notes.

3. **Refresh documentation**  
   - If a new domain or module is introduced, update this Purpose file with a short note about where its source of truth lives in the codebase.  
   - List any APIs that still need design coverage in `TODO.md` with links to their source files.

4. **Validate locally**  
   - Open `index.html` in a browser.  
   - Confirm the new nodes appear, links are correct, and scenario buttons open the right samples in new tabs.

### Conventions
- Keep file paths absolute (from the repo root) inside the JSON so contributors can jump straight into code.
- Use camelCase IDs for groups and kebab-case IDs for APIs/scenarios.
- Prefer concise labels (max ~28 chars) to keep nodes readable.
- When removing APIs, also remove their scenarios and update the TODO list if work remains.

## Source Inputs
- Consumer journey analysis in `backend/src-plattr/warp/CONSUMER_APP_FLOW_ANALYSIS.md`
- Enhanced deep-dive in `backend/src-plattr/warp/ENHANCED_CONSUMER_APP_ANALYSIS.md`
- Firestore mock data structure in `backend/src-plattr/functions/mock/mockDataV2.json`

This package should always reflect the latest backend behavior before it ships to customers.
