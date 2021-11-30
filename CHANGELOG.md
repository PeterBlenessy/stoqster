# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]


## [0.5.0] - 2021-11-30
- Added CHANGELOG.md file to keep documented track of changes.
- Added automatic inclusion of package version when creating draft release on GitHub.
- Added chained scripts in package.json - release:mac and release:all - to create draft release, build and upload artefacts, and publish release to stoqster-releases.


## [0.4.4] - 2021-11-28
- Added components for company holdings and events.
- Added quick fix on axios status code 500. Needs better solution in all components.
- Fixed selected row background transparency making text looking lighter.

## [0.4.3] - 2021-11-25
- Fixed AutoUpdate not updating from private repo by publishing with public repo stockster-releases only containing releases.
- Added electron-log to provide for propper logging in main.

## [0.4.2] - 2021-11-25
- Added some minor changes to test auto update support.

## [0.4.1] - 2021-11-25
- Added electron-builder-notarize to support notarization on Mac.
- Added electron auto updater support.

## [0.4.0] - 2021-11-25
- Added Notify plugin. App now notifies if something goeas wrong during refresh in all components.
- Added caching of latest successful refresh for all components.
- In case of an error, these values are  restored so a network error does not disturb app offline functionality.
- Added alert trigger check for registered alerts. When an alert is triggered, a notofication is fired.

## [0.3.0] - 2021-11-21
- Added Vuex store to components along with persistent storage to localStorage. State is stored for dark mode, router path, watchlist and alerts.
- Removed store files added by Quasar CLI when setting up project (may add these back later if needed).
- Adopted Composition API for components.

## [0.2.0] - 2021-11-16
- Added CAlertDialog.vue to handle adding/deleting/updating alerts for companies with default settings. 
- Aligned components more with Composition API.
- Added support on dashbard to check if alert exists to change icon.

## [0.2.0] - 2021-11-11
- Added tooltip to action buttons on dasboard cards.
- Changed pressing trashcan button on card now removes the card from the dashboard and updates the watchlist in localStorage.
- Added new requests to ibindexAPI.

## [0.2.0] - 2021-11-10
- Fixed lagging expansion of cards on dashboard.
- Fixed request url for companies with special urls, e.g. Spiltan.

## [0.2.0] - 2021-11-09
- Added card expansion on dasboard to show rebate/premium over time. Implemented in new component CIbindexRebatePremium.vue

## [0.2.1] - 2021-11-08
- Changed minimum width and heigth of the application window, hopefully for better UX.

## [0.2.0] - 2021-11-07
- Fixed issue occurring at first start when no watchlist is set in local storage blocking the selected rows logic and calling foreach on object with null value.
- Changed dashboard to list only calculated net asset value.
- Changed row expansion logic.
- Changed watchlist logic and details.
- Changed coding style to using ';' at the end of lines.
- Added more comments to code, both to html and js.

## [0.1.0] - 2021-11-03
- Cleaned up application drawer (will need more refactoring).
- Added first iteration of dashboard.

## [0.0.2] - 2021-11-01
- Removed: Vetur related VSCode extension related configs. 
- Added lint rules: vue3-strongly-recommended.
- Changed icon files.
- Added new build targets: linux (deb and tar.gz) and windows (portable).

## [0.0.1] - 2021-10-31
- First commit to github of Stoqster

# Changelog format guideline

## [MAJOR.MINOR.PATCH] - YYYY-MM-DD

- Added new features.
- Changed existing functionality.
- Deprecated soon-to-be removed features.
- Removed features.
- Fixed bugs.
- Security in case of vulnerabilities.