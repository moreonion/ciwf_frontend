# ciwf_assets

This repository is used to pre-compile the assets (js, css, image files) for
`ciwf_formtool`. It’s intended to be used for development, the production ready
files can then be copied into the formtool app for release.

## Getting started

Make sure you have `nodejs` and `yarn` installed.
Run `yarn install` to install the packages.

## Development

Add all your stuff in the `src` folder.
Import all js dependencies in `main.js`.
Import all stylesheets in `scss/styles.scss`.

To compile development assets, run `yarn dev`.

Or watch the files with `yarn watch`.

## Production

For production-ready assets, run `yarn prod`.
