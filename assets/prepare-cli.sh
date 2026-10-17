#!/bin/sh
set -eu
root="$1/ookla-1.2.0"
cli="$root/speedtest"
if [ -x "$cli" ]; then
  printf '%s\n' "$cli"
  exit 0
fi
mkdir -p "$root"
staging=$(mktemp -d "$root/setup.XXXXXX")
trap 'rm -rf "$staging"' EXIT HUP INT TERM
/usr/bin/curl --fail --silent --show-error --location --proto '=https' --connect-timeout 10 --max-time 75 --max-filesize 10485760 'https://install.speedtest.net/app/cli/ookla-speedtest-1.2.0-macosx-universal.tgz' -o "$staging/cli.tgz"
actual=$(/usr/bin/shasum -a 256 "$staging/cli.tgz")
actual=${actual%% *}
if [ "$actual" != 'c9f8192149ebc88f8699998cecab1ce144144045907ece6f53cf50877f4de66f' ]; then
  echo 'Speedtest download failed checksum verification. Please try again.' >&2
  exit 1
fi
/usr/bin/tar -xzf "$staging/cli.tgz" -C "$staging" speedtest
chmod 755 "$staging/speedtest"
mv "$staging/speedtest" "$cli"
printf '%s\n' "$cli"
