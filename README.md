# Stoqster (stoqster)

Follow your favourite stocks and fonds, and your portfolio's performance

## Install the dependencies
```bash
yarn
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
yarn dev
```

### Lint the files
```bash
yarn run lint
```

### Build the app for production
```bash
quasar build
```

### Customize the configuration
See [Configuring quasar.conf.js](https://quasar.dev/quasar-cli/quasar-conf-js).

### Publishing to GitHub
To be able to publish to github a `GH_TOKEN` needs to be generated and exported as an environment variable.

Read more: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

```bash
export GH_TOKEN=<YOUR-GH-TOKEN>
```
#### Creating a draft release
```bash
gh release create v0.4.1 --draft --title "v0.4.1" --notes "This is an alpha release of Stoqster, now with AutoUpdate support."
```
#### Publish

```bash
quasar build -m electron -T all --publish always
```

### Signing and notarizing Mac OSX app
For signing, notarizing Mac binaries some steps are needed.

To be able to sign for Mac `developer certificates` need to be generated.

Read more: https://www.electron.build/code-signing

To be able to notarize for Mac, `APPLE_ID` and `APPLE_ID_PASSWORD` need to be set.

Read more: https://github.com/karaggeorge/electron-builder-notarize


In case notarization fails due to `Error: Failed to upload app to Apple's notarization servers`:
```bash
sudo xcode-select -r
```

### Keeping packages up to date
```bash
yarn outdated
yarn upgrade
```

