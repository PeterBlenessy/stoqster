# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [BACKLOG]
- Refactoring: removed dependency to axios and migrated components to use fetch() instead.
- Refactoring: cleaned up electron-preload.js and electron-main.js from axios code.
- New feature: sorting in ibindex components.
- New feature: adjust number of rows based on window height.
- Fix: handle dB version change when app is upgraded.

## [IN-PROGRESS]

## [UNRELEASED]

## v0.5.8 - 2022-01-31
- Fix: column format and sorting in fund holdings table
- Fix: removed currency symbol in currency columns as it is not always SEK.
- Fix: negative numbers are now red in the "likvida medel" column.

## v0.5.7 - 2022-01-31
- Removed yarn.lock from version control and added it to .gitignore.
- Upgraded electron-builder@^22.14.5 & electron-builder-notarize@^1.4.0 to fix Apple notarization issue.
- Upgraded quasar, quasar/cli and quasar/app to latest.
- Added vue@^3.0.0 and vue-router@^4.0.0

## v0.5.6 - 2022-01-31
- New feature: add ComponentFundHoldings component to list the holdings of a fund, and show it in the expanded row of a fund.

## v0.5.5 - 2022-01-28
- Fixed bug: sorting of columns in fund listing was based on string value, not floating number.
- New feature: selectable columns in table in ComponentFunds component.
- New feature: expand fund table row when clicked, and list fund holdings.

## v0.5.4 - 2022-01-28
- Changed webPreferences.webSecurity: false, so fetch() can be used from the renderer process.
- Added new component: ComponentFunds.vue that will handle listing of fund information from Finansinspektionen webpage.
- Added API: fiAPI.js - holds objects for Finansinspektionen inofficial API
- Added dependency: unzip - to be able to unpack zip files downloaded from Finansinspektionen
- Added dependency: x2js - to be able to convert XML files from the downloaded zip to JSON objects.
- Added dependency: localforage - to be able to use IndexedDB with a simple(r) API.
- Moved API: ibindexAPI.js up one folder and removed ibindex folder from api folder.

## v0.5.3 - 2022-01-17
- Upgraded Electron to v16.0.7.
- Removed not-implemented fetch-request from preload.js.

## v0.5.2 - 2021-12-03
- Added package.json script - git:push - to do add, commit and push changes.
- Added package.json script - cicd - push changes, build and publish artefacts, and create release in private repo.

## v0.5.1 - 2021-12-03
- Added scripts - release:private and release:public - to extract relevant release notes from CHANGELOG.md and pass it to gh create release release-notes to the private and to teh public repo respectively.

## v0.5.0 - 2021-11-30
- Added CHANGELOG.md file to keep documented track of changes.
- Added automatic inclusion of package version when creating draft release on GitHub.
- Added chained scripts in package.json - release:mac and release:all - to create draft release, build and upload artefacts, and publish release to stoqster-releases.

## v0.4.4 - 2021-11-28
- Added components for company holdings and events.
- Added quick fix on axios status code 500. Needs better solution in all components.
- Fixed selected row background transparency making text looking lighter.

## v0.4.3 - 2021-11-25
- Fixed AutoUpdate not updating from private repo by publishing with public repo stockster-releases only containing releases.
- Added electron-log to provide for propper logging in main.

## v0.4.2 - 2021-11-25
- Added some minor changes to test auto update support.

## v0.4.1 - 2021-11-25
- Added electron-builder-notarize to support notarization on Mac.
- Added electron auto updater support.

## v0.4.0 - 2021-11-25
- Added Notify plugin. App now notifies if something goeas wrong during refresh in all components.
- Added caching of latest successful refresh for all components.
- In case of an error, these values are  restored so a network error does not disturb app offline functionality.
- Added alert trigger check for registered alerts. When an alert is triggered, a notofication is fired.

## v0.3.0 - 2021-11-21
- Added Vuex store to components along with persistent storage to localStorage. State is stored for dark mode, router path, watchlist and alerts.
- Removed store files added by Quasar CLI when setting up project (may add these back later if needed).
- Adopted Composition API for components.

## v0.2.0 - 2021-11-16
- Added CAlertDialog.vue to handle adding/deleting/updating alerts for companies with default settings. 
- Aligned components more with Composition API.
- Added support on dashbard to check if alert exists to change icon.

## v0.2.0 - 2021-11-11
- Added tooltip to action buttons on dasboard cards.
- Changed pressing trashcan button on card now removes the card from the dashboard and updates the watchlist in localStorage.
- Added new requests to ibindexAPI.

## v0.2.0 - 2021-11-10
- Fixed lagging expansion of cards on dashboard.
- Fixed request url for companies with special urls, e.g. Spiltan.

## v0.2.0 - 2021-11-09
- Added card expansion on dasboard to show rebate/premium over time. Implemented in new component CIbindexRebatePremium.vue

## v0.2.1 - 2021-11-08
- Changed minimum width and heigth of the application window, hopefully for better UX.

## v0.2.0 - 2021-11-07
- Fixed issue occurring at first start when no watchlist is set in local storage blocking the selected rows logic and calling foreach on object with null value.
- Changed dashboard to list only calculated net asset value.
- Changed row expansion logic.
- Changed watchlist logic and details.
- Changed coding style to using ';' at the end of lines.
- Added more comments to code, both to html and js.

## v0.1.0 - 2021-11-03
- Cleaned up application drawer (will need more refactoring).
- Added first iteration of dashboard.

## v0.0.2 - 2021-11-01
- Removed: Vetur related VSCode extension related configs. 
- Added lint rules: vue3-strongly-recommended.
- Changed icon files.
- Added new build targets: linux (deb and tar.gz) and windows (portable).

## v0.0.1 - 2021-10-31
- First commit to github of Stoqster

# Changelog format guideline

## vMAJOR.MINOR.PATCH - YYYY-MM-DD

- Added new features.
- Changed existing functionality.
- Deprecated soon-to-be removed features.
- Removed features.
- Fixed bugs.
- Security in case of vulnerabilities.