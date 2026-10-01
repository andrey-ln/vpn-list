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

# Router authentication token
ROUTER_AUTH_TOKEN=617c234d...

# Optional: comma-separated HTTP(S) URLs, one domain per line in each list
# Replace OWNER with your GitHub username after publishing the additional list
# DOMAIN_LIST_URLS=https://raw.githubusercontent.com/itdoginfo/allow-domains/refs/heads/main/Russia/inside-raw.lst,https://raw.githubusercontent.com/OWNER/vpn-domains/refs/heads/main/domains.lst
```
See `.env.example` for a configuration template.

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
Run the domain-list tests:
```bash
npm test
```
