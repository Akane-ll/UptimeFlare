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
      responseKeyword: 'pong',
      timeout: 25000,
    },
    {
      id: 'nue_ssh',
      name: 'NueVps · SSH(22)',
      method: 'TCP_PING',
      target: '159.195.55.184:22',
      timeout: 8000,
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
      target: 'https://ws-lax.akanell.de/37d2044b-a5ee-46d8-9190-c2d2ccfc17b1-vless',
      expectedCodes: [404],
      timeout: 10000,
    },
    {
      id: 'fra_ws',
      name: 'FraVps · ws代理',
      method: 'GET',
      target: 'https://ws-fra.akanell.de/b7212f01-5912-4b54-906b-f8fd27e522dc-vless',
      expectedCodes: [404],
      timeout: 10000,
    },
    {
      id: 'bero_ssh',
      name: 'BeroVps · SSH(22)',
      method: 'TCP_PING',
      target: '45.82.122.11:22',
      timeout: 8000,
    },
    {
      id: 'bero_arcane',
      name: 'BeroVps · Arcane(隧道)',
      method: 'GET',
      target: 'https://arcane.akaneri.de/',
      expectedCodes: [200, 302],
      timeout: 10000,
    },
    {
      id: 'nue_pocketid',
      name: 'NueVps · Pocket ID(全家SSO)',
      method: 'GET',
      target: 'https://id.akaneri.de/',
      expectedCodes: [200],
      timeout: 10000,
    },
    {
      id: 'nue_beszel',
      name: 'NueVps · Beszel hub(监控中枢)',
      method: 'GET',
      target: 'https://monitor.akaneri.de/',
      expectedCodes: [200],
      timeout: 10000,
    },
    {
      id: 'nue_openwebui',
      name: 'NueVps · Open WebUI(隧道)',
      method: 'GET',
      target: 'https://chat.akaneri.de/',
      expectedCodes: [200, 302],
      timeout: 10000,
    },
    {
      id: 'bero_baihu',
      name: 'BeroVps · 白虎签到(隧道+Access)',
      method: 'GET',
      target: 'https://baihu.akaneri.de/',
      expectedCodes: [302],
      timeout: 10000,
    },
  ],
  notification: {
    webhook: {
      url: 'https://api.telegram.org/bot__TG_BOT_TOKEN__/sendMessage',
      payloadType: 'x-www-form-urlencoded',
      payload: {
        chat_id: '6237284663',
        text: '$MSG',
      },
      timeout: 10000,
    },
    timeZone: 'Asia/Shanghai',
    gracePeriod: 2,
  },
}

const maintenances: MaintenanceConfig[] = []

export { maintenances, pageConfig, workerConfig }
