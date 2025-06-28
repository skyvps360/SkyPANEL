VirtFusion Global API
Endpoints
powered by Stoplight
Retrieve a packge
get
https://cp.domain.com/api/v1/packages/{packageId}
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
Responses
200
401
Body

application/json

application/json
Token
:
123
packageId*
:
1
const axios = require('axios').default;

const options = {
  method: 'GET',
  url: 'https://cp.domain.com/api/v1/packages/1',
  headers: {Accept: 'application/json, */*', Authorization: 'Bearer 123'}
};

try {
  const { data } = await axios.request(options);
  console.log(data);
} catch (error) {
  console.error(error);
}
{
  "data": {
    "id": 1,
    "name": "Test",
    "description": null,
    "enabled": true,
    "memory": 1024,
    "primaryStorage": 10,
    "traffic": 200,
    "cpuCores": 1,
    "primaryNetworkSpeedIn": 0,
    "primaryNetworkSpeedOut": 0,
    "primaryDiskType": "inherit",
    "backupPlanId": 0,
    "primaryStorageReadBytesSec": null,
    "primaryStorageWriteBytesSec": null,
    "primaryStorageReadIopsSec": null,
    "primaryStorageWriteIopsSec": null,
    "primaryStorageProfile": 1,
    "primaryNetworkProfile": 0,
    "created": "2024-03-12T22:41:31.000000Z"
  }
}