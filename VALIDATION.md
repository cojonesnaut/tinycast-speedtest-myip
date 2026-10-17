# Network Check validation — 1.3.0

Installed Tinycast Beta runtime tests passed with controlled online, offline/captive-page, and one-provider-failed responses. Verified green/red icon and badge colors, Check Again action, and refresh-timer cleanup on unmount. No live connectivity probe or manual native UI test was performed for this addition. The existing speedtest and IP lookup implementations are unchanged.

# Validation — 1.2.0, 2026-09-10

- A real lookup resolved IP address, reverse-DNS host lookup, remote port, and ISP.
- The built my-ip.js command rendered all four requested fields using the installed Tinycast Beta JavaScript runtime with live HTTP responses supplied by a test host bridge. Copy All IP Details was present.
- Normal lookup made no request to the failing MyIP endpoint and launched no child process.
- Tests passed for field mapping, partial updates, exact-IP ISP lookup, provider failure, fallback IP with unavailable port, missing PTR records, IPv4, compressed IPv6, and IPv4-mapped IPv6.
- Shared speed-test source and invocation are unchanged from the previously verified build.
- Native app UI has not been manually exercised; app settings have not been modified.
