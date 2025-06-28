# Stoqster

**A comprehensive desktop application for tracking Swedish investment companies and funds**

Stoqster is a Tauri-based desktop application that provides detailed information about Swedish investment companies (investmentbolag), real estate companies, and funds. Built with Vue 3 and Quasar UI, it offers real-time data, portfolio tracking, and comprehensive analytics for Swedish financial markets.

## 🚀 Key Features

### Investment Company Tracking
- [x] **IBIndex Integration**: Complete data from Swedish investment companies
- [x] **Real Estate Companies**: Information from FBIndex for real estate investments  
- [x] **Fund Holdings**: Quarterly fund data from Finansinspektionen (FI)
- [x] **Company Details**: Holdings, events, performance metrics, and rebate/premium calculations

### Portfolio & Watchlist Management
- [x] **Custom Watchlists**: Track your favorite companies and funds
- [x] **Performance Monitoring**: Real-time performance tracking and alerts
- [x] **Smart Alerts**: Notifications when values cross 30-day averages
- [x] **Dashboard**: Personalized dashboard with key metrics and trends

### User Experience
- [x] **Dark/Light Mode**: Customizable themes for comfortable viewing
- [x] **Swedish Interface**: Native Swedish language support
- [x] **Automatic Updates**: Built-in update system with scheduled installations
- [x] **Persistent Settings**: Your preferences and data sync across sessions
- [x] **Responsive Design**: Optimized for desktop with filtering and sorting

## 📚 Documentation

Comprehensive documentation is available in the [docs/](docs/) directory:

- **[Architecture Guide](docs/architecture.md)** - Technical architecture and design decisions
- **[Development Guide](docs/development.md)** - Setup, coding standards, and contribution guidelines  
- **[API Integrations](docs/api-integrations.md)** - External API documentation and usage
- **[Use Cases](docs/use-cases.md)** - Detailed application features and functionality
- **[Project Roadmap](docs/roadmap.md)** - Planned features and development timeline
- **[Feature Planning](docs/feature-planning.md)** - Development process and planning framework

## 🏗️ Technology Stack

- **Frontend**: Vue 3 (Composition API) + Quasar UI Framework
- **Backend**: Tauri v2 with Rust
- **Build Tool**: Vite with hot reloading
- **State Management**: Pinia stores with LocalForage persistence
- **APIs**: IBIndex, FBIndex, and Finansinspektionen integration

## 📊 Data Sources

Stoqster aggregates data from official Swedish financial sources:

- **[IBIndex](https://ibindex.se)** - Investment companies data and analytics
- **[FBIndex](https://www.fbindex.se)** - Real estate investment companies  
- **[Finansinspektionen](https://www.fi.se/sv/vara-register/fondinnehav-per-kvartal/)** - Official fund holdings (quarterly)

All data is sourced from publicly available APIs and maintained with proper attribution.

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- Rust (latest stable)
- Yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/PeterBlenessy/stoqster.git
cd stoqster

# Install dependencies
yarn install

# Start development server
yarn tauri dev
```

### Building for Production
```bash
# Build the application
yarn tauri build
```

For detailed setup instructions, see the [Development Guide](docs/development.md).

## 🛠️ Development

### Project Structure
```
src/
├── api/           # External API integrations (IBIndex, FBIndex, FI)
├── components/    # Reusable Vue components
├── composables/   # Business logic and utilities  
├── stores/        # Pinia state management
├── pages/         # Route-level components
└── layouts/       # Application layouts

docs/              # Project documentation
src-tauri/         # Rust backend code
```

### Contributing

We welcome contributions! Please see our [Development Guide](docs/development.md) for:
- Coding standards and patterns
- Testing guidelines  
- Pull request process
- Development environment setup

### Key Development Principles
- **Swedish UI**: All user-facing text in Swedish
- **Composition API**: Vue 3 with `<script setup>` syntax
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Performance**: Efficient caching and data management
- **Accessibility**: Following WCAG guidelines

## 📝 Release Process

### Manual Steps Required
```bash
# 1. Update version in package.json
# 2. Update CHANGELOG.md following the existing pattern
# 3. Test thoroughly: yarn tauri build
# 4. Create release
yarn cicd
```

This process requires manual preparation:
- **CHANGELOG.md** must be manually updated with version details
- **package.json** version must be bumped manually
- Based on the version in package.json, `yarn cicd` parses changes from CHANGELOG.md
- Creates a draft GitHub release with version tag and extracted changes as description  
- The application gets built using the GitHub workflow triggered by the new release
- Finally publishes the release automatically

For detailed release instructions, see the [Development Guide](docs/development.md#release-process).

## 🔧 Maintenance

### Keeping Dependencies Updated

#### Frontend Dependencies
```bash
yarn outdated      # Check for updates
yarn upgrade --latest
```

#### Backend Dependencies  
```bash
cd src-tauri
cargo outdated     # Check for updates  
cargo update
```

#### Development Environment (macOS)
```bash
rustup check      # Check Rust toolchain
rustup update stable

brew update       # Update Node.js
brew upgrade node

# If you get an error about Node.js version:
# Ensure you have the correct version installed
# For example, if you need Node.js 22:
brew install node@22 && brew link --overwrite --force node@22

# Add Node.js 22 to PATH
# This is necessary if you have multiple Node.js versions installed
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
```

## 📊 Project Status

- **Current Version**: See [package.json](package.json) version field
- **Development Status**: Active
- **Platform Support**: macOS, Windows, Linux
- **License**: [Add License Info]

### Recent Updates
- ✅ Centralized API request handling
- ✅ Enhanced error handling and logging
- ✅ Automatic update system
- ✅ Improved data caching and performance

See [CHANGELOG.md](CHANGELOG.md) for complete version history and [docs/roadmap.md](docs/roadmap.md) for planned features.

## 🤝 Community

### Getting Help
- 📖 Check the [documentation](docs/) 
- 🐛 Report bugs via [GitHub Issues](https://github.com/PeterBlenessy/stoqster/issues)
- 💡 Request features via [GitHub Discussions](https://github.com/PeterBlenessy/stoqster/discussions)

### Contributing
- 🔧 See [Development Guide](docs/development.md) for technical details
- 📋 Check [Feature Planning](docs/feature-planning.md) for development process
- 🗺️ View [Roadmap](docs/roadmap.md) for planned features

## 📜 License

[Add license information here]

---

**Made with ❤️ for the Swedish investment community**