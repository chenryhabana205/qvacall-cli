const api = require("./core");
const { resolve } = require("path");
const { readFile: readFileCb, writeFile: writeFileCb, existsSync, mkdirSync } = require("fs");
const { promisify } = require("util");

const readFile = promisify(readFileCb);
const writeFile = promisify(writeFileCb);

const configDir = resolve(
    process.env.XDG_CACHE_HOME || resolve(process.env.HOME || "~/", ".cache")
);

const configFile = resolve(
    configDir,
    "etecsa.json"
);

async function login() {
    const { user, pass } = await readConfig();
    const config = await api.login(user, pass);
    console.log(`Logged in`);
    await writeConfig({ user, pass, config });
}

async function logout() {
    const { user, pass, config } = await readConfig();
    await api.logout(config);
    console.log("Logged out");
    await writeConfig({ user, pass });
}

async function set(user, pass) {
    await writeConfig({ user, pass });
}

async function status() {
    if (await api.status()) {
        console.log("Connected");
    } else {
        console.log("Not Connected");
    }
}

async function time() {
    const { user, config } = await readConfig();
    console.log("Tiempo restante:", await api.getTime(user, config));
}

async function readConfig() {
    const file = await readFile(configFile);
    return JSON.parse(file.toString());
}

async function writeConfig(config) {
    if (!existsSync(configDir)){
        mkdirSync(configDir);
    }
    await writeFile(configFile, JSON.stringify(config), { flag: 'w' });
}

module.exports = {
    login,
    logout,
    set,
    status,
    time
}
