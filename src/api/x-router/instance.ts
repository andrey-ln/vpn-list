import {XRouterClient} from "./client.ts";
import 'dotenv/config';

const {ROUTER_IP, ROUTER_PASSWORD} = process.env

if (!ROUTER_IP || !ROUTER_PASSWORD) {
    console.error('Error: Set ROUTER_IP and ROUTER_PASSWORD in .env.');
    process.exit(1);
}

export const xRouterClient = new XRouterClient(ROUTER_IP, ROUTER_PASSWORD)
