#!/bin/sh
#
# Build a portable, self-contained zip of the Library Project.
#
# The zip bundles:
#   - a portable Node.js runtime
#   - the Next.js standalone server (incl. better_sqlite3 native module)
#   - all static assets (no CDN / no internet needed at runtime)
#   - the SQLite database
#
# On the target machine (same OS + arch): unzip -> run start.sh -> app is up.
#
set -e

# --- config -----------------------------------------------------------------
NODE_VERSION="v25.5.0"          # must match the Node used to compile better-sqlite3
OS_NAME="darwin"                # darwin | win | linux
ARCH="arm64"                    # arm64 | x64
DIST="dist"
NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${OS_NAME}-${ARCH}.tar.gz"
ZIP_NAME="LibraryProject-portable.zip"

# --- helpers ----------------------------------------------------------------
info() { printf "\n\033[1;34m==>\033[0m %s\n" "$1"; }
fail() { printf "\033[1;31mERROR:\033[0m %s\n" "$1"; exit 1; }

# --- 0. sanity --------------------------------------------------------------
[ -f package.json ] || fail "Run this from the project root"
command -v npm >/dev/null 2>&1 || fail "npm not found"

# --- 1. install deps ---------------------------------------------------------
info "Installing dependencies"
npm install

# --- 2. setup database (idempotent) ------------------------------------------
info "Running initial setup (tables + seed data + admin/demo users)"
npm run setup

# --- 3. build standalone ------------------------------------------------------
info "Building Next.js standalone output"
npm run build
[ -d .next/standalone ] || fail "Standalone output not found (check output: 'standalone' in next.config.ts)"

# --- 4. assemble app folder ---------------------------------------------------
info "Assembling app bundle"
rm -rf "$DIST"
mkdir -p "$DIST/app"

cp -R .next/standalone/. "$DIST/app/"
[ -d .next/static ] && mkdir -p "$DIST/app/.next/static" && cp -R .next/static/. "$DIST/app/.next/static/"
[ -d public ] && cp -R public/. "$DIST/app/public/"

# Compile the setup script into a single JS bundle and ship it.
# The bundled server will run it on first launch to create the DB
# (admin + demo data) ON THE TARGET MACHINE — not a build-time snapshot.
info "Compiling setup script"
npm run build:setup
cp dist/setup.cjs "$DIST/app/setup.js"

# Remove any DB baked in by output tracing — setup.js creates it fresh on
# first launch, so the shipped build is always "initial state".
rm -f "$DIST/app/library.db" "$DIST/app/library.db-shm" "$DIST/app/library.db-wal"

# --- 5. portable node ---------------------------------------------------------
info "Fetching portable Node ${NODE_VERSION} (${OS_NAME}-${ARCH})"
if [ ! -f "$DIST/node-${NODE_VERSION}-${OS_NAME}-${ARCH}.tar.gz" ]; then
  curl -fsSL "$NODE_URL" -o "$DIST/node-${NODE_VERSION}-${OS_NAME}-${ARCH}.tar.gz" \
    || fail "Could not download Node from $NODE_URL"
fi
tar -xzf "$DIST/node-${NODE_VERSION}-${OS_NAME}-${ARCH}.tar.gz" -C "$DIST"
mv "$DIST/node-${NODE_VERSION}-${OS_NAME}-${ARCH}" "$DIST/node"

# --- 6. start script ----------------------------------------------------------
info "Creating start.sh"
cat > "$DIST/start.sh" <<'EOF'
#!/bin/sh
# Start the Library Project. No installs, no internet needed.
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Starting Library Project..."

# cd into app/ so process.cwd() resolves to the bundled directory
# (server finds .next, and db.ts finds library.db next to server.js)
cd "$DIR/app"

# First launch: create the database (tables + admin + demo data)
if [ ! -f library.db ]; then
  echo "First run detected — running initial setup..."
  "$DIR/node/bin/node" setup.js || { echo "Setup failed"; exit 1; }
fi

exec "$DIR/node/bin/node" server.js
EOF
chmod +x "$DIST/start.sh"

# --- 7. zip --------------------------------------------------------------------
info "Creating $ZIP_NAME"
cd "$DIST"
rm -f "$ZIP_NAME"
zip -rq "$ZIP_NAME" node app start.sh

echo
echo "Done! Your portable build is at: dist/$ZIP_NAME"
echo "To run on a macOS ${ARCH} machine: unzip, then ./start.sh"
