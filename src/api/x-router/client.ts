import axios from "axios";
import {ApiPathEnum, DomainOptEnum} from "./enums.ts";
import {PostResponseData, VpnInfo} from "./types.ts";

export class XRouterClient {
    private readonly baseUrl: string;

    constructor(routerIP: string, authToken: string) {
        this.baseUrl = `http://${routerIP}/cgi-bin/luci/;stok=${authToken}/api/misystem`
    }

    private getUrl(path: ApiPathEnum) {
        return this.baseUrl + path;
    }

    getVpnInfo() {
        const url = this.getUrl(ApiPathEnum.Info)
        return axios.get<VpnInfo>(url)
    }

    changeDomain(domain: string, opt: DomainOptEnum) {
        const url = this.getUrl(ApiPathEnum.Url)
        const form = new FormData()
        form.append('url', domain)
        form.append('opt', opt)
        return axios.post<PostResponseData>(url, form)
    }
}