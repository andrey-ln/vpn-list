import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {createServer, type Server} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test, type TestContext} from 'node:test';
import axios from 'axios';
import {XRouterClient} from '../src/api/x-router/client.ts';
import {DomainOptEnum} from '../src/api/x-router/enums.ts';

const loginPage = `<html><script>
var Encrypt = {
    key: "0123456789abcdef0123456789abcdef",
    iv: "unused",
    init: function () { this.nonce = this.nonceCreat(); return this.nonce; },
    nonceCreat: function () {
        var type = 0;
        var deviceId = "aa:bb:cc:dd:ee:ff";
        var time = Math.floor(new Date().getTime() / 1000);
        var random = Math.floor(Math.random() * 10000);
        return [type, deviceId, time, random].join('_');
    }
};
</script></html>`;

function mockRouter(t: TestContext, initData: unknown = {code: 0}, html = loginPage, loginData: unknown = {code: 0, token: 'fixture-stok'}) {
    const get = t.mock.method(axios, 'get', async (url: string) => {
        if (url.endsWith('/web')) return {data: html};
        if (url.endsWith('/init_info')) return {data: initData};
        return {data: {code: 0, info: {ulist: ['chatgpt.com']}}};
    });
    const post = t.mock.method(axios, 'post', async () => ({data: loginData}));
    return {get, post};
}

test('logs in as admin with the contract nonce and double hash for all supported modes and codes', async (t) => {
    const vectors = [
        {mode: 1, hash: '9f9532bdb961e45759f76be815e4c2789f92e4a5bc6e8abd89fa023a2ec23a40'},
        {mode: '1', hash: '9f9532bdb961e45759f76be815e4c2789f92e4a5bc6e8abd89fa023a2ec23a40'},
        {mode: 0, hash: 'fb1d6f057faff129541341beecf05201ad71455c'},
        {mode: '0', hash: 'fb1d6f057faff129541341beecf05201ad71455c'},
        {mode: '', hash: 'fb1d6f057faff129541341beecf05201ad71455c'},
        {mode: undefined, hash: 'fb1d6f057faff129541341beecf05201ad71455c'},
    ];
    for (const [index, vector] of vectors.entries()) {
        await t.test(`mode ${String(vector.mode)}`, async (t) => {
            const code = index % 2 ? '0' : 0;
            const {get, post} = mockRouter(t, {code, newEncryptMode: vector.mode}, loginPage, {code, token: 'fixture-stok'});
            t.mock.method(Date, 'now', () => 1700000000123);
            t.mock.method(Math, 'random', () => 0.0042);
            const client = new XRouterClient('127.0.0.1:3131', 'fixture-password');

            await client.login();

            assert.deepEqual(get.mock.calls.slice(0, 2).map(({arguments: args}) => args[0]), [
                'http://127.0.0.1:3131/cgi-bin/luci/web',
                'http://127.0.0.1:3131/cgi-bin/luci/api/xqsystem/init_info',
            ]);
            assert.equal(post.mock.calls.length, 1);
            const [url, body, options] = post.mock.calls[0].arguments;
            assert.equal(url, 'http://127.0.0.1:3131/cgi-bin/luci/api/xqsystem/login');
            assert.deepEqual(Object.fromEntries(new URLSearchParams(body)), {
                username: 'admin',
                password: vector.hash,
                logtype: '2',
                nonce: '0_aa:bb:cc:dd:ee:ff_1700000000_42',
            });
            assert.equal(options.headers['Content-Type'], 'application/x-www-form-urlencoded');
            await client.getVpnInfo();
            assert.equal(get.mock.calls[2].arguments[0], 'http://127.0.0.1:3131/cgi-bin/luci/;stok=fixture-stok/api/misystem/smartvpn_info');
            await client.changeDomain('api.openai.com', DomainOptEnum.Add);
            assert.equal(post.mock.calls[1].arguments[0], 'http://127.0.0.1:3131/cgi-bin/luci/;stok=fixture-stok/api/misystem/smartvpn_url');
        });
    }
});

test('requires successful login before any VPN request', (t) => {
    const {get, post} = mockRouter(t);
    const client = new XRouterClient('127.0.0.1:3131', 'fixture-password');

    assert.throws(() => client.getVpnInfo(), /login/i);
    assert.throws(() => client.changeDomain('api.openai.com', DomainOptEnum.Add), /login/i);
    assert.equal(get.mock.calls.length, 0);
    assert.equal(post.mock.calls.length, 0);
});

test('rejects unsupported HTML or init_info without sending a login request', async (t) => {
    const cases = [
        {html: '<html>No Encrypt parameters</html>', data: {code: 0}, error: /login page format/i},
        {html: loginPage.replace('aa:bb:cc:dd:ee:ff', 'unknown'), data: {code: 0}, error: /login page format/i},
        {html: loginPage, data: 'not JSON', error: /initialization/i},
        {html: loginPage, data: {}, error: /initialization/i},
        ...[null, false, '', 1, '1'].map(code => ({html: loginPage, data: {code}, error: /initialization/i})),
        ...[2, '2', null, false].map(newEncryptMode => ({html: loginPage, data: {code: 0, newEncryptMode}, error: /encryption mode/i})),
    ];
    for (const [index, item] of cases.entries()) {
        await t.test(`invalid response ${index}`, async (t) => {
            const {post} = mockRouter(t, item.data, item.html);
            await assert.rejects(new XRouterClient('127.0.0.1:3131', 'fixture-password').login(), item.error);
            assert.equal(post.mock.calls.length, 0);
        });
    }
});

test('rejects login refusal or a missing token and keeps VPN access blocked', async (t) => {
    const responses = [{code: 403}, {code: 0}, {code: 0, token: ''}, {code: 0, token: 123}, {token: 'fixture-stok'}, {code: false, token: 'fixture-stok'}];
    for (const [index, response] of responses.entries()) {
        await t.test(`login response ${index}`, async (t) => {
            mockRouter(t, {code: 0}, loginPage, response);
            const client = new XRouterClient('127.0.0.1:3131', 'fixture-password');
            await assert.rejects(client.login(), /login/i);
            assert.throws(() => client.getVpnInfo(), /login/i);
        });
    }
});

test('sanitizes network failures instead of exposing Axios request data', async (t) => {
    for (const stage of ['page', 'initialization', 'login']) {
        await t.test(stage, async (t) => {
            const {get, post} = mockRouter(t);
            const unsafeError = new Error('fixture-password fixture-password-hash fixture-stok');
            if (stage === 'login') {
                post.mock.mockImplementation(async () => { throw unsafeError; });
            } else {
                get.mock.mockImplementation(async (url: string) => {
                    if (stage === 'page' || url.endsWith('/init_info')) throw unsafeError;
                    return {data: loginPage};
                });
            }
            await assert.rejects(new XRouterClient('127.0.0.1:3131', 'fixture-password').login(), err => {
                assert.ok(err instanceof Error);
                assert.doesNotMatch(err.message, /fixture-password|fixture-stok/);
                assert.match(err.message, /router/i);
                assert.equal(err.cause, undefined);
                return true;
            });
        });
    }
});

test('does not forward the login form to another address after HTTP 307 or 308', async (t) => {
    const received: {method?: string, hasPassword: boolean}[] = [];
    let loginRequests = 0;
    let redirectStatus = 307;
    const receiver = createServer(async (req, res) => {
        let body = '';
        for await (const chunk of req) body += chunk.toString();
        received.push({method: req.method, hasPassword: new URLSearchParams(body).has('password')});
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({code: 403}));
    });
    const router = createServer(async (req, res) => {
        if (req.url?.endsWith('/web')) {
            res.end(loginPage);
        } else if (req.url?.endsWith('/init_info')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({code: 0}));
        } else if (req.url?.endsWith('/login')) {
            let body = '';
            for await (const chunk of req) body += chunk.toString();
            if (req.method === 'POST' && new URLSearchParams(body).has('password')) loginRequests++;
            const address = receiver.address();
            assert.ok(address && typeof address !== 'string');
            res.writeHead(redirectStatus, {Location: `http://127.0.0.1:${address.port}/capture`});
            res.end();
        } else {
            res.statusCode = 404;
            res.end();
        }
    });
    t.after(async () => {
        for (const server of [router, receiver]) {
            if (server.listening) {
                server.closeAllConnections();
                await new Promise<void>(resolve => server.close(() => resolve()));
            }
        }
    });
    async function listen(server: Server) {
        await new Promise<void>((resolve, reject) => {
            server.once('error', reject);
            server.listen(0, '127.0.0.1', () => {
                server.off('error', reject);
                resolve();
            });
        });
        const address = server.address();
        assert.ok(address && typeof address !== 'string');
        return address.port;
    }
    await listen(receiver);
    const port = await listen(router);
    for (const status of [307, 308]) {
        redirectStatus = status;
        await assert.rejects(new XRouterClient(`127.0.0.1:${port}`, 'fixture-password').login(), /login/i);
        assert.equal(received.length, 0);
    }
    assert.equal(loginRequests, 2);
});

test('rejects missing password configuration even when a legacy token exists', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vpn-router-env-'));
    try {
        const env = {...process.env, ROUTER_IP: '127.0.0.1:3131', ROUTER_AUTH_TOKEN: 'fixture-stok'};
        delete env.ROUTER_PASSWORD;
        delete env.DOTENV_CONFIG_PATH;
        const instanceURL = new URL('../src/api/x-router/instance.ts', import.meta.url).href;
        const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), '--input-type=module', '-e', `await import(${JSON.stringify(instanceURL)})`], {
            cwd: directory, env, encoding: 'utf8',
        });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /ROUTER_IP.*ROUTER_PASSWORD/);
        assert.doesNotMatch(result.stderr, /fixture-stok/);
    } finally {
        rmSync(directory, {recursive: true, force: true});
    }
});
