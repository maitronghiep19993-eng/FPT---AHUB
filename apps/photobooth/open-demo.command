#!/bin/sh
set -eu
photobooth_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$photobooth_dir"
photobooth_python=$(command -v python3 || true)
if [ -z "$photobooth_python" ]; then
  echo 'Cần Python 3 để mở bản mẫu qua localhost.'
  exit 1
fi
"$photobooth_python" -m http.server 5214 --bind 127.0.0.1 &
photobooth_pid=$!
trap 'kill "$photobooth_pid" 2>/dev/null || true' EXIT HUP INT TERM
sleep 1
kill -0 "$photobooth_pid" 2>/dev/null || exit 1
if command -v open >/dev/null 2>&1; then open http://127.0.0.1:5214; else echo 'Mở http://127.0.0.1:5214 trong trình duyệt'; fi
wait "$photobooth_pid"
