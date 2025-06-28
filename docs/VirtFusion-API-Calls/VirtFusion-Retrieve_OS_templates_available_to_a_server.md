# VirtFusion Global API
Endpoints
powered by Stoplight
Retrieve OS templates available to a server
get
https://cp.domain.com/api/v1/servers/{serverId}/templates
Request
Provide your bearer token in the Authorization header when making requests to protected resources.

Example: Authorization: Bearer 123

Path Parameters
serverId
integer
required
A valid server ID as shown in VirtFusion.

Examples:
69
Responses
200
401
Body

application/json

application/json
Token
:
123
serverId*
:
69
const axios = require('axios').default;

const options = {
  method: 'GET',
  url: 'https://cp.domain.com/api/v1/servers/69/templates',
  headers: {Accept: 'application/json, */*', Authorization: 'Bearer 123'}
};

try {
  const { data } = await axios.request(options);
  console.log(data);
} catch (error) {
  console.error(error);
}
{
  "data": [
    {
      "name": "Debian",
      "description": "Debian GNU/Linux, is a Linux distribution composed of free and open-source software, developed by the community-supported Debian Project.",
      "icon": "debian_logo.png",
      "templates": [
        {
          "id": 8,
          "name": "Debian",
          "version": "11 (Bullseye)",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using Advanced Package Tool (APT), the main command-line package manager for Debian.",
          "icon": "debian_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        },
        {
          "id": 46,
          "name": "Debian",
          "version": "12 (Bookworm)",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using Advanced Package Tool (APT), the main command-line package manager for Debian.",
          "icon": "debian_logo.png",
          "eol": false,
          "eol_date": "2024-04-23 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        },
        {
          "id": 56,
          "name": "Debian",
          "version": "12 (Bookworm)",
          "variant": "Test",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using Advanced Package Tool (APT), the main command-line package manager for Debian.",
          "icon": "debian_logo.png",
          "eol": false,
          "eol_date": "2024-04-23 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": true,
          "type": "linux"
        }
      ],
      "id": 1
    },
    {
      "name": "CentOS",
      "description": "The CentOS Linux distribution is a stable, predictable, manageable and reproducible platform derived from the sources of Red Hat Enterprise Linux (RHEL).",
      "icon": "centos_logo.png",
      "templates": [
        {
          "id": 1,
          "name": "CentOS",
          "version": "7",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using Yum, the main command-line package manager for CentOS.",
          "icon": "centos_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        },
        {
          "id": 2,
          "name": "CentOS Stream",
          "version": "9",
          "variant": "Minimal",
          "arch": 1,
          "description": "Base installation with limited packages. New packages are easily installed using DNF (yum), the main command-line package manager for CentOS.",
          "icon": "centos_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        }
      ],
      "id": 2
    },
    {
      "name": "Rocky Linux",
      "description": "Rocky Linux is a community enterprise operating system designed to be 100% bug-for-bug compatible with America's top enterprise Linux distribution now that its downstream partner has shifted direction. It is under intensive development by the community. Rocky Linux is led by Gregory Kurtzer, founder of the CentOS project.",
      "icon": "rocky_linux_logo.png",
      "templates": [
        {
          "id": 7,
          "name": "Rocky Linux",
          "version": "8",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using DNF (yum), the main command-line package manager for Rocky Linux.",
          "icon": "rocky_linux_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        },
        {
          "id": 13,
          "name": "Rocky Linux",
          "version": "9",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using DNF (yum), the main command-line package manager for Rocky Linux.",
          "icon": "rocky_linux_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        }
      ],
      "id": 3
    },
    {
      "name": "AlmaLinux",
      "description": "AlmaLinux OS is an open-source, community-driven project that intends provide and alternative to the CentOS Stable release. AlmaLinux is an OS that is 1:1 binary compatible with RHEL® 8 and a global collaborative of the developer community, industry, academia and research which build upon this technology to empower humanity.",
      "icon": "almalinux_logo.png",
      "templates": [
        {
          "id": 6,
          "name": "AlmaLinux",
          "version": "8",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using DNF (yum), the main command-line package manager for AlmaLinux.",
          "icon": "almalinux_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        },
        {
          "id": 12,
          "name": "ARM -> AlmaLinux",
          "version": "9",
          "variant": "Latest",
          "arch": 1,
          "description": "Latest version with base packages. New packages are easily installed using DNF (yum), the main command-line package manager for AlmaLinux.",
          "icon": "almalinux_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        }
      ],
      "id": 4
    },
    {
      "name": "Ubuntu",
      "description": "The most popular server Linux in the cloud and data centre, you can rely on Ubuntu Server and its five years of guaranteed free upgrades.",
      "icon": "ubuntu_logo.png",
      "templates": [
        {
          "id": 3,
          "name": "Ubuntu Server",
          "version": "20.04 LTS (Focal Fossa)",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using Advanced Package Tool (APT), the main command-line package manager for Ubuntu.",
          "icon": "ubuntu_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        },
        {
          "id": 4,
          "name": "Ubuntu Server",
          "version": "18.04 LTS (Bionic Beaver)",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using Advanced Package Tool (APT), the main command-line package manager for Ubuntu.",
          "icon": "ubuntu_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        },
        {
          "id": 9,
          "name": "Ubuntu Server",
          "version": "22.04 LTS (Jammy Jellyfish)",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using Advanced Package Tool (APT), the main command-line package manager for Ubuntu.",
          "icon": "ubuntu_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        },
        {
          "id": 49,
          "name": "Ubuntu Server",
          "version": "24.04 LTS (Noble Numbat)",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using Advanced Package Tool (APT), the main command-line package manager for Ubuntu.",
          "icon": "ubuntu_logo.png",
          "eol": false,
          "eol_date": "2024-04-25 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        }
      ],
      "id": 5
    },
    {
      "name": "Fedora",
      "description": "Fedora Server is a powerful, flexible operating system that includes the best and latest datacenter technologies. It puts you in control of all your infrastructure and services.",
      "icon": "fedora_logo.png",
      "templates": [
        {
          "id": 11,
          "name": "Fedora",
          "version": "37",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using DNF (yum), the main command-line package manager for Fedora.",
          "icon": "fedora_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        },
        {
          "id": 14,
          "name": "Fedora",
          "version": "38",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using DNF (yum), the main command-line package manager for Fedora.",
          "icon": "fedora_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        },
        {
          "id": 15,
          "name": "Fedora",
          "version": "39",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using DNF (yum), the main command-line package manager for Fedora.",
          "icon": "fedora_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        },
        {
          "id": 59,
          "name": "Fedora",
          "version": "41",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages. New packages are easily installed using DNF (yum), the main command-line package manager for Fedora.",
          "icon": "fedora_logo.png",
          "eol": false,
          "eol_date": "2024-12-18 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        }
      ],
      "id": 6
    },
    {
      "name": "FreeBSD",
      "description": "FreeBSD is an operating system used to power modern servers, desktops, and embedded platforms. A large community has continually developed it for more than thirty years. Its advanced networking, security, and storage features have made FreeBSD the platform of choice for many of the busiest web sites and most pervasive embedded networking and storage devices.",
      "icon": "freebsd_logo.png",
      "templates": [
        {
          "id": 52,
          "name": "FreeBSD",
          "version": "13.3",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages.",
          "icon": "freebsd_logo.png",
          "eol": false,
          "eol_date": "2024-05-15 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "unix"
        },
        {
          "id": 53,
          "name": "FreeBSD",
          "version": "14.0",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages.",
          "icon": "freebsd_logo.png",
          "eol": false,
          "eol_date": "2024-05-15 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "unix"
        },
        {
          "id": 55,
          "name": "FreeBSD",
          "version": "14.2",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages.",
          "icon": "freebsd_logo.png",
          "eol": false,
          "eol_date": "2024-10-20 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": true,
          "type": "unix"
        },
        {
          "id": 58,
          "name": "FreeBSD",
          "version": "13.2",
          "variant": "Minimal",
          "arch": 1,
          "description": "Minimal installation with limited packages.",
          "icon": "freebsd_logo.png",
          "eol": false,
          "eol_date": "2024-12-10 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "unix"
        }
      ],
      "id": 7
    },
    {
      "name": "Other",
      "description": "",
      "icon": "linux_logo.png",
      "templates": [
        {
          "id": 5,
          "name": "openSUSE",
          "version": "Leap 15",
          "variant": "Minimal",
          "arch": 1,
          "description": "openSUSE is a project that serves to promote the use of free and open-source software.<br><br>Minimal installation with limited packages. New packages are easily installed using Zypper, the main command-line package manager for openSUSE.",
          "icon": "opensuse_logo.png",
          "eol": false,
          "eol_date": "2024-03-12 00:00:00",
          "eol_warning": false,
          "deploy_type": 1,
          "vnc": false,
          "type": "linux"
        }
      ],
      "id": 0
    }
  ]
}