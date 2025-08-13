# NetMonitor Pro

## Overview

NetMonitor Pro is a comprehensive network monitoring and management application built as a full-stack TypeScript solution. The system provides real-time monitoring of network devices, Raspberry Pi nodes, and network statistics with features including device discovery, performance analytics, alert management, and network diagnostic tools. The application serves as a centralized dashboard for network administrators to monitor, analyze, and maintain their network infrastructure.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built using React with TypeScript and follows a modern component-based architecture:

- **UI Framework**: React with TypeScript, utilizing Wouter for routing instead of React Router for a lightweight solution
- **State Management**: TanStack Query (React Query) for server state management and data fetching with built-in caching and real-time updates
- **Styling**: Tailwind CSS with custom CSS variables for theming, using shadcn/ui component library for consistent design system
- **Build Tool**: Vite for fast development and optimized production builds
- **Component Structure**: Modular components organized by feature (alerts, devices, network tools, charts, etc.)

The frontend architecture emphasizes real-time updates through WebSocket connections and provides responsive design with mobile support.

### Backend Architecture

The backend follows an Express.js REST API pattern with WebSocket support:

- **Runtime**: Node.js with TypeScript and ESM modules
- **Web Framework**: Express.js for HTTP API endpoints
- **Real-time Communication**: WebSocket Server for live updates and notifications
- **Data Layer**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Service Layer**: Dedicated services for network tools (ping, traceroute, port scanning) using system commands
- **Storage Pattern**: Interface-based storage abstraction with both in-memory and database implementations

The backend is designed to handle concurrent network monitoring tasks and provide real-time updates to connected clients.

### Database Design

Uses PostgreSQL with Drizzle ORM for type-safe database operations:

- **Network Devices**: Device inventory with status tracking, performance metrics, and location data
- **Network Statistics**: Time-series data for performance monitoring (bandwidth, latency, packet loss)
- **Alerts**: Alert management system with severity levels and resolution tracking
- **Raspberry Pi Nodes**: Remote monitoring nodes with heartbeat and system metrics

The schema is designed for scalability with proper indexing and relationships between entities.

### Authentication & Authorization

Currently implements a simplified auth system:
- Session-based authentication using PostgreSQL session store
- No user management system implemented (likely single-admin or development setup)
- Future extensibility for role-based access control

### Real-time Architecture

WebSocket implementation for live updates:
- Bidirectional communication between client and server
- Event-driven updates for device status changes, new alerts, and performance metrics
- Automatic reconnection and error handling on the client side

## External Dependencies

### Database Services
- **PostgreSQL**: Primary database using Neon Database serverless PostgreSQL
- **Drizzle ORM**: Type-safe database toolkit with automatic migration support

### UI Libraries
- **Radix UI**: Comprehensive set of low-level UI primitives for accessibility and customization
- **shadcn/ui**: Modern component library built on top of Radix UI with Tailwind CSS
- **Recharts**: React charting library for data visualization and performance graphs
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **Vite**: Fast build tool with HMR support and optimized bundling
- **TanStack Query**: Powerful data synchronization for React applications
- **Zod**: TypeScript-first schema validation library
- **ESBuild**: Fast JavaScript bundler for production builds

### System Integration
- **Network Tools**: System-level ping, traceroute, and port scanning capabilities
- **Raspberry Pi Integration**: Remote monitoring agent support for distributed network monitoring
- **Font Integration**: Google Fonts integration with Inter, Fira Code, and other developer-friendly fonts

The application is architected for deployment on platforms like Replit with built-in development tools and hot reloading support.