# VPN List
A small utility for updating VPN domains on Xiaomi routers.

## Contents
- [Technologies](#technologies)
- [Install & Run](#install--run)

## Technologies
The project uses the following:
- [TypeScript](https://www.typescriptlang.org/)
- [Axios](https://axios-http.com/ru/docs/intro)
- [TSX](https://tsx.is/)

## Install & Run
### Requirements
- [Node.js](https://nodejs.org/) v20+.

### Install
Install dependencies:
```bash
npm install
```
### Configuration
Create a .env file with the following variables:
```dotenv
# Router IP address
ROUTER_IP=192.168.31.1

# Router administrator password
ROUTER_PASSWORD="replace-with-your-router-password"

# Optional: comma-separated HTTP(S) URLs, one domain per line in each list
# Replace OWNER with your GitHub username after publishing the additional list
# DOMAIN_LIST_URLS=https://raw.githubusercontent.com/itdoginfo/allow-domains/refs/heads/main/Russia/inside-raw.lst,https://raw.githubusercontent.com/OWNER/vpn-domains/refs/heads/main/domains.lst
```
See `.env.example` for a configuration template.

Keep the password in your local `.env` only; do not publish it. `.env` is ignored
for new files, but an already tracked `.env` remains tracked. Never include it in
a commit. `ROUTER_AUTH_TOKEN` is no longer used: the utility signs in as `admin`
on each run and keeps the returned token only in memory.

Automatic login follows the known Xiaomi web-page contract: it reads the public
`Encrypt.key` and `deviceId` literals from `/cgi-bin/luci/web` without running its
JavaScript, selects SHA1 or SHA256 from `init_info`, and submits the nonce and
double password hash as form data. An unsupported page format, an invalid
initialization response, or a failed login stops the utility before VPN requests.
Passwords, password hashes, and tokens are not printed. Router updates still
require confirmation after the proposed domain changes are shown.

When `DOMAIN_LIST_URLS` is omitted, the utility uses the original
`itdoginfo/allow-domains` list shown above. Setting it replaces the sources, so
include the original URL along with your own list to retain the shared domains.
Spaces around URLs and domains are trimmed; blank lines and duplicate domains are
removed. Each source must contain at least one domain. An empty or invalid
`DOMAIN_LIST_URLS`, a failed download, or an empty source stops the utility before
any router updates.

The local `domains.lst` contains `api.openai.com` and is ready to publish in your
separate public `vpn-domains` repository on the `main` branch. It is not loaded
automatically; add its raw URL to `DOMAIN_LIST_URLS` after publication.

### Run
Start the script:
```bash
npm run start
```

### Checks
Run the domain-list and router-login tests:
```bash
npm test
```
