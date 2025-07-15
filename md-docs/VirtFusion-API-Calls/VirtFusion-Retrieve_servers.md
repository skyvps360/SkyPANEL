# VirtFusion Global API
Endpoints
powered by Stoplight
Retrieve servers
get
https://cp.domain.com/api/v1/servers
Request
Provide your bearer token in the Authorization header when making requests to protected resources.

Example: Authorization: Bearer 123

Query Parameters
hypervisorId
integer
Filter by hypervisor ID. Specify multiple with hypervisorId[]=1&hypervisorId[]=2 etc...

results
integer
Number of results to return. Range between 1 and 200. Defaults to 20.

Examples:
20
type
string
simple or full. Defaults to simple.

Examples:
simple
Responses
200
401
Body

application/json

application/json
Token
:
123
hypervisorId
:
integer
results
:
example: 20
type
:
example: simple
const axios = require('axios').default;

const options = {
  method: 'GET',
  url: 'https://cp.domain.com/api/v1/servers',
  headers: {Accept: 'application/json, */*', Authorization: 'Bearer 123'}
};

try {
  const { data } = await axios.request(options);
  console.log(data);
} catch (error) {
  console.error(error);
}
{
  "current_page": 1,
  "data": [
    {
      "id": 5,
      "uuid": "1fb4b391-b360-40e7-8fe1-5b024c7508ac",
      "name": "Avaricious Trade",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 7,
      "suspended": false,
      "protected": false,
      "updated": "2024-04-02T10:15:10+00:00",
      "created": "2024-03-30T14:41:27+00:00"
    },
    {
      "id": 8,
      "uuid": "82c37680-bf8f-4712-854f-31428933703f",
      "name": "PDNS",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 3,
      "suspended": false,
      "protected": false,
      "updated": "2024-04-13T22:02:04+00:00",
      "created": "2024-04-09T11:33:43+00:00"
    },
    {
      "id": 9,
      "uuid": "5de5a89b-b707-41bf-a051-7af1a4e67795",
      "name": "server 1",
      "commissioned": 2,
      "owner": 3,
      "hypervisorId": 6,
      "suspended": false,
      "protected": false,
      "updated": "2025-01-20T14:13:50+00:00",
      "created": "2024-04-11T17:22:19+00:00"
    },
    {
      "id": 10,
      "uuid": "71178184-7554-406f-80b8-0c1d7ffcfd49",
      "name": "Respectful Exit",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 6,
      "suspended": false,
      "protected": false,
      "updated": "2024-05-13T08:16:00+00:00",
      "created": "2024-04-23T11:50:58+00:00"
    },
    {
      "id": 11,
      "uuid": "ffed8ddb-c758-41ff-8380-abb1377dfb38",
      "name": "Ubuntu Test",
      "commissioned": 0,
      "owner": 1,
      "hypervisorId": 7,
      "suspended": false,
      "protected": false,
      "updated": "2024-05-02T18:33:20+00:00",
      "created": "2024-04-25T20:18:57+00:00"
    },
    {
      "id": 19,
      "uuid": "c77ce40f-0226-43ca-b000-c9b7fe143dc7",
      "name": "Metallic National",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 2,
      "suspended": false,
      "protected": false,
      "updated": "2024-05-02T18:34:27+00:00",
      "created": "2024-05-02T10:36:37+00:00"
    },
    {
      "id": 20,
      "uuid": "785aaddd-b08b-448b-9486-baf29cd3c0f8",
      "name": "Rubbery Daughter",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 7,
      "suspended": false,
      "protected": false,
      "updated": "2024-10-07T21:32:34+00:00",
      "created": "2024-05-03T10:05:41+00:00"
    },
    {
      "id": 22,
      "uuid": "5a7e3d49-0fdf-4cfa-bb14-864f3ca0e79a",
      "name": "Frightening Clock",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 7,
      "suspended": false,
      "protected": false,
      "updated": "2024-06-08T08:30:15+00:00",
      "created": "2024-05-03T10:35:36+00:00"
    },
    {
      "id": 23,
      "uuid": "b1f6efb6-22a1-4d0a-b043-17d0ccfce4b2",
      "name": "Backup Test",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 6,
      "suspended": false,
      "protected": false,
      "updated": "2024-05-14T15:29:37+00:00",
      "created": "2024-05-04T07:30:10+00:00"
    },
    {
      "id": 26,
      "uuid": "5c681c72-6828-4fa3-8011-ced2502384e6",
      "name": "Ceph Test 1",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 13,
      "suspended": false,
      "protected": false,
      "updated": "2024-05-14T11:42:08+00:00",
      "created": "2024-05-14T10:57:56+00:00"
    },
    {
      "id": 27,
      "uuid": "8cb75e06-caae-47f5-9bf2-3ea1d341d10e",
      "name": "OVS BHV 6",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 11,
      "suspended": false,
      "protected": false,
      "updated": "2024-05-17T13:25:10+00:00",
      "created": "2024-05-16T16:56:12+00:00"
    },
    {
      "id": 28,
      "uuid": "3a63170a-2350-422d-8cfb-449ed6940414",
      "name": "OVS BHV 7",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 12,
      "suspended": false,
      "protected": false,
      "updated": "2024-05-17T13:25:04+00:00",
      "created": "2024-05-16T18:13:44+00:00"
    },
    {
      "id": 29,
      "uuid": "f24aebac-016c-4139-afcf-5dbfeda54fc8",
      "name": "OVS BHV 1",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 6,
      "suspended": false,
      "protected": false,
      "updated": "2024-05-17T13:25:00+00:00",
      "created": "2024-05-17T11:25:13+00:00"
    },
    {
      "id": 30,
      "uuid": "67486d4d-d974-45c3-a680-980bc84635d8",
      "name": "Test 10",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 1,
      "suspended": false,
      "protected": false,
      "updated": "2024-06-07T16:41:45+00:00",
      "created": "2024-06-07T12:03:00+00:00"
    },
    {
      "id": 36,
      "uuid": "a3df9e3c-893e-4f42-ad90-cf34df155589",
      "name": "Frail Text",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 13,
      "suspended": false,
      "protected": false,
      "updated": "2024-06-28T21:25:57+00:00",
      "created": "2024-06-28T13:39:55+00:00"
    },
    {
      "id": 37,
      "uuid": "a3b2e9f8-9b5c-44a3-bcb6-bbadf9bd83e2",
      "name": "Stark Brown",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 13,
      "suspended": false,
      "protected": false,
      "updated": "2024-08-23T20:15:25+00:00",
      "created": "2024-06-28T21:36:23+00:00"
    },
    {
      "id": 38,
      "uuid": "8c6f63d1-ec53-4e1a-a52f-d50f03b05c70",
      "name": "",
      "commissioned": 0,
      "owner": 1,
      "hypervisorId": 14,
      "suspended": false,
      "protected": false,
      "updated": "2024-08-23T20:17:42+00:00",
      "created": "2024-08-23T20:17:42+00:00"
    },
    {
      "id": 39,
      "uuid": "539bff72-f6cd-4260-96f1-b7523fd890c5",
      "name": "Thorny Impression",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 14,
      "suspended": false,
      "protected": false,
      "updated": "2024-08-23T20:20:32+00:00",
      "created": "2024-08-23T20:18:39+00:00"
    },
    {
      "id": 40,
      "uuid": "ce445459-c716-4f88-a7c6-a0ffd29eb9b2",
      "name": "Present Charge",
      "commissioned": 2,
      "owner": 1,
      "hypervisorId": 14,
      "suspended": false,
      "protected": false,
      "updated": "2024-08-23T20:57:22+00:00",
      "created": "2024-08-23T20:56:04+00:00"
    },
    {
      "id": 41,
      "uuid": "6fce272f-c6ea-45bd-bf24-d4d357d9a788",
      "name": "CP Test",
      "commissioned": 3,
      "owner": 1,
      "hypervisorId": 13,
      "suspended": false,
      "protected": false,
      "updated": "2024-08-27T11:10:48+00:00",
      "created": "2024-08-27T11:09:54+00:00"
    }
  ],
  "first_page_url": "https://192.168.3.11/api/v1/servers?page=1",
  "from": 1,
  "last_page": 2,
  "last_page_url": "https://192.168.3.11/api/v1/servers?page=2",
  "links": [
    {
      "url": null,
      "label": "&laquo; Previous",
      "active": false
    },
    {
      "url": "https://192.168.3.11/api/v1/servers?page=1",
      "label": "1",
      "active": true
    },
    {
      "url": "https://192.168.3.11/api/v1/servers?page=2",
      "label": "2",
      "active": false
    },
    {
      "url": "https://192.168.3.11/api/v1/servers?page=2",
      "label": "Next &raquo;",
      "active": false
    }
  ],
  "next_page_url": "https://192.168.3.11/api/v1/servers?page=2",
  "path": "https://192.168.3.11/api/v1/servers",
  "per_page": 20,
  "prev_page_url": null,
  "to": 20,
  "total": 27
}