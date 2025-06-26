import axios from "axios";
import {PostResponseData, VpnInfo} from "./types.ts";
import {API_PATH} from "./enums.ts";

export class XRouterAPI {
    private readonly baseUrl: string;

    constructor(routerIP: string, authToken: string) {
        this.baseUrl = `http://${routerIP}/cgi-bin/luci/;stok=${authToken}/api/misystem`
    }

    private getUrl(path: API_PATH) {
        return this.baseUrl + path;
    }

    getVpnInfo() {
        const url = this.getUrl(API_PATH.INFO)
        return axios.get<VpnInfo>(url)
    }

    addDomain(domain: string) {
        const url = this.getUrl(API_PATH.URL)
        const form = new FormData()
        form.append('url', domain)
        form.append('opt', '0')
        return axios.post<PostResponseData>(url, form)
    }

    removeDomain(domain: string) {
        const url = this.getUrl(API_PATH.URL)
        const form = new FormData()
        form.append('url', domain)
        form.append('opt', '1')
        return axios.post<PostResponseData>(url, form)
    }
}

