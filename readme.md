# hosts-etc

`hosts-etc` is your friendly neighbourhood host file editor for use within Node! Maybe one day it'll be a command line tool, but don't place too many bets!

What it can do though, is make it look like the hosts file is organised through regions and host comments.

## Installation

```console
$ npm install --save hosts-etc
```

## Usage

```javascript
// require hosts!
const hosts = require('hosts-etc');
// Or use everything as a promise!
const pHosts = hosts.promise;

// make a host object
let aCoolHost = new hosts.Host("127.5.5.5", "localhost");

// get all hosts
console.log(hosts.get());

// get hosts from a region
console.log(hosts.get("# region"));

// get hosts that contain the name
console.log(hosts.get("g(oo)gle"))

// get hosts that match the address
console.log(hosts.get("127.x.4.x"));

// set a host -- dw, duplicates are handled!
let address = "127.3.3.3";
let host = "hostman";
let opts = {
    comment: "Check out hostman! That project depends on this one!",
    region: "hostman"
}
hosts.set(aCoolHost); // set a host object
hosts.set(address, host, opts); // opts is optional!

// set a whole bunch of hosts! (duplicates are handled here too!)
let mcWorlds = [
    {
        address:"192.168.0.10",
        host:"my.mc.world",
        region: "mc worlds",
        comment: "My Minecraft world!"
    },
    new hosts.Host(
        "192.168.0.20",
        "their.mc.world", {
            region: "mc worlds",
            comment: "Their Minecraft world!"
        }
    )
];
hosts.set(mcWorlds);

// or remove a host/region/ip regex!
hosts.remove("#mc worlds");

// By default, a cache will be saved to limit the amount of reads to the same file,
//   but this cache can be ignored by doing the following. This is handy if you the
//   hosts file is altered while an instance of hosts-etc is running.
hosts.useCache(false);
hosts.useCache(); // this turns cache on, despite the current cache state!
```

### Regions

Regions make managing your hosts file a whole bunch eaiser! The idea is that similar host entries go into the same region so that when you do a host lookup/delete, you have some ballpark idea of where to look. It also allows other programs to take care of their own regions, just like [hostman](https://github.com/TheBrenny/hostman) does!

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

~~Please make sure to update tests as appropriate.~~ Yeah.... We'll get to testing one day... Maybe you could sort it out? 🙏

## License
[MIT](https://choosealicense.com/licenses/mit/)