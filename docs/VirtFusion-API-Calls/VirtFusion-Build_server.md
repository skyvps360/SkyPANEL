# VirtFusion Global API

## Endpoints

## powered by Stoplight

## Build a server

post
https://cp.domain.com/api/v1/servers/{serverId}/build
Request
Provide your bearer token in the Authorization header when making requests to protected resources.

Example: Authorization: Bearer 123

Path Parameters
serverId
integer
required
A valid server ID as shown in VirtFusion.

Examples:
9
Body

application/json

application/json
operatingSystemId
integer
required
A valid operating system template ID.

name
string
Server name.

hostname
string
Server Hsotname.

sshKeys
array[integer]
An array of SSH keys.

vnc
boolean
Enable/disable.

ipv6
boolean
Enable/disable.

email
boolean
Enable/disable.

swap
number
Values of 256, 512, 768, 1, 1.5, 2, 3, 4, 5,6 8

Responses
200
401
Body

application/json

application/json
responses
/
200
Token
:
123
serverId*
:
9
{
  "operatingSystemId": 1,
  "name": "server 1",
  "hostname": "server1.domain.com",
  "sshKeys": [
    1,
    2,
    3,
    4
  ],
  "vnc": false,
  "ipv6": false,
  "swap": 512,
  "email": true
}
{
  "operatingSystemId": 1,
  "name": "server 1",
  "hostname": "server1.domain.com",
  "sshKeys": [
    1,
    2,
    3,
    4
  ],
  "vnc": false,
  "ipv6": false,
  "swap": 512,
  "email": true
}
const axios = require('axios').default;

const options = {
  method: 'POST',
  url: 'https://cp.domain.com/api/v1/servers/9/build',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, */*',
    Authorization: 'Bearer 123'
  },
  data: {
    operatingSystemId: 1,
    name: 'server 1',
    hostname: 'server1.domain.com',
    sshKeys: [1, 2, 3, 4],
    vnc: false,
    ipv6: false,
    swap: 512,
    email: true
  }
};

try {
  const { data } = await axios.request(options);
  console.log(data);
} catch (error) {
  console.error(error);
}
{
  "data": {
    "id": 9,
    "ownerId": 3,
    "hypervisorId": 6,
    "arch": 1,
    "name": "server 1",
    "selfService": 0,
    "selfServiceSettings": [],
    "hostname": "server1.domain.com",
    "commissionStatus": 1,
    "uuid": "5de5a89b-b707-41bf-a051-7af1a4e67795",
    "state": "queued",
    "migratable": true,
    "timezone": "_default",
    "migrateLevel": 0,
    "deleteLevel": 0,
    "configLevel": 1,
    "backupLevel": 0,
    "elevated": false,
    "elevateId": null,
    "elevate": false,
    "destroyable": true,
    "rebuild": false,
    "suspended": false,
    "protected": false,
    "buildFailed": false,
    "primaryNetworkDhcp4": false,
    "primaryNetworkDhcp6": false,
    "built": "2024-11-29T19:32:17+00:00",
    "created": "2024-04-11T17:22:19+00:00",
    "updated": "2025-01-20T13:32:44+00:00",
    "traffic": {
      "public": {
        "countMethod": 1,
        "currentPeriod": {
          "start": "2025-01-11T00:00:00.000000Z",
          "end": "2025-02-10T23:59:59.999999Z",
          "limit": 200
        }
      }
    },
    "settings": {
      "osTemplateInstall": true,
      "osTemplateInstallId": 1,
      "encryptedPassword": "eyJpdiI6IjVsdWVBMzNNWnVXZzlYMjhlTUMzSXc9PSIsInZhbHVlIjoiT2E3SDNmVTVCOW1GK1RCd0h6YjZwZnIva1ZHbU9rQU1VL1hsQSthcUVRYz0iLCJtYWMiOiIzMzdmNjkxOTcwMjkxYmM2ZmNlMjgyMzdkMTQzMDY2OWY1ZTBlYjExYzA1MjdjMzZmMTU1ZTVlMGFiMWY2ZmJlIiwidGFnIjoiIn0=",
      "backupPlan": null,
      "uefi": false,
      "uefiType": 0,
      "cloudInit": true,
      "cloudInitType": 1,
      "config": {
        "cloud.init": {
          "on.all": {
            "user.data": {
              "runcmd": [
                "DEBIAN_FRONTEND=noninteractive /usr/bin/apt-get --option=Dpkg::Options::=--force-confold --option=Dpkg::options::=--force-unsafe-io --assume-yes --quiet update",
                "DEBIAN_FRONTEND=noninteractive /usr/bin/apt-get --option=Dpkg::Options::=--force-confold --option=Dpkg::options::=--force-unsafe-io --assume-yes --quiet dist-upgrade"
              ]
            }
          },
          "on.password": {
            "user.data": []
          },
          "on.sshkey": {
            "user.data": []
          },
          "on.allpre": {
            "user.data": []
          },
          "on.allpost": {
            "user.data": []
          },
          "on.network": [],
          "on.network.libvirtrouted": []
        }
      },
      "userConfig": [],
      "bootOrder": [
        "hd",
        "cdrom"
      ],
      "tpmType": 0,
      "networkBoot": false,
      "bootMenu": 1,
      "customISO": 1,
      "securityDriver": 3,
      "memBalloon": {
        "model": 1,
        "autoDeflate": 0,
        "freePageReporting": 0
      },
      "hyperv": {
        "enabled": false,
        "passthrough": false,
        "relaxed": 0,
        "vapic": 0,
        "spinlocks": 0,
        "vpindex": 0,
        "runtime": 0,
        "synic": 0,
        "stimer": 0,
        "reset": 0,
        "vendorId": 0,
        "frequencies": 0,
        "reenlightenment": 0,
        "tlbflush": 0,
        "ipi": 0,
        "evmcs": 0,
        "vendorIdValue": "KVM VM",
        "spinlocksValue": 8191,
        "clockEnabled": 0
      },
      "extended": {
        "cpuFlags": {
          "topoext": "1",
          "svm": "1",
          "vmx": "1"
        }
      },
      "machineType": "inherit",
      "pciPorts": 16,
      "resources": {
        "memory": 2048,
        "storage": 10,
        "traffic": 200,
        "cpuCores": 1
      },
      "decryptedPassword": "uv1dmfUUaENhNpbrGUwD"
    },
    "cpu": {
      "cores": 1,
      "type": "inherit",
      "typeExact": "host-model",
      "shares": 1024,
      "throttle": 0,
      "topology": {
        "enabled": false,
        "sockets": 1,
        "cores": 1,
        "threads": 1,
        "dies": 1
      }
    },
    "customXML": {
      "domain": {
        "xml": "",
        "enabled": false
      },
      "os": {
        "xml": "",
        "enabled": false
      },
      "devices": {
        "xml": "",
        "enabled": false
      },
      "features": {
        "xml": "",
        "enabled": false
      },
      "clock": {
        "xml": "",
        "enabled": false
      },
      "cpuTune": {
        "xml": "",
        "enabled": false
      }
    },
    "qemuCommandline": [],
    "qemuAgent": {
      "os": {
        "screen": "iVBORw0KGgoAAAANSUhEUgAAAJYAAABTCAAAAABYT6E5AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfpARESACeS8jvVAAAI2klEQVRo3u2W+XMjxRXHX3fPfWhG1+i0ZMmXbK3t9dq7bFg2ARKgSFWSn5If8+/lx1xFhSpCQSWppVhYWKB2F+y1JV+yLI1kndbcnR98LBACJGxCUjWfH3r6eN39puf1dx7A/yboiy2EvsHiv+wY+vL2CP2jQ+irjP8TbpP5fiCJtm4BAEBclUURuzFxotnnBqkgZ3uQcCXncs75WAy5oHiKA1x8/NTd+mW8LN0+WIJl+UpdfJH91XSEZZfw8Kq4kpEzKRNeOq50JzMvNEupVCET1QXlWr8qzsbL6Yimt4Wft18YFyPVLUyfrlu43YOupbpGjFOxY6p/enjK+1uFiEvkhK4olLZygQ3RFiCRU9GV6bEfYYPMItUzquWC1QgOE+t4jIKnfVzoc+VllXnSJojBZ/0EkzkdAADiC5dzEKgVljxtp+B7u2j/jldf0YkQAMIIEAA6a6CzKuAvzkJftdjnrjWCy4P+v4PMiWogYJEiCiJKcpRhPRYvH0M8PyKEpAF7qgvxEqpET0uZdDw1kxitNmDej8/qs8XJdXupX+36PEuxgOcHPGb8dTNAJQcBEhnis/jK8SqT4qvl0TzKEOzT8myQcCp9lsELHYoUwOmILfqYQtFhPACJeFwgsMwvXkt0K9ulZqR+utB1pMLuTGv6D4WPQJzOR+SP5eHGvZHjxCIuX0nWb7mDZnKYzX/Argz6aE7e28jCas2ouavxMY7UZqXF41t75JjfnrlmR3aym1cb0380nln4iIoeqVTu+2TkBFOJibaoLh3EttYOBten94rd0SIF+28wx/3ojd1MjuWn6+oeuv5YxPqpiFZ+d1oKHP7Zjy0ibcfrVEhhuP5ZA0XNoQNCGmEX+R4JxH6kn6qxmk5NjAOB7BtDbT/IqZpeGzpKYGdc9zHNrW/bvE13ZpBSSzhil9PGNBiJXD8YBRm9obEI92MtzjoxtF7iOELqt5k3YbabOuwn27pBEWwCQBIAgOGRDgAgAgBAAqCogs6KZQbIVKpgQASMtB6bikhiVMMkDyAZBT4mFjQgaSEDEMsCaLiQTRvGVIZTzyJEOo8U+Un4ZwDw2R6QhMRZhRVnzkdljTurMQvjsmGMpffLD5eJyzXSZq6Rv3PjzUrWVKIdV+Pyo6XtOGcS+niZC47y629n2zOmJWfFzOl7cw9yGXmi3FvT4ny2EWTvFE90nLEblqEi20/sbXyw0L3y+gGsY5dr5FrZw/w7a03IZG38kfTcVqF+e0dqGW97r2xXYmKz/OlueeGw0oS/stfrpLiV9GVpemTiKvVVijYLrHrEcO12lulIzYEhD9yHk07U5IaPcde+54+YftTeNNSj/gFnW3Z7pr/XT7HKfcVvY3u4qb3Lb8aVelRMJd3+qUSd/BHLLgW+SmFzio02pAMqq76yz890XQFPbNJq00BwJG2ojExHGwnkpImnTwAAgJeqAHr5QlYIYITh24LZiw+EgMCliqW1Swu99Hl75tusSSpsOnZzKxZkYZBOpNg17Tj949rK6Lqf68C8khZvdmZJKlcYzbHRuDAmr4g8X4JYOYpzsmqgCf9M74dWWVZjyrr7/PECGlFIGLKsawiKXFJ4dnfNzfr+CBbUqHSrUZDXmlWa1LT+17tFmR/UjODALaamu9Tfv7IzdxeUnp3d5lb9rWDl0407tJrbXH0kiaksy9uvJfLuSoNGZu7rp1nZjR/+BfEeXH3u8YHgjTVlzmbm644xFxDekUfiZum+IEeda17wG7T8aKXuz916Q5aTuhawPTqiiAKiAAgoAKDz4vyJFAcoscVo8S4b2AwIjsNhSx2KE3kM8lgdE4It1uYDDMhFHpJtBp8ifiJ5GAU+9YHxo2NPcnxEJc/iLKMFPOvgpYnUO3KkgeBzNsypd0E61Xss79qCLXt4ggD5X6/y1WE5zgdLFIu5GTtHutySuSznkonsSTXpFA6Bd1wO4rE+F7ipTAdEfWITzBA78PJuQivac2U0vnZQMRnHdvURO8b6CKKJrU6r64goOfFdLJj7DMqK5uziTtUJlrkWXc1OJ4xxtf9MoqDNCgUxUTCfHVJ1dUEMKuxaC9YJUzrSyY031Qr6ZKpfYoXu1IYo1o14JhlP9gbpR+pLbcFn28lFNKX3Np0T5sUh7/SJnfXb7YXl+1or2S7G1j/J1yWLWeJUOf5Z6v1kqzwdkbaslvvCgHcHxMp57U5Ex+QnU3l1K78guGytqGtV245PbY+NuffVqSKmv66n7ICmGvaLlH+EskHSFCdyN3JKbBb8oZAKuBaM82MBbIc/YMvWjQf+gRH4kjQ5aeHbbsOX/CabICOX4U8UT28ntrM9xWTGgtouOorfD07EBCYr7Ye95+2OzVltMY57VBj0Zn1mxIwTAXInLkqM1ZOgVzLdQcniXS44LjdjJ5GRfmLHMd2DDAFIAoh8tJwvFNKz5zIL7IXeKsLFB4+IDNEh+STpi3MgKQAAYFwItwwAGs8DiOhc3aPcxZ8EACJnCh9/EkQKAIAhAyg8gHKpIjc/nt9+9RNWHOzM7pTt6WNEpWgPRE/yWS8/+T0kNrq8M44OVW8Ajmn3+GsTgkbABUjYTTbr0Z9+Jh0YvcXGWD1+QDfeXZzceIdwZIw/YF5uprenTVfNdyZC5LfqzU72w0b+Rh33JJQatDOb27klK7ASd9WpoPTnuPvqh6mD0m7hdRrAy0f4SOIGbwXdmsvdc997cHfHsGosexXYLcvtOX5KTrGMxwvbPSzh0cTxIeaZ4AvM5ogVSN+hVo2YAiPUvKG7Q+HEmwQO9bdPfQLM8MDBDBOYJu37+0ApZzZp/xB3BQ72rclol1Lqyfsnkw5Azez4Rx5nHvLHsXkK9uMnwgoAQM5SRrF0mUriRQm+E/9qDooxAACq9q6+NWXN3FlqKm6w++UlKVxI3Rf66T9rfKP1txwiP5sQ8bl6sl1gV8vikWh/+RW/n4wbqWOGgCW6rIOWrS1sf/clQ0JCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQp4afwdRMMFLNhfN2wAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNS0wMS0xN1QxODowMDozOSswMDowMDazUncAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjUtMDEtMTdUMTg6MDA6MzkrMDA6MDBH7urLAAAAAElFTkSuQmCC"
      }
    },
    "media": {
      "isoMounted": false,
      "isoType": "local",
      "isoName": "",
      "isoFilename": "",
      "isoUrl": "",
      "isoDownload": false
    },
    "backupPlan": {
      "id": null,
      "name": null
    },
    "vnc": {
      "ip": "192.168.4.2",
      "port": 5901,
      "enabled": false
    },
    "network": {
      "interfaces": [
        {
          "id": 9,
          "order": 1,
          "enabled": true,
          "tag": 4238114467,
          "name": "eth0",
          "type": "public",
          "driver": 1,
          "processQueues": null,
          "mac": "00:C3:BA:23:37:B3",
          "ipv4ToMac": null,
          "ipv6ToMac": null,
          "inTrafficCount": true,
          "outTrafficCount": false,
          "inAverage": 0,
          "inPeak": 0,
          "inBurst": 0,
          "outAverage": 0,
          "outPeak": 0,
          "outBurst": 0,
          "ipFilter": true,
          "vlans": [],
          "ipFilterType": "4",
          "portIsolated": false,
          "ipv4_resolver_1": 1,
          "ipv4_resolver_2": 2,
          "ipv6_resolver_1": 1,
          "ipv6_resolver_2": 2,
          "networkProfile": 0,
          "dhcpV4": 0,
          "dhcpV6": 0,
          "firewallEnabled": false,
          "hypervisorNetwork": 6,
          "isNat": false,
          "nat": false,
          "firewall": [],
          "hypervisorConnectivity": {
            "id": 6,
            "type": "simpleBridge",
            "bridge": "br0",
            "mtu": null,
            "primary": true,
            "default": true
          },
          "ipWhitelist": [
            {
              "id": 1,
              "type": 4,
              "ip": "100.100.100.100",
              "mask": 32
            },
            {
              "id": 2,
              "type": 4,
              "ip": "10.0.0.10",
              "mask": 32
            }
          ],
          "actions": [],
          "ipv4": [
            {
              "id": 22,
              "order": 1,
              "enabled": true,
              "blockId": 1,
              "address": "192.168.4.21",
              "gateway": "192.168.4.1",
              "netmask": "255.255.254.0",
              "resolver1": "8.8.8.8",
              "resolver2": "8.8.4.4",
              "rdns": null,
              "mac": null
            },
            {
              "id": 37,
              "order": 2,
              "enabled": true,
              "blockId": 1,
              "address": "192.168.4.36",
              "gateway": "192.168.4.1",
              "netmask": "255.255.254.0",
              "resolver1": "8.8.8.8",
              "resolver2": "8.8.4.4",
              "rdns": null,
              "mac": null
            },
            {
              "id": 38,
              "order": 3,
              "enabled": true,
              "blockId": 1,
              "address": "192.168.4.37",
              "gateway": "192.168.4.1",
              "netmask": "255.255.254.0",
              "resolver1": "8.8.8.8",
              "resolver2": "8.8.4.4",
              "rdns": null,
              "mac": null
            }
          ],
          "ipv6": []
        }
      ],
      "secondaryInterfaces": []
    },
    "storage": [
      {
        "_id": 11,
        "id": 1,
        "cache": null,
        "bus": null,
        "capacity": 10,
        "drive": "a",
        "datastoreDiskId": null,
        "filesystem": null,
        "iops": {
          "read": null,
          "write": null
        },
        "bytes": {
          "read": null,
          "write": null
        },
        "type": "qcow2",
        "profile": 0,
        "status": 3,
        "enabled": true,
        "primary": true,
        "created": "2024-04-11T17:22:19+00:00",
        "updated": "2024-04-11T17:22:19+00:00",
        "datastore": [],
        "name": "5de5a89b-b707-41bf-a051-7af1a4e67795_1",
        "filename": "5de5a89b-b707-41bf-a051-7af1a4e67795_1.img",
        "hypervisorStorageId": null,
        "local": true,
        "locationType": "mountpoint",
        "path": "/home/vf-data/disk"
      }
    ],
    "hypervisorAssets": [],
    "hypervisor": {
      "id": 6,
      "ip": "192.168.4.2",
      "hostname": null,
      "port": 8892,
      "maintenance": false,
      "groupId": 2,
      "group": {
        "name": "Test",
        "icon": null
      },
      "timezone": "Europe/London",
      "forceIPv6": false,
      "vncListenType": 1,
      "displayName": null,
      "cpuSet": null,
      "nfType": 4,
      "backupStorageType": 2,
      "defaultDiskType": "inherit",
      "defaultDiskCacheType": "inherit",
      "defaultCPU": "inherit",
      "defaultMachineType": "inherit",
      "created": "2024-03-30T09:53:38+00:00",
      "updated": "2024-12-06T21:25:54+00:00",
      "name": "BHV 1",
      "dataDir": "/home/vf-data",
      "resources": {
        "servers": {
          "units": "#",
          "max": 0,
          "allocated": 5,
          "free": -5,
          "percent": null
        },
        "memory": {
          "units": "MB",
          "max": 29419,
          "allocated": 7168,
          "free": 22251,
          "percent": 24.4
        },
        "cpuCores": {
          "units": "#",
          "max": 128,
          "allocated": 6,
          "free": 122,
          "percent": 4.7
        },
        "localStorage": {
          "enabled": 1,
          "name": "Local (Default mountpoint)",
          "storageType": 1,
          "units": "GB",
          "max": 1000,
          "allocated": 141,
          "free": 859,
          "percent": 14.1
        },
        "otherStorage": []
      }
    },
    "owner": {
      "id": 3,
      "admin": false,
      "extRelationId": 1,
      "name": "jon Doe",
      "email": "jon@doe.com",
      "timezone": "Europe/London",
      "suspended": false,
      "twoFactorAuth": false,
      "created": "2025-01-20T12:48:20+00:00",
      "updated": "2025-01-20T13:00:38+00:00"
    },
    "sshKeys": [],
    "sharedUsers": [],
    "tasks": {
      "active": true,
      "lastOn": "2024-11-29 19:32:17",
      "actions": {
        "pending": []
      }
    }
  }
}