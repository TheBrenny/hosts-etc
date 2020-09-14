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

module.exports.get = function (query) {
    if (typeof query === 'undefined') query = "";
    query = (query || "").toString();

    let lines = this.getFileContents().replace(/\\r\\n/g, "\n").split("\n");
    let regions = getAllHosts(lines);
    let out = {};

    let rx = /(\d{1,3}|x)\.(\d{1,3}|x)\.(\d{1,3}|x)\.(\d{1,3}|x)/g;
    if (query == "") { // get all
        out = regions;
    } else if (query.startsWith("#")) { // get region only
        let region = query.slice(1).trim();
        out[region] = regions[region] || [];
    } else if (rx.test(query)) { // get IPs
        let ips = rx.exec(query).slice(1);
        rx = new RegExp(ips.map(ip => ip === "x" ? "\\d{1,3}" : ip + "").join("."), "g");

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
                if (h.host.contains(query)) {
                    out[r] = out[r] || [];
                    out[r].push(h);
                }
            }
        }
    }

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
    let hosts = this.get(host.host);

    // get the region
    hosts[host.region] = hosts[host.region] || [];

    // find if host exists, if yes delete it
    hosts[host.region].push(host);

    // push new host
    // updated++;

    // overwrite system hosts file

    // return updated
    return updated;

};

module.exports.getFileContents = function (file) {
    return fs.readFileSync(file || this.HOSTS).toString();
};

module.exports.promise = {};
module.exports.promise.get = async function (region) {
    return new Promise((res, rej) => {
        try {
            res(this.get(region));
        } catch (e) {
            rej(e);
        }
    });
};