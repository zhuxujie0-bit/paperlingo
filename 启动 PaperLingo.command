#!/bin/bash
set -e
cd "$(dirname "$0")"
export PATH="/usr/local/bin:$PATH"
if [ ! -d node_modules ]; then
  npm install
fi
npm run dev
