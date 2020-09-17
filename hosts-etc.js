const fs = require('fs');

const HOSTS = process.platform === "win32" ? "C:/Windows/System32/drivers/etc/hosts" : "/etc/hosts";

let hostsCache = null;

class Host {
    constructor(host, address, opts) {
        opts = opts || {};
        this.host = host;
        this.address = address;
        this.region = opts.region || "";
        this.comment = opts.comment || "";
    }

    makeHostLine() {
        return this.address + "\t" + this.host + (this.comment !== "" ? "\t# " + this.comment : "");
    }

    makeRegionLine() {
        if (this.region == "") return "";
        return "# region " + this.region;
    }
}

module.exports.HOSTS = HOSTS;
module.exports.Host = Host;
module.exports.hostifyData = function (hosts) {
    let out = "# Host file generated by TheBrenny/hosts-etc\n\n";
    for (let r of Object.keys(hosts).sort()) {
        if (hosts[r].length === 0) continue;
        out += hosts[r][0].makeRegionLine() + "\n";
        for (let h of hosts[r]) out += h.makeHostLine() + "\n";
        out += (hosts[r][0].region != "" ? "# end region" : "") + "\n";
    }
    return out;
};

module.exports.get = function (query) {
    if (typeof query === 'undefined') query = "";
    query = (query || "").toString();

    let lines = getFileContents().replace(/\\r\\n/g, "\n").split("\n");
    let regions = getAllHosts(lines);
    let out = {};

    let rx = /(\d{1,3}|x)\.(\d{1,3}|x)\.(\d{1,3}|x)\.(\d{1,3}|x)/;
    if (query == "") { // get all
        out = regions;
    } else if (query.startsWith("#")) { // get region only
        let region = query.slice(1).trim();
        out[region] = regions[region] || [];
    } else if (rx.test(query)) { // get IPs
        let ips = [...query.matchAll(rx)][0].slice(1);
        rx = new RegExp(ips.map(ip => ip === "x" ? "\\d{1,3}" : ip + "").join("."));

        for (let r in regions) {
            // r = region object == array of hosts
            for (let h of regions[r]) {
                // h = host object
                if (rx.test(h.address)) {
                    out[r] = out[r] || [];
                    out[r].push(h);
                }
            }
        }
    } else { // Matching hostname
        for (let r in regions) {
            // regions[r] = region object == array of hosts
            for (let h of regions[r]) {
                // h = host object
                if (h.host.includes(query)) {
                    out[r] = out[r] || [];
                    out[r].push(h);
                }
            }
        }
    }

    // {"region": [Host, ...]}
    return out;

    // Gets all hosts into a JSON *object*!
    function getAllHosts(lines) {
        if (hostsCache) return hostsCache;

        let regionStart = /^[ \t]*#[ \t]*region +(.+?)[ \t]*$/gm;
        let regionEnd = /^[ \t]*#[ \t]*end region[ \t]*$/gm;
        let hostsRx = /^[ \t]*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})[ \t]+?(\S+?)[ \t]*(#.*)?$/gm;
        let region = [];
        let out = {};

        for (let line of lines) {
            // Region End
            if (regionEnd.test(line)) {
                region.pop();
                continue;
            }

            // Region Start
            let r = [...line.matchAll(regionStart)];
            if (r.length > 0) {
                region.push(r[0][1]);
                continue;
            }

            // Host
            r = [...line.matchAll(hostsRx)];
            if (r.length > 0) {
                r = r[0];
                let h = new Host(r[2], r[1], {
                    region: region.join("."),
                    comment: (r[3] && r[3].substr(1).trim()) || ""
                });
                out[region] = out[region] || [];
                out[region].push(h);
                continue;
            }
        }

        hostsCache = out;

        return out;
    }
};

module.exports.set = function (host) {
    if (host.constructor !== "Host") host = new Host(host.host, host.address, host);

    let updated = 0;
    let hosts = this.get();

    // find if host exists, if yes delete it
    let hostsAsArray = [];
    for (let r in hosts) hostsAsArray = hostsAsArray.concat(hosts[r]);
    let hostIndex = hostsAsArray.findIndex((el) => hostsMatch(el, host));
    if (hostIndex !== -1) {
        let r = hostsAsArray[hostIndex].region;
        hostIndex = hosts[r].findIndex((el) => hostsMatch(el, host)); // reuse to save space
        hosts[r].splice(hostIndex, 1);
    }

    // push new host
    hosts[host.region] = hosts[host.region] || [];
    hosts[host.region].push(host);
    updated++;

    // overwrite system hosts file
    setFileContents(null, this.hostifyData(hosts));

    // return updated
    return updated;

    function hostsMatch(a, b) {
        return a.host === b.host && a.address === b.address;
    }
};

module.exports.remove = function (query) {
    let updated = 0;
    let hosts = this.get();
    let out = Object.assign({}, hosts);

    let rx = /(\d{1,3}|x)\.(\d{1,3}|x)\.(\d{1,3}|x)\.(\d{1,3}|x)/;
    if (query.startsWith("#")) { // remove region
        let region = query.slice(1).trim();
        updated += out[region].length;
        delete out[region];
    } else if (rx.test(query)) { // remove IPs
        let ips = [...query.matchAll(rx)][0].slice(1);
        rx = new RegExp(ips.map(ip => ip === "x" ? "\\d{1,3}" : ip + "").join("\\."));

        for (let r in hosts) {
            out[r] = out[r].filter(host => !rx.test(host.address)); // jshint ignore:line
            updated += (hosts[r].length - out[r].length);
            if (out[r].length === 0) delete out[r];
        }
    } else { // Matching hostname
        for (let r in hosts) {
            out[r] = out[r].filter(host => host.host !== query); // jshint ignore:line
            updated += (hosts[r].length - out[r].length);
            if (out[r].length === 0) delete out[r];
        }
    }

    setFileContents(null, this.hostifyData(out));

    return updated;
};

function getFileContents(file) {
    return fs.readFileSync(file || HOSTS).toString();
}

function setFileContents(file, data) {
    file = file || HOSTS;
    if (!fs.existsSync(file + ".hosts-etc.bkp")) fs.copyFileSync(file, file + ".hosts-etc.bkp");
    return fs.writeFileSync(file, data);
}

module.exports.promise = {};
module.exports.promise.HOSTS = HOSTS;
module.exports.promise.Host = Host;
module.exports.promise.hostifyData = async function (hosts) {
    return Promise.resolve(module.exports.hostifyData(hosts));
};
module.exports.promise.get = async function (query) {
    return new Promise((res, rej) => {
        try {
            res(module.exports.get(query));
        } catch (e) {
            rej(e);
        }
    });
};
module.exports.promise.set = async function (hostData) {
    return new Promise((res, rej) => {
        try {
            res(module.exports.set(hostData));
        } catch (e) {
            rej(e);
        }
    });
};
module.exports.promise.remove = async function (query) {
    return new Promise((res, rej) => {
        try {
            res(module.exports.remove(query));
        } catch (e) {
            rej(e);
        }
    });
};