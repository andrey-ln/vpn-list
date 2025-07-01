import {XRouterClient} from "./client.ts";
import dotenv from 'dotenv';

dotenv.config();
const {ROUTER_IP, ROUTER_AUTH_TOKEN} = process.env

if (!ROUTER_IP || !ROUTER_AUTH_TOKEN) {
    console.error('Error: Not set .env variables');
    process.exit(1);
}

export const xRouterClient = new XRouterClient(ROUTER_IP, ROUTER_AUTH_TOKEN)
