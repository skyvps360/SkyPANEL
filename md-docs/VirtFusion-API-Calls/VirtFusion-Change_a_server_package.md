# VirtFusion Global API
Endpoints
powered by Stoplight
Change a server package
put
https://cp.domain.com/api/v1/servers/{serverId}/package/{packageId}
Request
Provide your bearer token in the Authorization header when making requests to protected resources.

Example: Authorization: Bearer 123

Path Parameters
packageId
integer
required
A valid package ID as shown in VirtFusion.

Examples:
1
serverId
integer
required
A valid server ID as shown in VirtFusion.

Examples:
9
Body

application/json

application/json
backupPlan
boolean
cpu
boolean
memory
boolean
primaryDiskReadIOPS
boolean
primaryDiskReadThroughput
boolean
primaryDiskSize
boolean
primaryDiskWriteIOPS
boolean
primaryDiskWriteThroughput
boolean
primaryNetworkInboundSpeed
boolean
primaryNetworkOutboundSpeed
boolean
primaryNetworkTraffic
boolean
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
packageId*
:
1
serverId*
:
9
{
  "backupPlan": true,
  "cpu": true,
  "memory": true,
  "primaryDiskReadIOPS": false,
  "primaryDiskReadThroughput": false,
  "primaryDiskSize": true,
  "primaryDiskWriteIOPS": true,
  "primaryDiskWriteThroughput": true,
  "primaryNetworkInboundSpeed": true,
  "primaryNetworkOutboundSpeed": true,
  "primaryNetworkTraffic": true
}
{
  "backupPlan": true,
  "cpu": true,
  "memory": true,
  "primaryDiskReadIOPS": false,
  "primaryDiskReadThroughput": false,
  "primaryDiskSize": true,
  "primaryDiskWriteIOPS": true,
  "primaryDiskWriteThroughput": true,
  "primaryNetworkInboundSpeed": true,
  "primaryNetworkOutboundSpeed": true,
  "primaryNetworkTraffic": true
}
const axios = require('axios').default;

const options = {
  method: 'PUT',
  url: 'https://cp.domain.com/api/v1/servers/9/package/1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, */*',
    Authorization: 'Bearer 123'
  },
  data: {
    backupPlan: true,
    cpu: true,
    memory: true,
    primaryDiskReadIOPS: false,
    primaryDiskReadThroughput: false,
    primaryDiskSize: true,
    primaryDiskWriteIOPS: true,
    primaryDiskWriteThroughput: true,
    primaryNetworkInboundSpeed: true,
    primaryNetworkOutboundSpeed: true,
    primaryNetworkTraffic: true
  }
};

try {
  const { data } = await axios.request(options);
  console.log(data);
} catch (error) {
  console.error(error);
}
{
  "info": [
    "CPU cores not updated. It matches the current value",
    "primary disk not updated. It either matches or is lower than the current value",
    "traffic not updated. It matches the current value",
    "primary network speed inbound not updated. It matches the current value",
    "primary network speed outbound not updated. It matches the current value",
    "write IOPS not updated. It matches the current value",
    "write bytes/sec not updated. It matches the current value"
  ]
}