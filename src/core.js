const got = require("got");
const cheerio = require("cheerio");
const FormData = require('form-data');

const { CookieJar } = require("tough-cookie");

var cookieJar = new CookieJar();

const GOOGLE = "http://www.google.com";
const ETECSA_LOGIN = "https://secure.etecsa.net:8443";
const ETECSA_LOGIN_POST = "https://secure.etecsa.net:8443//LoginServlet";
const ETECSA_LOGOUT = "https://secure.etecsa.net:8443/LogoutServlet";
const ETECSA_TIME = "https://secure.etecsa.net:8443/EtecsaQueryServlet";

async function login(username, password) {
    const params = await getLoginParameters();
    const loginParams = { ...params, username, password };
    const loginResponse = await postLogin(loginParams);
    // console.log(loginResponse)
    return loginResponse;
}

async function logout(config) {
    if (await status()) {
        // cookieJar = CookieJar.fromJSON(config.cookies)
        // cookieJar = config.cookies.fromJSON()
        // console.log(ETECSA_LOGOUT)
        const { body } = await got.get(ETECSA_LOGOUT + '?ATTRIBUTE_UUID=' + config.uuid, {});
        // console.log(body)
        if (!body.match(/success/i)) {
            throw new Error("Error disconnecting");
        }
    } else {
        throw new Error("Not connected");
    }
}

async function status() {
    try {
        const { body } = await got.get(GOOGLE);
        return !body.match(ETECSA_LOGIN);
    } catch {
        return false;
    }
}

async function getLoginParameters() {
    const loginResult = await got.get(ETECSA_LOGIN, { cookieJar });

    const $ = cheerio.load(loginResult.body);
    const result = $("form#formulario")
        .find("input")
        .filter((_, el) => ["button", "reset"].indexOf($(el).attr("type")) === -1)
        .map((_, el) => ({ name: $(el).attr("name"), value: $(el).val() }))
        .get();
    const map = {};
    for (const { name, value } of result) {
        map[name] = value;
    }
    return map;
}

async function postLogin(parameters) {
    const { body, statusCode, statusMessage, headers } = await got.post(
        ETECSA_LOGIN_POST,
        {
            form: parameters, // form,
            followRedirect: true,
            throwHttpErrors: true,
            cookieJar,
        }
    );
    const alertMatch = body.match(
        /<script type="text\/javascript">\s*alert\("([\w ().\p{L}]+)"\);/u
    );
    if (alertMatch) {
        throw new Error(alertMatch[1]);
    }
    if (statusCode !== 200) {
        throw new Error(`Server responded with ${statusCode}: ${statusMessage}`);
    }
    // return headers.location; // TODO check for location to be undefined

    const uuidMatch = body.match(/ATTRIBUTE_UUID=(\w*)&/);
    if (!uuidMatch) {
        throw new Error("No uuid in page");
    }
    return {
        uuid: uuidMatch[1],
        cookies: cookieJar.toJSON(),
        parameters
    };
}


async function getTime(username, config) {
    if (await status()) {
        cookieJar = CookieJar.fromJSON(config.cookies)
        const { body } = await got.post(ETECSA_TIME + "?CSRFHW=" + config.parameters.CSRFHW +"&op=getLeftTime&op1=" + username, {
            cookieJar
        });
        return body;
    } else {
        throw new Error("Not connected");
    }
}

module.exports = {
    login,
    logout,
    status,
    getTime
}
