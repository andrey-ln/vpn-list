import {DomainsApi, XRouterAPI} from "./api";
import dotenv from 'dotenv';
dotenv.config();

// ---- Get domains list ----
console.info('Getting domains...')
console.info('\n')

const routerIP = process.env.ROUTER_IP || ''
const authToken = process.env.ROUTER_AUTH_TOKEN || ''
const routerApi = new XRouterAPI(routerIP, authToken)
const domainsApi = new DomainsApi()

const {data: {info: {ulist: currentDomains}}} = await routerApi.getVpnInfo()
const {data} = await domainsApi.getAllowedDomainsText()
const allowedDomains = data.split('\n')

console.info(`Current domains: ${currentDomains.length}`)
console.info(`Allowed domains: ${allowedDomains.length}`)
console.info('\n')

// ---- Founding domains for update  -----

console.info('Calculation domains...')
console.info('\n')

let domainsToAdd: string[] = []
let domainsToRemove: string[] = []

const currentDomainsSet = new Set(currentDomains)
const allowedDomainsSet = new Set(allowedDomains)
const allDomainsSet = new Set([...currentDomains, ...allowedDomains])

allDomainsSet.forEach((domain) => {
    if (!domain)  {
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

console.info(`Domains to add: ${domainsToAdd.length}`);
console.info(`Domains to remove: ${domainsToRemove.length}`);
console.info('\n')


function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

for (let domain of domainsToRemove) {
    const {data} = await routerApi.removeDomain(domain)
    console.log('remove', domain, data)
    await delay(100)
}

for (let domain of domainsToAdd) {
    const {data} = await routerApi.addDomain(domain)
    console.log('add', domain, data)
    await delay(100)
}

    //
    // const {data: {code}} = await routerApi.addDomain(domainsToAdd[1])
    // console.log('add', domainsToAdd[3], code)

// const addQueue = domainsToAdd.map(domain => routerApi.addDomainToVpn(domain));
// const removeQueue = domainsToRemove.map(domain => routerApi.removeDomainFromVpn(domain));
//
// console.log(addQueue.length, removeQueue.length);
// Promise.all([...addQueue, ...removeQueue])
//     .then(() => console.info('All domains changed'))
//     .catch(err => console.info('Error while adding domains...', err));
