import {DomainOptEnum, xRouterClient} from "./api/x-router";
import {askQuestion, changeDomains} from "./utils";
import {domainsClient} from "./api/domains";

console.info('Logging in to router...');
try {
    await xRouterClient.login();
} catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : 'Unable to log in to router.'}`);
    process.exit(1);
}

// ---- Getting domains ----
console.info('Getting domains...')
let currentDomains: string[] = []
try {
    ({data: {info: {ulist: currentDomains}}} = await xRouterClient.getVpnInfo())
} catch (err) {
    console.error("Error: Unable to get VPN information from router.");
    process.exit(1);
}

let allowedDomains: string[] = []
try {
    allowedDomains = await domainsClient.getAllowedDomains()
} catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : 'Unable to get allowed domains from the configured sources.'}`);
    process.exit(1);
}

// ---- Founding domains for update ----
let domainsToAdd: string[] = []
let domainsToRemove: string[] = []

const currentDomainsSet = new Set(currentDomains)
const allowedDomainsSet = new Set(allowedDomains)
const allDomainsSet = new Set([...currentDomains, ...allowedDomains])

allDomainsSet.forEach((domain) => {
    if (!domain) {
        return
    }
    const isOnAllowedList = allowedDomainsSet.has(domain)
    const isOnCurrentList = currentDomainsSet.has(domain)
    if (isOnAllowedList && !isOnCurrentList) {
        domainsToAdd.push(domain)
        return
    }
    if (!isOnAllowedList && isOnCurrentList) {
        domainsToRemove.push(domain)
        return
    }
})

// ---- Updating domains ----
console.info(`\nDomains to add: ${domainsToAdd.length}`);
if (domainsToAdd.length) console.table(domainsToAdd);
console.info(`\nDomains to remove: ${domainsToRemove.length}`);
if (domainsToRemove.length) console.table(domainsToRemove);

const answer = await askQuestion('\nDo you want update it? (y/n): ')
if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.info('Canceled ...');
    process.exit(0);
}

console.info('Updating domains...\n');
await changeDomains(domainsToAdd, DomainOptEnum.Add)
await changeDomains(domainsToRemove, DomainOptEnum.Remove)
