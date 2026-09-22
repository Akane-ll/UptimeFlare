// Akane infrastructure uptime monitoring
// Managed by ZCode, config format: https://github.com/lyc8503/UptimeFlare

import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  title: 'Akane Status',
  links: [{ link: 'https://github.com/Akane-ll', label: 'GitHub' }],
}

const workerConfig: WorkerConfig = {
  monitors: [
    {
      id: 'nue_panel',
      name: 'NueVps · 1panel(隧道)',
      method: 'GET',
      target: 'https://panel.akaneri.de/',
      expectedCodes: [200, 302],
      timeout: 10000,
    },
    {
      id: 'nue_immich',
      name: 'NueVps · Immich(443直连)',
      method: 'GET',
      target: 'https://immich.akaneri.de/api/server/ping',
      expectedCodes: [200],
      timeout: 15000,
    },
    {
      id: 'nue_ssh',
      name: 'NueVps · SSH(22)',
      method: 'TCP_PING',
      target: '159.195.55.184:22',
      timeout: 8000,
    },
    {
      id: 'lax_jellyfin',
      name: 'LaxVps · Jellyfin(隧道)',
      method: 'GET',
      target: 'https://jellyfin.703040.xyz/',
      expectedCodes: [200, 302],
      timeout: 10000,
    },
    {
      id: 'lax_ssh',
      name: 'LaxVps · SSH(22)',
      method: 'TCP_PING',
      target: '23.80.91.107:22',
      timeout: 8000,
    },
    {
      id: 'laxvm_ws',
      name: 'LaxVm · ws代理',
      method: 'GET',
      target: 'https://ws-lax.akaneri.de/37d2044b-a5ee-46d8-9190-c2d2ccfc17b1-vless',
      expectedCodes: [404],
      timeout: 10000,
    },
    {
      id: 'lonvps_ws',
      name: 'LonVps · ws代理',
      method: 'GET',
      target: 'https://ws-lon.akaneri.de/2e691486-98a7-4044-9e84-20316a23853d-vless',
      expectedCodes: [404],
      timeout: 10000,
    },
  ],
  notification: {
    webhook: {
      url: 'https://api.telegram.org/bot8261944731:AAFdLF3PGjhPwTJ4MJqxR6GaZfyeQeyOMRg/sendMessage',
      payloadType: 'x-www-form-urlencoded',
      payload: {
        chat_id: '6237284663',
        text: '$MSG',
      },
      timeout: 10000,
    },
    timeZone: 'Asia/Shanghai',
    gracePeriod: 3,
  },
}

const maintenances: MaintenanceConfig[] = []

export { maintenances, pageConfig, workerConfig }
