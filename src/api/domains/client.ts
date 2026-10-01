import axios from "axios";

export class DomainsClient {
    private readonly defaultURL = 'https://raw.githubusercontent.com/itdoginfo/allow-domains/refs/heads/main/Russia/inside-raw.lst';

    constructor(private readonly domainListURLs?: string) {}

    private getListURLs(): string[] {
        if (this.domainListURLs === undefined) {
            return [this.defaultURL];
        }

        const urls = this.domainListURLs.split(',').map(url => url.trim());
        for (const url of urls) {
            try {
                const {protocol} = new URL(url);
                if (protocol !== 'http:' && protocol !== 'https:') {
                    throw new Error('Unsupported protocol');
                }
            } catch {
                throw new Error('Invalid DOMAIN_LIST_URLS: provide one or more HTTP(S) URLs separated by commas.');
            }
        }
        return urls;
    }

    async getAllowedDomains(): Promise<string[]> {
        const urls = this.getListURLs();
        const domains = new Set<string>();

        for (const url of urls) {
            try {
                const {data} = await axios.get<string>(url, {responseType: 'text'});
                const list = data.split('\n').map(domain => domain.trim()).filter(Boolean);
                if (!list.length) {
                    throw new Error('The domain list is empty.');
                }
                list.forEach(domain => domains.add(domain));
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                throw new Error(`Unable to load domain list from ${url}: ${message}`);
            }
        }
        return [...domains];
    }
}
