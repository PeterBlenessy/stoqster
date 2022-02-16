# Changelog
All notable changes to this project will be documented in this file.

## Changelog format guideline
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### vMAJOR.MINOR.PATCH - YYYY-MM-DD

- Added new features.
- Changed existing functionality.
- Deprecated soon-to-be removed features.
- Removed features.
- Fixed bugs.
- Security in case of vulnerabilities.

## [BACKLOG]

- Add: selectable rows in funds holdings tables.

- Change: change from localforage -> Dexie
- Fix: handle dB version change when app is upgraded.

- Fix: refresh does not seem to propagate to child components on ibindex pages
- Fix: dashboard refreshed when alarm trigger is saved and refresh success notification is shown
- Add: Adapt number of table rows to available window size.

- Change yarn from v1 -> v2 (https://yarnpkg.com/getting-started/migration)

### [Low prio]
- Fix: catch and handle fetch() POST errors, e.g., Failed to load resource: the server responded with a status of 500.
- Add: show progress dialog with steps when refreshing FI data. It takes too long. Also, immediate page load takes long time, so dB is not ready.
- Fix: there are dupplicates in the data from FI and we get 605 items when refreshing, vs 600 when loading from dB. Refactor download-import flow?
- Fix table heading of child component in expanded row covers parent component table heading during scrolling.

## [IN-PROGRESS]
- Changed storage backend in vuex from localStorage -> localForage
- Changed state Vuex -> Pine

## v0.5.21 - [UNRELEASED]

## v0.5.20 - 2022-02-15
- Fixed table top/bottom/header background color white also in dark mode.
- Added sticky headers to table in expanded row in ComponentFunds and using 50hv for the table to make it more user friendly.

## v0.5.19 - 2022-02-15
- Changed scoped style in parent components to regular and removed same style setting from child components to fix alternating white/grey background in expanded rows.
- Changed column headers to upper case.
- Added column selection menu in ComponentIbindex.

## v0.5.18 - 2022-02-14
- Changed table headers to be sticky and table to fill entire view port making it also dynamic when app window is resized.
- Removed pagination from ComponentFunds.
- Changed row highlight to be more transparent when hovering.
- Changed width of filter input to 500px, to make it more prominent.
- Changed app window start and minimum width and height.
- Changed indentation to 4 spaces in some files.

## v0.5.17 - 2022-02-14
- Added support for electron-updater events and logging of update steps to console
- Changed (back) mac build target to default (= dmg + zip) from only dmg to fix auto-updater issue caused by zip target being required but excluded in config
- Changed all app and dev dependencies to latest
- Removed store names from localForage boot file.
 
## v0.5.16 - 2022-02-13
- Added import of environment variables from .env file

## v0.5.15 - 2022-02-13
- Fixed typo in successful refresh notification text in CIbindex component.
- Changed name of Ibindex components - add Component prefix instead of just a C.
- Changed name of Ibindex pages - add Page prefix instead of just a P.
- Changed ComponentIbindex and ComponentDashboard components' expand icon to align with ComponentFunds, and add expand_less icon for collapsing the expanded row.
- Changed row expands on click.

## v0.5.14 - 2022-02-13
- Added separate mac build targets for Intel based (x64) and M1 Apple silicon (arm64) macs
- Changed electron-build artifactName med common for all platforms and set to '${productName}-${version}-${os}-${arch}.${ext}'

## v0.5.13 - 2022-02-12
- Added q.notify to FI component ComponentFunds.vue
- Fixed fetch() if url === null. Dirty fix for companies with no events triggering warnings due to status code 500 which cannot be caught for some reason.
- Changed store IBI RebatePremium in IndexedDB.

## v0.5.12 - 2022-02-02
- Fixed error: unable to load preload script: /Users/peter/Development/stoqster/.quasar/electron/electron-preload.js
- Changed - cleaned up arrow functions to increase readability
- Added sorting in ibindex components
- Fixed components in expanded rows get mixed up when sorting due to no unique key set in components. The fix triggers reload of components and affects performance if data not in dB.
- Changed store IBI companies holdings in IndexedDB. Try loading from dB first when refreshing.
- Changed store IBI companies events in IndexedDB. Try loading from dB first when refreshing.
- Changed store IBI companies in IndexedDB. Try loading from dB first when refreshing.

## v0.5.11 - 2022-02-02
- Changed - migrated component to use fetch() - CIbindexCompanyHoldings.vue
- Changed - migrated component to use fetch() - CIbindexCompanyEvents.vue
- Changed - migrated component to use fetch() - CIbindexRebatePremium.vue
- Changed - migrated component to use fetch() - CIbindex.vue
- Changed - migrated component to use fetch() - CDashboard.vue
- Removed axios references from electron-preload.js and electron-main.js
- Changed indentation in the files changed in this commit to 4 spaces

## v0.5.10 - 2022-02-01
- Fixed: keys are not unique in downloaded data causing warnings when sorting columns. Fixed by adding unique index property to rows.

## v0.5.9 - 2022-02-01
- Fixed sorting in "Andel av fondförmögenhet" column in fund holdings table.
- Changed load data code for significant loading time improvement from local storag. From ~4 s -> 100 ms
- Added specific store for general FI stuff, e.g., for storing the zip file url, moved out from fundsStore.

## v0.5.8 - 2022-01-31
- Fixed column format and sorting in fund holdings table
- Fixed currency error - removed currency symbol in currency columns as it is not always SEK.
- Fixed negative numbers are now red in the "likvida medel" column.

## v0.5.7 - 2022-01-31
- Removed yarn.lock from version control and added it to .gitignore.
- Upgraded electron-builder@^22.14.5 & electron-builder-notarize@^1.4.0 to fix Apple notarization issue.
- Upgraded quasar, quasar/cli and quasar/app to latest.
- Added vue@^3.0.0 and vue-router@^4.0.0

## v0.5.6 - 2022-01-31
- Added ComponentFundHoldings component to list the holdings of a fund, and show it in the expanded row of a fund.

## v0.5.5 - 2022-01-28
- Fixed bug: sorting of columns in fund listing was based on string value, not floating number.
- Added selectable columns in table in ComponentFunds component.
- Added expand fund table row when clicked, and list fund holdings.

## v0.5.4 - 2022-01-28
- Changed webPreferences.webSecurity: false, so fetch() can be used from the renderer process.
- Added new component: ComponentFunds.vue that will handle listing of fund information from Finansinspektionen webpage.
- Added API: fiAPI.js - holds objects for Finansinspektionen inofficial API
- Added dependency: unzip - to be able to unpack zip files downloaded from Finansinspektionen
- Added dependency: x2js - to be able to convert XML files from the downloaded zip to JSON objects.
- Added dependency: localforage - to be able to use IndexedDB with a simple(r) API.
- Moved API: ibindexAPI.js up one folder and removed ibindex folder from api folder.

## v0.5.3 - 2022-01-17
- Changed: Upgraded Electron to v16.0.7.
- Removed: not-implemented fetch-request from preload.js.

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
- Cleaned up application drawer (will need more Change).
- Added first iteration of dashboard.

## v0.0.2 - 2021-11-01
- Removed: Vetur related VSCode extension related configs. 
- Added lint rules: vue3-strongly-recommended.
- Changed icon files.
- Added new build targets: linux (deb and tar.gz) and windows (portable).

## v0.0.1 - 2021-10-31
- First commit to github of Stoqster

