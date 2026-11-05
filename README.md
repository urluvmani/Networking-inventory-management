# IT Inventory Management System

A full-stack Next.js application for managing IT inventory with MongoDB Atlas, featuring real-time printer status monitoring via IP pings.

## Features

- **System & Printer Management**: Full CRUD operations for IT devices
- **Real-time Status**: Automatic IP ping monitoring for printers (172.18.x.x range)
- **Department Analytics**: Device counts by department and building
- **Uptime Tracking**: Calculate and display printer uptime percentages
- **Report Export**: CSV export functionality for inventory data
- **Responsive Dashboard**: Built with Tailwind CSS for all screen sizes

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: MongoDB Atlas with Mongoose
- **Deployment**: Vercel
- **Icons**: React Icons

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account
- Git (for deployment)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd inventory-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the project root:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/inventory?retryWrites=true&w=majority
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Replace `<username>` and `<password>` with your MongoDB Atlas credentials.

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Schema

### System Model
- `deviceName`: String (required)
- `building`: String (required)
- `department`: String (required)
- `connectionType`: 'IP-based' | 'Cable-connected' (required)
- `ipAddress`: String (required for IP-based devices)
- `createdAt`, `updatedAt`: Dates (auto-generated)

### Printer Model
- All System fields plus:
- `status`: 'online' | 'offline' | 'unknown' (default: 'unknown')
- `lastChecked`: Date
- `uptimePercentage`: Number (0-100)

## API Endpoints

### Systems
- `GET /api/systems` - Get all systems
- `POST /api/systems` - Create a new system
- `GET /api/systems/[id]` - Get a specific system
- `PUT /api/systems/[id]` - Update a system
- `DELETE /api/systems/[id]` - Delete a system

### Printers
- `GET /api/printers` - Get all printers
- `POST /api/printers` - Create a new printer
- `GET /api/printers/[id]` - Get a specific printer
- `PUT /api/printers/[id]` - Update a printer
- `DELETE /api/printers/[id]` - Delete a printer
- `POST /api/printers/ping-status` - Update printer status via ping
- `GET /api/printers/ping-status` - Get current printer status

### Statistics
- `GET /api/stats` - Get system and printer statistics

### Export
- `GET /api/export/systems` - Export systems as CSV
- `GET /api/export/printers` - Export printers as CSV

## Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Quick Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com/new)
3. Add `MONGODB_URI` environment variable in Vercel settings
4. Deploy!

## Project Structure

```
inventory-system/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── systems/
│   │   │   ├── printers/
│   │   │   ├── stats/
│   │   │   └── export/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── StatsCards.tsx
│   │   ├── DepartmentChart.tsx
│   │   ├── DeviceTable.tsx
│   │   └── AddDeviceModal.tsx
│   ├── lib/
│   │   ├── mongodb.ts
│   │   └── ping.ts
│   └── models/
│       ├── System.ts
│   │   └── Printer.ts
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vercel.json
```

## License

MIT
