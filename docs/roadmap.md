# Project Roadmap

This document outlines the planned features and improvements for Stoqster, organized by priority and development phases.

## Current Version: v1.6.2

### Recently Completed
- ✅ Centralized API request handling through useApiRequest composable
- ✅ Automatic ISO-8859-1 encoding detection for FBI APIs
- ✅ Robust timestamp-based cache invalidation system
- ✅ Enhanced debugging with emoji-based logging
- ✅ Tauri updater integration with automatic updates
- ✅ Window state persistence
- ✅ Settings dialog with user preferences

## Major Features (High Priority)

### Portfolio and Account Integration
- [ ] **Avanza Account Connection**
  - Connect to Avanza API for real-time portfolio data
  - Import holdings and transactions automatically
  - Display portfolio performance alongside market data
  - Enable portfolio-based watchlists and alerts

- [ ] **Manual Portfolio Management**
  - Create and manage custom portfolios manually
  - Track individual holdings and performance
  - Portfolio analytics and reporting
  - Export/import portfolio data

- [ ] **Fund Manager Information**
  - Add comprehensive fund manager details
  - Manager performance history and statistics
  - Manager comparison features
  - Integration with fund data

### Real-time Data Enhancement
- [ ] **Latest Price Information**
  - Real-time price feeds for funds and holdings
  - Price alerts and notifications
  - Historical price charts and trends
  - Price change indicators and analytics

- [ ] **Advanced Market Data**
  - Real estate companies data integration
  - Publicly listed companies information
  - Market indexes and their holdings
  - Sector and industry analysis

### Database and Architecture
- [ ] **Database Version Management**
  - Handle database schema changes during app upgrades
  - Migration scripts for data compatibility
  - Backup and restore functionality
  - Data integrity validation

## Minor Features (Medium Priority)

### User Experience Improvements
- [ ] **Enhanced Component Architecture**
  - Refactor components into composables for better reusability
  - Move fetch operations to Pinia store layer
  - Improve component performance and maintainability
  - Better separation of concerns

- [ ] **Table and UI Enhancements**
  - Selectable rows in fund holdings tables
  - Improved table sorting and filtering
  - Better column management and customization
  - Enhanced responsive design

- [ ] **Application Configuration**
  - Advanced user settings and preferences
  - Application configuration management
  - Theme customization options
  - Keyboard shortcuts configuration

### Data and Analytics Features
- [ ] **Historical Data**
  - Historical rebate/premium data in expanded rows
  - Trend analysis and charts
  - Performance comparison tools
  - Data export capabilities

- [ ] **Release Notes Integration**
  - Display release notes within the application
  - Update changelog presentation
  - Feature announcement system
  - User notification for new features

## Patch Features (Lower Priority)

### Developer Experience
- [ ] **Development Tooling**
  - Migrate from Yarn v1 to Yarn v2
  - Improve build and development scripts
  - Enhanced linting and code quality tools
  - Automated testing infrastructure

- [ ] **Documentation and Maintenance**
  - API documentation improvements
  - Code documentation and comments
  - Performance optimization guidelines
  - Security best practices documentation

## Immediate Technical Priorities (Next Release)

### Storage Architecture Compliance Review
- [ ] **Codebase Storage Pattern Audit**
  - Review all stores, components, and composables for localStorage vs IndexedDB compliance
  - Migrate settings and UI state to localStorage pattern
  - Ensure consistent storage key naming conventions
  - Update watchers to use synchronous persistence for UI state
  - Verify large datasets properly use IndexedDB
  - Document any exceptions or special cases

### API Integration Improvements
- [ ] **Enhanced Error Handling**
  - Implement retry mechanisms with exponential backoff
  - Better connection state management
  - Graceful degradation when APIs are unavailable
  - User-friendly error messages in Swedish

### Performance Optimization
- [ ] **Bundle Size Optimization**
  - Analyze and reduce JavaScript bundle size
  - Implement code splitting for better loading performance
  - Optimize image and asset delivery
  - Consider Web Workers for heavy processing tasks

## Future Considerations

### Technical Debt and Modernization
- [ ] **TypeScript Migration**
  - Gradual migration to TypeScript for better type safety
  - Type definitions for API responses
  - Enhanced IDE support and developer experience

- [ ] **Testing Infrastructure**
  - Unit testing for composables and utilities
  - Integration testing for API services
  - E2E testing for critical user flows
  - Automated testing in CI/CD pipeline

- [ ] **Performance Optimization**
  - Web Workers for heavy data processing
  - Virtual scrolling for large datasets
  - Lazy loading and code splitting
  - Memory usage optimization

### Platform and Deployment
- [ ] **Multi-platform Support**
  - Linux distribution optimization
  - Windows packaging improvements
  - macOS notarization and signing
  - Auto-update testing across platforms

- [ ] **Cloud Integration**
  - Cloud-based settings synchronization
  - Remote data backup and restore
  - Cross-device portfolio sync
  - Cloud-based analytics

## Development Phases

### Phase 1: Foundation (Q1 2025)
**Focus**: Infrastructure and core improvements
- Database version management
- Enhanced component architecture
- Improved testing infrastructure
- TypeScript migration planning

**Estimated Duration**: 2-3 months
**Key Deliverables**:
- Robust database migration system
- Refactored component architecture
- Basic testing infrastructure
- Migration roadmap to TypeScript

### Phase 2: Data Enhancement (Q2 2025)
**Focus**: Real-time data and advanced features
- Latest price information integration
- Fund manager data enhancement
- Real estate companies integration
- Advanced market data features

**Estimated Duration**: 3-4 months
**Key Deliverables**:
- Real-time price feeds
- Comprehensive fund manager information
- Extended market data coverage
- Performance analytics

### Phase 3: Portfolio Management (Q3 2025)
**Focus**: Portfolio and account features
- Avanza account integration
- Manual portfolio management
- Portfolio analytics and reporting
- Advanced user preferences

**Estimated Duration**: 3-4 months
**Key Deliverables**:
- Avanza API integration
- Portfolio management system
- Advanced analytics dashboard
- Enhanced user experience

### Phase 4: Polish and Optimization (Q4 2025)
**Focus**: Performance and user experience
- Performance optimization
- UI/UX improvements
- Advanced features refinement
- Platform-specific enhancements

**Estimated Duration**: 2-3 months
**Key Deliverables**:
- Optimized performance
- Polished user interface
- Platform-specific features
- Production-ready release

## Risk Assessment and Mitigation

### Technical Risks
- **API Changes**: External APIs may change without notice
  - *Mitigation*: Implement robust error handling and fallback mechanisms
- **Performance Issues**: Large datasets may impact application performance
  - *Mitigation*: Implement virtualization and lazy loading
- **Platform Compatibility**: Tauri updates may break existing functionality
  - *Mitigation*: Maintain compatibility testing and gradual upgrades

### Business Risks
- **Data Availability**: External data sources may become unavailable
  - *Mitigation*: Diversify data sources and implement caching
- **User Adoption**: New features may not meet user expectations
  - *Mitigation*: User feedback collection and iterative development
- **Maintenance Overhead**: Complex features may increase maintenance burden
  - *Mitigation*: Focus on code quality and documentation

## Success Metrics

### User Engagement
- Daily active users
- Feature adoption rates
- User retention metrics
- Support ticket reduction

### Technical Performance
- Application startup time < 3 seconds
- API response times < 1 second
- Memory usage optimization
- Crash rate < 0.1%

### Development Velocity
- Feature delivery timeline adherence
- Bug resolution time
- Code quality metrics
- Test coverage improvement

## Resource Requirements

### Development Team
- 1-2 Frontend developers (Vue.js/Tauri)
- 1 Backend/API integration specialist
- 1 DevOps/Release engineer (part-time)
- 1 UX/UI designer (part-time)

### Infrastructure
- Development and testing environments
- CI/CD pipeline enhancements
- Code quality and security tools
- Performance monitoring tools

## Community and Feedback

### User Feedback Collection
- In-app feedback system
- GitHub issue tracking
- User surveys and interviews
- Beta testing program

### Community Engagement
- Documentation improvements
- Developer guides and tutorials
- Community forums or discussions
- Open source contribution guidelines

## Conclusion

This roadmap provides a structured approach to Stoqster's continued development, balancing user needs with technical improvements. The phased approach allows for iterative development while maintaining system stability and user satisfaction.

Regular roadmap reviews and updates will ensure alignment with user feedback and changing market conditions. Priority adjustments may be made based on user demand, technical constraints, and resource availability.

For questions or suggestions regarding this roadmap, please create an issue in the project repository or contact the development team.