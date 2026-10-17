# Speedtest + MyIP for Tinycast — 1.3.0

Three independent commands in one importable extension:

- **Speedtest** measures download, upload, latency, jitter, packet loss, ISP, and server details using Ookla. It never calls MyIP.
- **My IP Lookup** shows IP address, host, remote port, ISP, and country. It never runs Speedtest or a shell process. Press Enter to copy the IP, or to retry after an error. ⌘R refreshes.

## Network Check

Open **Network Check** from Tinycast. A green icon and Online badge indicate internet access; a red icon and Offline badge indicate that connectivity checks failed. The initial check is neutral while pending. It refreshes every 15 seconds while the view is open; press Enter or ⌘R to check immediately. Closing the view stops automatic refresh.

Two HTTPS probes (Apple and Microsoft) run in parallel with a six-second timeout. Either valid response is sufficient for green status. Unexpected login-page content is not accepted as success. This checks internet reachability, not merely whether Wi-Fi is enabled: captive portals, firewalls, or blocked probes can produce red status even when a local network is connected. Icons and badges carry the color; the standard Tinycast selection background is unchanged.

## Install or update

Unzip `speedtest-myip-tinycast.zip`. Open Tinycast Settings → Extensions → Install → Add Folder and select the `speedtest-myip` folder containing `package.json`. Replace the existing extension if prompted. If Tinycast does not offer replacement, remove the old Speedtest + MyIP entry first and add this folder again.

No API key, npm, Node.js, or Homebrew is needed to use the extension.

## IP lookup behavior

My IP Lookup displays **IP Address**, **Host**, **Remote Port**, **ISP**, and country. The old MyIP-only lookup was blocked by upstream HTTP 522 errors. The normal path now uses:

- ifconfig.me for the IP and the remote port reported for that same request.
- ipwho.is for the ISP and country of that exact IP.
- Google Public DNS over HTTPS for the IP's reverse-DNS (PTR) hostname.

The IP appears immediately while host and ISP details load. No reverse DNS record is shown explicitly when a PTR record does not exist. A failed enrichment does not hide the IP. The remote port is the port reported by ifconfig.me for that connection; it can change on every refresh and may reflect a proxy or NAT. It is not a permanent device property, a listening port, or a value from a speed test.

If ifconfig.me fails, ipwho.is supplies the public IP; MyIP.com is a final fallback. Remote Port is marked Unavailable if the connection endpoint cannot report it; no port is guessed or borrowed from a different request. Each request has a 10-second UI timeout. Native HTTP requests may finish in the background after a timeout. Refresh with ⌘R. Copy Value copies the selected field; Copy All IP Details includes all displayed fields.

Services used: https://ifconfig.me/ · https://ipwhois.io/documentation · https://developers.google.com/speed/public-dns/docs/doh/json

## Speedtest behavior

Press Enter on Run Speedtest to start. First use downloads the official Ookla 1.2.0 universal macOS CLI and verifies its pinned SHA-256 checksum. Starting a test accepts Ookla's license/privacy terms, linked in the action menu. Tests transfer network data and have a 180-second process timeout.

Native rows show final measurements and a busy indicator; no streaming speedometer. Closing the command may leave the process running until it completes or times out. Results are not saved to history.

## Source

`src/speedtest.js` and `src/my-ip.js` define separate command functions. `src/common.js` contains shared formatting and parsing helpers. Run `node build.cjs` to rebuild both standalone command files after editing.

Inspired by Michael Aigner (tonka3000) and contributors' Raycast extension: https://www.raycast.com/tonka3000/speedtest

MyIP data attribution and API documentation: https://www.myip.com/api-docs/

Ookla CLI version/checksum reference: https://github.com/raycast/extensions/tree/main/extensions/speedtest

Ookla terms: https://www.speedtest.net/about/eula and https://www.speedtest.net/about/privacy

This is an independent Tinycast implementation. The Ookla executable is downloaded on demand, not redistributed in this archive. Extension code is MIT licensed.
