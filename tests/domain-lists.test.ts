import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import axios from 'axios';
import {DomainsClient} from '../src/api/domains/client.ts';

const defaultURL = 'https://raw.githubusercontent.com/itdoginfo/allow-domains/refs/heads/main/Russia/inside-raw.lst';

test('uses the original source when DOMAIN_LIST_URLS is not set', async (t) => {
    const get = t.mock.method(axios, 'get', async () => ({data: 'chatgpt.com\n'}));

    assert.deepEqual(await new DomainsClient().getAllowedDomains(), ['chatgpt.com']);
    assert.equal(get.mock.calls[0].arguments[0], defaultURL);
});

test('combines HTTP(S) lists, trims lines and removes empty lines and duplicates', async (t) => {
    const sources = new Map([
        ['https://lists.example/base.lst', ' chatgpt.com\r\n\nopenai.com \r\n chatgpt.com\n'],
        ['http://lists.example/custom.lst', ' openai.com\n api.openai.com \r\n \n'],
    ]);
    const get = t.mock.method(axios, 'get', async (url: string) => ({data: sources.get(url)}));
    const client = new DomainsClient(' https://lists.example/base.lst, http://lists.example/custom.lst ');

    assert.deepEqual(await client.getAllowedDomains(), ['chatgpt.com', 'openai.com', 'api.openai.com']);
    assert.deepEqual(get.mock.calls.map(({arguments: args}) => args[0]), [...sources.keys()]);
    assert.deepEqual(get.mock.calls[0].arguments[1], {responseType: 'text'});
});

test('rejects explicitly empty or invalid configuration before requesting any source', async (t) => {
    const get = t.mock.method(axios, 'get', async () => ({data: 'api.openai.com\n'}));

    for (const value of ['', '  ', ',', 'not-a-url', 'ftp://lists.example/list', 'http://', 'https://lists.example/base.lst,']) {
        await assert.rejects(new DomainsClient(value).getAllowedDomains(), /DOMAIN_LIST_URLS/);
    }
    assert.equal(get.mock.calls.length, 0);
});

test('rejects the complete update if one source fails and identifies that source', async (t) => {
    t.mock.method(axios, 'get', async (url: string) => {
        if (url.endsWith('custom.lst')) {
            throw new Error('Request failed with status code 503');
        }
        return {data: 'chatgpt.com\n'};
    });

    const client = new DomainsClient('https://lists.example/base.lst,https://lists.example/custom.lst');
    await assert.rejects(client.getAllowedDomains(), /https:\/\/lists\.example\/custom\.lst.*503/);
});

test('rejects each empty source even when another source contains domains', async (t) => {
    const get = t.mock.method(axios, 'get', async () => ({data: 'chatgpt.com\n'}));

    for (const emptyBody of ['', '\r\n \t\n']) {
        get.mock.mockImplementation(async (url: string) => ({data: url.endsWith('custom.lst') ? emptyBody : 'chatgpt.com\n'}));
        const client = new DomainsClient('https://lists.example/base.lst,https://lists.example/custom.lst');
        await assert.rejects(client.getAllowedDomains(), /https:\/\/lists\.example\/custom\.lst.*empty/i);
    }
});

test('loads DOMAIN_LIST_URLS from .env when importing the domains instance without the router', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vpn-list-dotenv-'));
    try {
        writeFileSync(join(directory, '.env'), 'DOMAIN_LIST_URLS=https://lists.example/from-env.lst\n');
        const env = {...process.env};
        delete env.DOMAIN_LIST_URLS;
        delete env.DOTENV_CONFIG_PATH;
        delete env.ROUTER_IP;
        delete env.ROUTER_AUTH_TOKEN;
        const instanceURL = new URL('../src/api/domains/instance.ts', import.meta.url).href;
        const script = `
            const {default: axios} = await import(${JSON.stringify(import.meta.resolve('axios'))});
            axios.get = async (url) => {
                if (url !== 'https://lists.example/from-env.lst') throw new Error('Unexpected source: ' + url);
                return {data: 'api.openai.com\\n'};
            };
            const {domainsClient} = await import(${JSON.stringify(instanceURL)});
            console.log(JSON.stringify(await domainsClient.getAllowedDomains()));
        `;
        const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), '--input-type=module', '-e', script], {
            cwd: directory,
            env,
            encoding: 'utf8',
        });

        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout.trim(), '["api.openai.com"]');
    } finally {
        rmSync(directory, {recursive: true, force: true});
    }
});
