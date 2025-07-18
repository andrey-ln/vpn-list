# VPN List
A small utility for updating VPN domains on Xiaomi routers.

## Contents
- [Technologies](#technologies)
- [Install & Run](#install--run)

## Technologies
The project uses the following:
- [TypeScript](https://www.typescriptlang.org/)
- [Axios](https://axios-http.com/ru/docs/intro)

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
```
### Run
Start the script:
```bash
npm run start
```