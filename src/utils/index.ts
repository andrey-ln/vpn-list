import {DomainOptEnum, xRouterClient} from "../api/x-router";
import * as readline from "node:readline";

export function getMsgFromUnknown(data: unknown): string {
    if (!(data && typeof data === 'object' && 'message' in data)) {
        return 'Unknown message'
    }

    if (typeof data.message !== 'string') {
        return 'Unknown message'
    }

    return data.message
}

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(query, (answer: string) => {
            rl.close();
            resolve(answer);
        });
    });
}

export async function changeDomains(domains: string[], opt: DomainOptEnum) {
    let successCount = 0
    let errorCount = 0

    function getInfoMsg() {
        return `${opt === DomainOptEnum.Add ? 'Added' : 'Removed'}: ${successCount} of ${domains.length} | Errors: ${errorCount}`;
    }

    for (let domain of domains) {
        try {
            const {data: {code}} = await xRouterClient.changeDomain(domain, opt)
            code ? errorCount++ : successCount++

            process.stdout.write(getInfoMsg() + '\r')
        } catch (err) {
            console.error(`Error: ${getMsgFromUnknown(err)}`)
        }
        await delay(100)
    }
    console.info(getInfoMsg())
}