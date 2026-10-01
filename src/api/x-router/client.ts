import axios from "axios";
import {createHash} from "node:crypto";
import {ApiPathEnum, DomainOptEnum} from "./enums.ts";
import {PostResponseData, VpnInfo} from "./types.ts";

export class XRouterClient {
    private readonly routerUrl: string;
    private authToken?: string;

    constructor(routerIP: string, private readonly password: string) {
        this.routerUrl = `http://${routerIP}/cgi-bin/luci`;
    }

    private getEncryptParameters(html: string) {
        if (typeof html === 'string') {
            for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
                const encrypt = script[1].match(/\bvar\s+Encrypt\s*=\s*\{([\s\S]*?)\bnonceCreat\s*:\s*function\s*\(\s*\)\s*\{([^}]*)\}/);
                const key = encrypt?.[1].match(/\bkey\s*:\s*(["'])([^"'\\\r\n]{32})\1/)?.[2];
                const deviceId = encrypt?.[2].match(/\bvar\s+deviceId\s*=\s*(["'])((?:[0-9a-f]{2}:){5}[0-9a-f]{2})\1/i)?.[2];
                if (key && deviceId) {
                    return {key, deviceId};
                }
            }
        }
        throw new Error('Unsupported router login page format.');
    }

    async login(): Promise<void> {
        this.authToken = undefined;
        let html: string;
        try {
            ({data: html} = await axios.get<string>(`${this.routerUrl}/web`, {responseType: 'text', maxRedirects: 0}));
        } catch {
            throw new Error('Unable to get router login page.');
        }
        const {key, deviceId} = this.getEncryptParameters(html);

        let initData: {code?: unknown, newEncryptMode?: unknown};
        try {
            ({data: initData} = await axios.get(`${this.routerUrl}/api/xqsystem/init_info`, {maxRedirects: 0}));
        } catch {
            throw new Error('Unable to get router initialization information.');
        }
        if (!initData || (initData.code !== 0 && initData.code !== '0')) {
            throw new Error('Router initialization returned an invalid response or an error.');
        }
        const mode = initData.newEncryptMode;
        let algorithm: string;
        if (mode === 1 || mode === '1') {
            algorithm = 'sha256';
        } else if (mode === 0 || mode === '0' || mode === '' || mode === undefined) {
            algorithm = 'sha1';
        } else {
            throw new Error('Unsupported router encryption mode.');
        }

        const nonce = [0, deviceId, Math.floor(Date.now() / 1000), Math.floor(Math.random() * 10000)].join('_');
        const innerHash = createHash(algorithm).update(this.password + key).digest('hex');
        const passwordHash = createHash(algorithm).update(nonce + innerHash).digest('hex');
        const form = new URLSearchParams({username: 'admin', password: passwordHash, logtype: '2', nonce});
        let loginData: {code?: unknown, token?: unknown};
        try {
            ({data: loginData} = await axios.post(`${this.routerUrl}/api/xqsystem/login`, form.toString(), {
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                maxRedirects: 0,
            }));
        } catch {
            throw new Error('Router login request failed.');
        }
        if (!loginData || (loginData.code !== 0 && loginData.code !== '0')) {
            throw new Error('Router login was rejected.');
        }
        if (typeof loginData.token !== 'string' || !loginData.token.trim()) {
            throw new Error('Router login did not return a token.');
        }
        this.authToken = loginData.token;
    }

    private getUrl(path: ApiPathEnum) {
        if (!this.authToken) {
            throw new Error('Router login is required before VPN requests.');
        }
        return `${this.routerUrl}/;stok=${encodeURIComponent(this.authToken)}/api/misystem${path}`;
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
