<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project-Specific Information

### IT Inventory Management System

This is a full-stack Next.js application for managing IT inventory with MongoDB Atlas.

**Key Technologies:**
- Next.js 16 with App Router
- MongoDB Atlas with Mongoose ODM
- Tailwind CSS 4 for styling
- TypeScript for type safety

**Environment Variables Required:**
- `MONGODB_URI`: MongoDB Atlas connection string
- `NEXT_PUBLIC_APP_URL`: Application URL (localhost:3000 for dev)
- `WMI_USER`: Windows WMI username for remote hardware sync (optional, format: "username" or "DOMAIN\\username")
- `WMI_PASSWORD`: Windows WMI password for remote hardware sync (optional)

**Hardware Sync Feature:**
- When pinging a system, if WMI credentials are configured, the system will fetch hardware details (RAM, Hard Disk, CPU, OS, Motherboard)
- Changes in hardware are detected and alerts are shown when hardware is modified between syncs
- Hardware details are displayed in the Systems table
- Domain user format: For bpride.com domain, use "bpride.com\\username" or just "username" (domain will be auto-added)

**Agent-Based Deployment (Recommended):**
- Group Policy deployment for automatic agent installation across domain
- Agent runs as Windows service on port 8765
- No credentials required after initial deployment
- See `GPO-DEPLOYMENT.md` for detailed instructions
- Agent script: `agent/gpo-install.ps1`

**Database Models:**
- System: deviceName, building, department, connectionType, ipAddress
- Printer: Same as System + status, lastChecked, uptimePercentage

**Build Commands:**
- Development: `npm run dev`
- Build: `npm run build`
- Start: `npm start`
- Lint: `npm run lint`

**API Routes:**
- `/api/systems` - CRUD for systems
- `/api/printers` - CRUD for printers
- `/api/printers/ping-status` - IP ping for printer status
- `/api/stats` - Statistics endpoint
- `/api/export/[type]` - CSV export
