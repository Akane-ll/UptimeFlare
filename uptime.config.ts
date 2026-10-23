// Akane infrastructure uptime monitoring
// Managed by ZCode, config format: https://github.com/lyc8503/UptimeFlare
//
// Scope doctrine (2026-10-24): UptimeFlare is the out-of-band last-resort monitor
// (CF Workers, zero shared failure domains with the fleet). It only covers the
// observation chain itself (Beszel/Arcane), identity & lockout surface
// (Pocket ID/Vaultwarden), and bare machine liveness (SSH). Everything
// service-level is Beszel ContainerHealth's territory.

import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  title: 'Akane Status',
  links: [{ link: 'https://github.com/Akane-ll', label: 'GitHub' }],
}

const workerConfig: WorkerConfig = {
  monitors: [
    {
      id: 'bero_arcane',
      name: 'BeroVps · Arcane(自愈中枢)',
      method: 'GET',
      target: 'https://arcane.akaneri.de/',
      expectedCodes: [200, 302],
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
      id: 'nue_pocketid',
      name: 'NueVps · Pocket ID(全家SSO)',
      method: 'GET',
      target: 'https://id.akaneri.de/',
      expectedCodes: [200],
      timeout: 10000,
    },
    {
      id: 'nue_vaultwarden',
      name: 'NueVps · Vaultwarden(密码库)',
      method: 'GET',
      target: 'https://vw.akaneri.de/',
      expectedCodes: [200],
      timeout: 10000,
    },
    {
      id: 'nue_ssh',
      name: 'NueVps · SSH(22)',
      method: 'TCP_PING',
      target: '159.195.55.184:22',
      timeout: 8000,
    },
    {
      id: 'bero_ssh',
      name: 'BeroVps · SSH(22)',
      method: 'TCP_PING',
      target: '45.82.122.11:22',
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
      id: 'clt_ssh',
      name: 'CltVps · SSH(22)',
      method: 'TCP_PING',
      target: '23.246.165.93:22',
      timeout: 8000,
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
