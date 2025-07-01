import axios from "axios";

export class DomainsClient {
    private readonly baseURL = 'https://raw.githubusercontent.com/itdoginfo/allow-domains/refs/heads/main/Russia/inside-raw.lst';

    getAllowedDomainsText() {
        return axios.get<string>(this.baseURL)
    }
}