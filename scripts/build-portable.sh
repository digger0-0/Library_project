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
# Use a Node LTS whose macOS minimum is well below the target OS.
# v25+ requires macOS 13.5+; Node 22 LTS supports macOS 10.15+.
NODE_VERSION="v22.14.0"
OS_NAME="darwin"                # darwin | win | linux
ARCH="arm64"                    # arm64 | x64
NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${OS_NAME}-${ARCH}.tar.gz"
ZIP_NAME="LibraryProject-portable.zip"

# --- helpers ----------------------------------------------------------------
info() { printf "\n\033[1;34m==>\033[0m %s\n" "$1"; }
fail() { printf "\033[1;31mERROR:\033[0m %s\n" "$1"; exit 1; }

# --- paths ------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST="$PROJECT_DIR/dist"
# Isolated working copy — the real project is never touched.
# IMPORTANT: keep the stage OUTSIDE the project tree. A stage nested under the
# project (e.g. dist/stage) makes Next.js emit a broken standalone output
# (native modules like better-sqlite3 get dropped from node_modules).
STAGE="${TMPDIR:-/tmp}/library-project-build"

# --- 0. sanity --------------------------------------------------------------
[ -f "$PROJECT_DIR/package.json" ] || fail "Run this from the project root"
command -v npm >/dev/null 2>&1 || fail "npm not found (host needs a Node/npm to bootstrap)"

# --- 1. portable node (download first, drive the whole build with it) ---------
info "Fetching portable Node ${NODE_VERSION} (${OS_NAME}-${ARCH})"
rm -rf "$DIST"
mkdir -p "$DIST"
if [ ! -f "$DIST/node-${NODE_VERSION}-${OS_NAME}-${ARCH}.tar.gz" ]; then
  curl -fsSL "$NODE_URL" -o "$DIST/node-${NODE_VERSION}-${OS_NAME}-${ARCH}.tar.gz" \
    || fail "Could not download Node from $NODE_URL"
fi
tar -xzf "$DIST/node-${NODE_VERSION}-${OS_NAME}-${ARCH}.tar.gz" -C "$DIST"
mv "$DIST/node-${NODE_VERSION}-${OS_NAME}-${ARCH}" "$DIST/node"

NODE="$DIST/node/bin/node"
NPM="$DIST/node/bin/npm"
# CRITICAL: the bundled `npm` shim starts with `#!/usr/bin/env node`, so running
# it directly picks up whatever `node` is in PATH (the host Node 25!) — which
# makes prebuild-install compile better-sqlite3 for the WRONG ABI. Prepend the
# bundled Node's bin dir so EVERY child process (npm, node-gyp, prebuild) uses
# the bundled Node 22.
export PATH="$DIST/node/bin:$PATH"
info "Using $( "$NODE" -v ) for the build (host node: $(command -v node))"

# --- 2. stage a fresh copy of the project -------------------------------------
# Build in an isolated copy so the dev environment (installed under the host
# Node) is never touched. A FRESH `npm install` under portable Node 22 is what
# makes better_sqlite3 compile/download for the Node 22 ABI (127) — otherwise
# the native module stays built for the host Node's ABI and crashes on launch.
info "Staging project copy (source only, no node_modules/.next/dist)"
rm -rf "$STAGE"
mkdir -p "$STAGE"
tar --exclude='./node_modules' --exclude='./.next' --exclude='./dist' \
    --exclude='./.git' --exclude='./.DS_Store' --exclude='./library.db*' \
    -cf - -C "$PROJECT_DIR" . | tar -xf - -C "$STAGE"

# --- 3. install deps in the stage under portable Node -------------------------
info "Installing dependencies under portable Node (fresh, correct ABI)"
cd "$STAGE"
"$NPM" install || fail "npm install failed"

# --- 4. setup database (idempotent) ------------------------------------------
info "Running initial setup (tables + seed data + admin/demo users)"
"$NPM" run setup

# --- 5. build standalone ------------------------------------------------------
info "Building Next.js standalone output"
"$NPM" run build
[ -d .next/standalone ] || fail "Standalone output not found (check output: 'standalone' in next.config.ts)"

# --- 5. assemble app folder ---------------------------------------------------
info "Assembling app bundle"
mkdir -p "$DIST/app"

# NOTE: use source with trailing "/." so dot-prefixed entries (like .next)
# are included — a bare glob "*" skips them.
cp -R .next/standalone/. "$DIST/app/"
[ -d .next/static ] && mkdir -p "$DIST/app/.next/static" && cp -R .next/static/. "$DIST/app/.next/static/"
[ -d public ] && cp -R public/. "$DIST/app/public/"

# Compile the setup script into a single JS bundle and ship it.
# The bundled server will run it on first launch to create the DB
# (admin + demo data) ON THE TARGET MACHINE — not a build-time snapshot.
info "Compiling setup script"
"$NPM" run build:setup
cp dist/setup.cjs "$DIST/app/setup.js"

# Remove any DB baked in by output tracing — setup.js creates it fresh on
# first launch, so the shipped build is always "initial state".
rm -f "$DIST/app/library.db" "$DIST/app/library.db-shm" "$DIST/app/library.db-wal"

# Ship a clean release: strip dev logs and any non-demo ebook files.
# setup.js recreates the demo ebooks (incl. the long progress-demo book) on
# the target machine's first launch, so nothing valuable is lost.
rm -rf "$DIST/app/logs"
if [ -d "$DIST/app/assets/ebooks" ]; then
  find "$DIST/app/assets/ebooks" -type f ! -name 'demo-*.txt' -delete
fi

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

# --- 6. zip --------------------------------------------------------------------
info "Creating $ZIP_NAME"
cd "$DIST"
rm -f "$ZIP_NAME"
zip -rq "$ZIP_NAME" node app start.sh

echo
echo "Done! Your portable build is at: dist/$ZIP_NAME"
echo "To run on a macOS ${ARCH} machine: unzip, then ./start.sh"
echo "Bundled Node ${NODE_VERSION} (macOS 10.15+) — compatible with macOS 13 Ventura"
