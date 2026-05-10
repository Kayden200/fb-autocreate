#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
# This command tells Render to install the necessary Chrome dependencies
# so Puppeteer can run in the cloud.
# (Note: Render's environment usually handles this, but this script ensures it)
