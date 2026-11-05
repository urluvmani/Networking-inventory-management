# IT Inventory Management System - Deployment Guide

## Overview
A full-stack Next.js application for managing IT inventory with MongoDB Atlas, featuring real-time printer status monitoring via IP pings.

## Features
- **System & Printer Management**: Full CRUD operations for IT devices
- **Real-time Status**: Automatic IP ping monitoring for printers (172.18.x.x range)
- **Department Analytics**: Device counts by department and building
- **Uptime Tracking**: Calculate and display printer uptime percentages
- **Report Export**: CSV export functionality for inventory data
- **Responsive Dashboard**: Built with Tailwind CSS for all screen sizes

## Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account
- Vercel account (for deployment)

## Local Development Setup

### 1. Install Dependencies
```bash
cd inventory-system
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the project root:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/inventory?retryWrites=true&w=majority
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Replace `<username>` and `<password>` with your MongoDB Atlas credentials.

### 3. Run Development Server
```bash
npm run dev
```
Open http://localhost:3000 in your browser.

## MongoDB Atlas Setup

1. **Create a Cluster**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free account and new cluster
   - Choose the closest region to your users

2. **Database Access**
   - Create a database user with read/write permissions
   - Note the username and password

3. **Network Access**
   - Add IP access for:
     - Your local IP (for development)
     - `0.0.0.0/0` (for Vercel deployment, or use Vercel's IP ranges)

4. **Get Connection String**
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

## Vercel Deployment

### 1. Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### 2. Deploy via Vercel Dashboard

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import Project to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Select the `inventory-system` folder

3. **Configure Environment Variables**
   In Vercel project settings, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `NEXT_PUBLIC_APP_URL`: Your Vercel deployment URL (auto-filled)

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application

### 3. Deploy via Vercel CLI
```bash
vercel
```
Follow the prompts to configure and deploy.

## Post-Deployment Configuration

### MongoDB Network Access
After deployment, ensure your MongoDB Atlas whitelist includes:
- Vercel's IP ranges (check Vercel documentation for current ranges)
- Or use `0.0.0.0/0` for access from anywhere (less secure)

### Environment Variables in Vercel
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add `MONGODB_URI` with your MongoDB connection string
4. Redeploy if needed

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

## Troubleshooting

### MongoDB Connection Issues
- Verify your MongoDB URI is correct
- Check network access whitelist in MongoDB Atlas
- Ensure database user has proper permissions
- Check MongoDB Atlas cluster status

### Printer Ping Not Working
- Printer pings require server-side execution
- On Vercel, consider using Vercel Cron Jobs for scheduled pings
- For 172.18.x.x range, ensure network routing allows access

### Build Errors
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run lint`

## Production Considerations

### Security
- Never commit `.env.local` to version control
- Use Vercel environment variables for secrets
- Implement authentication for production use
- Add rate limiting to API routes

### Performance
- Add database indexes for frequently queried fields
- Implement caching for statistics endpoints
- Consider pagination for large device lists
- Use Vercel Edge Functions for global distribution

### Monitoring
- Set up MongoDB Atlas monitoring
- Configure Vercel Analytics
- Add error tracking (e.g., Sentry)
- Monitor API response times

## Additional Features to Consider

- User authentication and role-based access
- Device history and audit logs
- Automated status monitoring with cron jobs
- Email alerts for offline devices
- Integration with asset management systems
- Mobile app or PWA support

## Support

For issues or questions:
- Check MongoDB Atlas documentation
- Review Vercel deployment docs
- Open an issue in the repository
