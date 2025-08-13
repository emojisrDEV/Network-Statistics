# NetMonitor Pro

## Overview

NetMonitor Pro is a comprehensive network monitoring and management application built as a full-stack TypeScript solution. The system provides real-time monitoring of network devices, Raspberry Pi nodes, and network statistics with features including device discovery, performance analytics, alert management, and network diagnostic tools. The application serves as a centralized dashboard for network administrators to monitor, analyze, and maintain their network infrastructure.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend uses server-side rendered HTML templates with modern styling and JavaScript:

- **Template Engine**: Jinja2 templates with HTML5 and responsive design
- **Styling**: Tailwind CSS with custom CSS variables for dark theme, Lucide icons for consistent iconography
- **Charts**: Chart.js for real-time data visualization and network statistics
- **Real-time Updates**: JavaScript fetch API with auto-refresh for live dashboard updates
- **Responsive Design**: Mobile-first approach with grid layouts and responsive components

The frontend provides the same layout and functionality as the original React version but with simpler server-side rendering.

### Backend Architecture

The backend is built with Python Flask for simplicity and reliability:

- **Runtime**: Python 3.11 with Flask web framework
- **Data Layer**: SQLite database for lightweight, embedded storage with automatic schema creation
- **System Monitoring**: psutil library for accurate host system statistics (CPU, memory, disk, network interfaces)
- **Network Tools**: Built-in ping functionality and network device discovery
- **Monitoring Loop**: Background threading for continuous network monitoring and statistics collection
- **Dual Monitoring**: Raspberry Pi nodes when available, automatic fallback to host-based monitoring

The Python backend provides better system integration and more reliable host monitoring capabilities.

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