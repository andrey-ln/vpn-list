import 'dotenv/config';
import {DomainsClient} from "./client.ts";

export const domainsClient = new DomainsClient(process.env.DOMAIN_LIST_URLS);
