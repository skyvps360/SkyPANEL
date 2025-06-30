VirtFusion Global API
Endpoints
powered by Stoplight
Create a server
post
https://cp.domain.com/api/v1/servers
Request
Provide your bearer token in the Authorization header when making requests to protected resources.

Example: Authorization: Bearer 123

Query Parameters
dryRun
boolean
Test to see if a server can be created without actual creation. true|false Defaults to false.

Examples:
false
Body

application/json

application/json
packageId
integer
required
A valid package ID.

userId
integer
required
A valid user ID.

hypervisorId
integer
required
A valid hypervisor group ID.

ipv4
integer
Number of IPv4 addresses.

storage
integer
Number of GB primary storage.

traffic
integer
Number of GB traffic (0=unlimited).

memory
integer
Number of MB memory.

cpuCores
integer
Number of CPU cores.

networkSpeedInbound
integer
Inbound network speed (kB/s).

networkSpeedOutbound
integer
Outbound network speed (kB/s).

storageProfile
integer
Storage profile ID.

networkProfile
integer
Network profile ID.

firewallRulesets
array[integer]
Array of firewall rulesets. This will override package settings. A value of -1 will force no rulesets to be applied.

hypervisorAssetGroups
array[integer]
Array of hypervisor asset groups. This will override package settings. A value of -1 will force no groups to be applied.

additionalStorage1Enable
boolean
Enable/disable additional storage 1.

additionalStorage2Enable
boolean
Enable/disable additional storage 2.

additionalStorage1Profile
integer
Additional storage 1 profile ID.

additionalStorage2Profile
integer
Additional storage 2 profile ID.

additionalStorage1Capacity
integer
Number of GB additional storage 1 capacity.

additionalStorage2Capacity
integer
Number of GB additional storage 2 capacity.

Responses
201
401
422
Body

application/json

application/json
responses
/
201
Token
:
123
dryRun
:
Not SetFalseTrue

select an option
{
  "packageId": 1,
  "userId": 1,
  "hypervisorId": 1,
  "ipv4": 1,
  "storage": 20,
  "traffic": 20,
  "memory": 512,
  "cpuCores": 5,
  "networkSpeedInbound": 200,
  "networkSpeedOutbound": 400,
  "storageProfile": 1,
  "networkProfile": 1,
  "firewallRulesets": [
    1,
    2
  ],
  "hypervisorAssetGroups": [
    3,
    4
  ],
  "additionalStorage1Enable": true,
  "additionalStorage2Enable": false,
  "additionalStorage1Profile": 1,
  "additionalStorage2Profile": 2,
  "additionalStorage1Capacity": 10,
  "additionalStorage2Capacity": 20
}
{
  "packageId": 1,
  "userId": 1,
  "hypervisorId": 1,
  "ipv4": 1,
  "storage": 20,
  "traffic": 20,
  "memory": 512,
  "cpuCores": 5,
  "networkSpeedInbound": 200,
  "networkSpeedOutbound": 400,
  "storageProfile": 1,
  "networkProfile": 1,
  "firewallRulesets": [
    1,
    2
  ],
  "hypervisorAssetGroups": [
    3,
    4
  ],
  "additionalStorage1Enable": true,
  "additionalStorage2Enable": false,
  "additionalStorage1Profile": 1,
  "additionalStorage2Profile": 2,
  "additionalStorage1Capacity": 10,
  "additionalStorage2Capacity": 20
}
const axios = require('axios').default;

const options = {
  method: 'POST',
  url: 'https://cp.domain.com/api/v1/servers',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, */*',
    Authorization: 'Bearer 123'
  },
  data: {
    packageId: 1,
    userId: 1,
    hypervisorId: 1,
    ipv4: 1,
    storage: 20,
    traffic: 20,
    memory: 512,
    cpuCores: 5,
    networkSpeedInbound: 200,
    networkSpeedOutbound: 400,
    storageProfile: 1,
    networkProfile: 1,
    firewallRulesets: [1, 2],
    hypervisorAssetGroups: [3, 4],
    additionalStorage1Enable: true,
    additionalStorage2Enable: false,
    additionalStorage1Profile: 1,
    additionalStorage2Profile: 2,
    additionalStorage1Capacity: 10,
    additionalStorage2Capacity: 20
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
    "id": 70,
    "ownerId": 1,
    "hypervisorId": 14,
    "arch": 1,
    "name": "",
    "selfService": 0,
    "selfServiceSettings": [],
    "hostname": null,
    "commissionStatus": 0,
    "uuid": "ab68e20a-211f-4b90-99f1-8ee9068c81de",
    "state": "allocated",
    "migratable": true,
    "timezone": "_default",
    "migrateLevel": 0,
    "deleteLevel": 0,
    "configLevel": 0,
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
    "built": null,
    "created": "2025-01-20T14:00:47+00:00",
    "updated": "2025-01-20T14:00:47+00:00",
    "traffic": {
      "public": {
        "countMethod": 1,
        "currentPeriod": {
          "start": "2025-01-20T00:00:00.000000Z",
          "end": "2025-02-19T23:59:59.999999Z",
          "limit": 20
        }
      }
    },
    "settings": {
      "osTemplateInstall": true,
      "osTemplateInstallId": 0,
      "encryptedPassword": "eyJpdiI6IkF5L05USXR3OGRNMm80NVFpMXhaVnc9PSIsInZhbHVlIjoiZ0JtclcxSFhoeEdEOGJPa1J6cTVteTllOTh5YU1xM3ViUGphSS9qUTFPMD0iLCJtYWMiOiI3MWFmYzhkY2Y4ZTkxNmNjZWFhZDgzMjZlMjIwZGFhYTg2YTU2OThmYzdjN2MwYzZjNzZhNDBmZTE2MDY4MTc5IiwidGFnIjoiIn0=",
      "backupPlan": null,
      "uefi": false,
      "uefiType": 0,
      "cloudInit": true,
      "cloudInitType": 1,
      "config": [],
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
        "vendorIdValue": "WIN KVM",
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
        "memory": 512,
        "storage": 20,
        "traffic": 20,
        "cpuCores": 5
      }
    },
    "cpu": {
      "cores": 5,
      "type": "inherit",
      "typeExact": "host-model",
      "shares": 1024,
      "throttle": 0,
      "topology": {
        "enabled": false,
        "sockets": 1,
        "cores": 5,
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
        "screen": "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UPvQ+TVr1rhVq1alv6JrF52j48RM7IpCL/bqGo961KOyy8i3sikf5E9dV0HHyIfrr79+tq1zeklX17AyoIuojKisWPDznS9Do6Ojmc0rV650Dz/8sJ3GsiIC1KArAutfdvfdd3d//etf3b///W+3bNky96tf/cr985//dMuXL3fvfve70z86/3itz5gxw33pS19yt912W/r79a9/7S688EJ33333uauvvtq94Q1vyJ/i3vrWt6bxOubee+918+fPbztmt912y+J/8pOftMUtWLDAXXfddel5F1xwgfvFL36R3gxk88knn5zeVNpOSDYmYuNf/vKXNA3Zd/jhh+cv2bb9tre9LbNXeer022abbdrO9TduuOGGtc6VMElglL/vfOc7btNNN/VPSVkUpSeBe+ihh9zNN9/svvrVr7Zx6cXe5z//+W02vf3tb29L3zYuuuii7DiVhw984APZ9llnnZUe1ku6T3/607Pzlb8XvOAFlpR77GMfm/KwfP/rX//Kbvg6SDZa3N/+9rfsPFaqI4BAV8c2vfIHP/hBd+6557oddtjBDQ+345bAnXrqqcl3P9q/zLTddts5/QEccMABac3UN1E1QYmRzvn+97/vVKspCqppffazn12r5mjHPuEJT7BVd8ghh7ilS5e6LbfcMttnK6rBHXHEEc7EwPZP1EY9PaiWrp/VBO2adSxVY1y4cKG79NJL3ZOe9KSuTJDdc+bMcW9+85vTm+bGG2/c1Xn+Qddff7275557sl2ve93rsnVb0ZOMb9M//vEPi0qXvg/bIjps3H333U61Xws777yzrbo99tgjW9eK8unH++u6wRKqJ9CuGNWn16gUnv3sZ7vFixdnwqxHcNWk1XTgh9e+9rXuuc99brpLgisxnDt3bnaIanuqPetc/3F07733Tmvg2YG5Ff1BLVq0KLd37c33vOc9mZDrkflPf/qT+8Mf/tD2+L/nnns6PQko9NPGta0p3qPmiEsuuaTw9/Of/9zdcsstxSfm9oq9xPiaa65pa1KYNWuWKxJJna4as9LWTfOKK65oa0pR09NLX/rSXCouZTeevaq5W3jOc56T1mBtW0vdOCyo7HzjG9+wzdJlN5zkXwu77LKLra4l0IpQTd+Cf+xvf/tb282yQgIIdIVwP/GJT2TCJ5F9+ctfnjY7PO5xj3Ovec1r2lL+6Ec/mm6/6U1v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"
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
      "ip": "192.168.30.6",
      "port": 5904,
      "enabled": false
    },
    "network": {
      "interfaces": [
        {
          "id": 70,
          "order": 1,
          "enabled": true,
          "tag": 6927490480,
          "name": "eth0",
          "type": "public",
          "driver": null,
          "processQueues": null,
          "mac": "00:BA:76:AB:DF:4E",
          "ipv4ToMac": null,
          "ipv6ToMac": null,
          "inTrafficCount": true,
          "outTrafficCount": false,
          "inAverage": 200,
          "inPeak": 0,
          "inBurst": 0,
          "outAverage": 400,
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
          "hypervisorNetwork": 14,
          "isNat": false,
          "nat": false,
          "firewall": [],
          "hypervisorConnectivity": {
            "id": 14,
            "type": "simpleBridge",
            "bridge": "br0",
            "mtu": null,
            "primary": true,
            "default": true
          },
          "ipWhitelist": [],
          "actions": [],
          "ipv4": [
            {
              "id": 520,
              "order": 1,
              "enabled": true,
              "blockId": 3,
              "address": "192.168.30.207",
              "gateway": "192.168.30.1",
              "netmask": "255.255.255.0",
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
        "_id": 81,
        "id": 1,
        "cache": null,
        "bus": null,
        "capacity": 20,
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
        "profile": 1,
        "status": 3,
        "enabled": true,
        "primary": true,
        "created": "2025-01-20T14:00:47+00:00",
        "updated": "2025-01-20T14:00:47+00:00",
        "datastore": [],
        "name": "ab68e20a-211f-4b90-99f1-8ee9068c81de_1",
        "filename": "ab68e20a-211f-4b90-99f1-8ee9068c81de_1.img",
        "hypervisorStorageId": null,
        "local": true,
        "locationType": "mountpoint",
        "path": "/home/vf-data/disk"
      },
      {
        "_id": 82,
        "id": 2,
        "cache": null,
        "bus": null,
        "capacity": 10,
        "drive": "b",
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
        "status": 1,
        "enabled": false,
        "primary": false,
        "created": "2025-01-20T14:00:47+00:00",
        "updated": "2025-01-20T14:00:47+00:00",
        "datastore": [],
        "name": "ab68e20a-211f-4b90-99f1-8ee9068c81de_2",
        "filename": "ab68e20a-211f-4b90-99f1-8ee9068c81de_2.img",
        "hypervisorStorageId": null,
        "local": true,
        "locationType": "mountpoint",
        "path": "/home/vf-data/disk"
      }
    ],
    "hypervisorAssets": [],
    "hypervisor": {
      "id": 14,
      "ip": "192.168.30.6",
      "hostname": null,
      "port": 8892,
      "maintenance": false,
      "groupId": 1,
      "group": {
        "name": "Default",
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
      "created": "2024-05-14T11:19:04+00:00",
      "updated": "2024-06-28T21:22:01+00:00",
      "name": "Ceph Hypervisor 2",
      "dataDir": "/home/vf-data",
      "resources": {
        "servers": {
          "units": "#",
          "max": 0,
          "allocated": 4,
          "free": -4,
          "percent": null
        },
        "memory": {
          "units": "MB",
          "max": 24000,
          "allocated": 3584,
          "free": 20416,
          "percent": 14.9
        },
        "cpuCores": {
          "units": "#",
          "max": 64,
          "allocated": 8,
          "free": 56,
          "percent": 12.5
        },
        "localStorage": {
          "enabled": 1,
          "name": "Local (Default mountpoint)",
          "storageType": 1,
          "units": "GB",
          "max": 1000,
          "allocated": 40,
          "free": 960,
          "percent": 4
        },
        "otherStorage": [
          {
            "id": 2,
            "name": "Ceph RBD",
            "enabled": 0,
            "path": null,
            "units": "GB",
            "storageType": 2,
            "isDatastore": true,
            "max": 10000,
            "allocated": 10,
            "free": 9990,
            "percent": 0.1
          },
          {
            "id": 3,
            "name": "Ceph EC",
            "enabled": 0,
            "path": null,
            "units": "GB",
            "storageType": 2,
            "isDatastore": true,
            "max": 13333333,
            "allocated": 10,
            "free": 13333323,
            "percent": 0
          }
        ]
      }
    },
    "owner": {
      "id": 1,
      "admin": true,
      "extRelationId": null,
      "name": "Jon Doe",
      "email": "jon@doe.com",
      "timezone": "Europe/London",
      "suspended": false,
      "twoFactorAuth": false,
      "created": "2024-03-12T22:22:09+00:00",
      "updated": "2025-01-15T11:01:18+00:00"
    },
    "sshKeys": [],
    "sharedUsers": [],
    "tasks": {
      "active": false,
      "lastOn": null,
      "actions": {
        "pending": [
          {
            "id": 19,
            "action": "Create HDD (sdb)",
            "requires": [
              "boot",
              "restart",
              "shutdown",
              "poweroff"
            ],
            "collected": false,
            "complete": false,
            "failed": false,
            "payload": {
              "disk": {
                "id": 82,
                "disk_storage_id": null
              }
            },
            "created": "2025-01-20T14:00:47+00:00"
          }
        ]
      }
    }
  }
}