import { DurableObject } from 'cloudflare:workers'
import { MonitorTarget } from '../../types/config'
import { workerConfig } from '../../uptime.config'
import { doMonitor, getStatus } from './monitor'
import { formatAndNotify, getWorkerLocation } from './util'
import { CompactedMonitorStateWrapper, getFromStore, setToStore } from './store'
import pLimit from 'p-limit'

export interface Env {
  REMOTE_CHECKER_DO: DurableObjectNamespace<RemoteChecker>
  UPTIMEFLARE_D1: D1Database
}

const Worker = {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const workerLocation = (await getWorkerLocation()) || 'ERROR'
    console.log(`Running scheduled event on ${workerLocation}...`)

    // Create a wrapped MonitorState from stored compacted state
    const state = new CompactedMonitorStateWrapper(await getFromStore(env, 'state'))
    state.data.overallDown = 0
    state.data.overallUp = 0

    let statusChanged = false
    const currentTimeSecond = Math.round(Date.now() / 1000)

    // Parallel check multiple monitors
    // Max concurrent connection is 6 limited by Cloudflare Workers, we use 5 here to be safe
    type CheckResult = { id: string; location: string; status: { ping: number; up: boolean; err: string } }
    let checkQueue: Promise<CheckResult>[] = []
    let checkResult: Record<string, CheckResult> = {};
    const limit = pLimit(5);
    for (const monitor of workerConfig.monitors) {
      checkQueue.push(limit(() => doMonitor(monitor, workerLocation, env)))
    }
    for (const result of await Promise.all(checkQueue)) {
      checkResult[result.id] = result
    }

    // Update each monitor's state based on check results
    for (const monitor of workerConfig.monitors) {
      console.log(`Processing monitor result: ${monitor.name} (${monitor.id})`)

      let monitorStatusChanged = false
      const { location: checkLocation, status } = checkResult[monitor.id]

      // Update counters
      status.up ? state.data.overallUp++ : state.data.overallDown++

      // Update incidents
      // Create a dummy incident to store the start time of the monitoring and simplify logic
      if (state.incidentLen(monitor.id) === 0) {
        state.appendIncident(monitor.id, {
          start: [currentTimeSecond],
          end: currentTimeSecond,
          error: ['dummy'],
        })
      }

      // Then lastIncident here must not be null
      let lastIncident = state.getIncident(monitor.id, state.incidentLen(monitor.id) - 1)

      if (status.up) {
        // Current status is up
        // close existing incident if any
        if (lastIncident.end === null) {
          lastIncident.end = currentTimeSecond
          // write back the modified last incident
          state.setIncident(monitor.id, state.incidentLen(monitor.id) - 1, lastIncident)

          monitorStatusChanged = true
          try {
            if (
              // grace period not set OR ...
              workerConfig.notification?.gracePeriod === undefined ||
              // only when we have sent a notification for DOWN status, we will send a notification for UP status (within 30 seconds of possible drift)
              currentTimeSecond - lastIncident.start[0] >=
                (workerConfig.notification.gracePeriod + 1) * 60 - 30
            ) {
              await formatAndNotify(monitor, true, lastIncident.start[0], currentTimeSecond, 'OK')
            } else {
              console.log(
                `grace period (${workerConfig.notification?.gracePeriod}m) not met, skipping webhook UP notification for ${monitor.name}`
              )
            }

            console.log('Calling config onStatusChange callback...')
            await workerConfig.callbacks?.onStatusChange?.(
              env,
              monitor,
              true,
              lastIncident.start[0],
              currentTimeSecond,
              'OK'
            )
          } catch (e) {
            console.log('Error calling callback: ')
            console.log(e)
          }
        }
      } else {
        // Current status is down
        // open new incident if not already open
        if (lastIncident.end !== null) {
          state.appendIncident(monitor.id, {
            start: [currentTimeSecond],
            end: null,
            error: [status.err],
          })
          monitorStatusChanged = true
        } else if (lastIncident.end === null && lastIncident.error.slice(-1)[0] !== status.err) {
          // append if the error message changes
          lastIncident.start.push(currentTimeSecond)
          lastIncident.error.push(status.err)

          // write back the modified last incident
          state.setIncident(monitor.id, state.incidentLen(monitor.id) - 1, lastIncident)
          monitorStatusChanged = true
        }

        const currentIncident = state.getIncident(monitor.id, state.incidentLen(monitor.id) - 1)
        const downtimeNow = currentTimeSecond - currentIncident.start[0]
        const gracePeriod = workerConfig.notification?.gracePeriod
        const isOpenEvent = monitorStatusChanged && currentIncident.start.length === 1
        const isErrorChange = monitorStatusChanged && currentIncident.start.length > 1
        const pastGrace = downtimeNow >= (gracePeriod ?? 0) * 60 - 30
        const downNotified = currentIncident.downNotified === true

        try {
          let shouldNotifyDown: boolean
          if (gracePeriod === undefined) {
            // No grace period: notify on incident open and on error reason change (upstream default)
            shouldNotifyDown = monitorStatusChanged
          } else if (isErrorChange) {
            // Reason changed mid-incident: re-notify past grace unless the user opted out
            shouldNotifyDown = pastGrace && !workerConfig.notification?.skipErrorChangeNotification
          } else {
            // Steady downtime: fire once per incident once grace has passed.
            // Latch survives only a successful send, so a failed send retries on the next check
            // and a jittered late check still fires instead of falling out of a fixed window.
            shouldNotifyDown = pastGrace && !downNotified
          }

          if (shouldNotifyDown) {
            await formatAndNotify(
              monitor,
              false,
              currentIncident.start[0],
              currentTimeSecond,
              status.err
            )
            if (gracePeriod !== undefined) {
              currentIncident.downNotified = true
              state.setIncident(monitor.id, state.incidentLen(monitor.id) - 1, currentIncident)
            }
          } else {
            console.log(
              `Grace period (${gracePeriod}m) not met or already notified (currently down for ${downtimeNow}s), skipping webhook DOWN notification for ${
                monitor.name
              }`
            )
          }

          if (monitorStatusChanged) {
            console.log('Calling config onStatusChange callback...')
            await workerConfig.callbacks?.onStatusChange?.(
              env,
              monitor,
              false,
              currentIncident.start[0],
              currentTimeSecond,
              status.err
            )
          }
        } catch (e) {
          console.log('Error calling callback: ')
          console.log(e)
        }

        try {
          console.log('Calling config onIncident callback...')
          await workerConfig.callbacks?.onIncident?.(
            env,
            monitor,
            currentIncident.start[0],
            currentTimeSecond,
            status.err
          )
        } catch (e) {
          console.log('Error calling callback: ')
          console.log(e)
        }
      }

      // append to latency data
      state.appendLatency(monitor.id, {
        loc: checkLocation,
        ping: status.ping,
        time: currentTimeSecond,
      })

      // discard old data
      while (state.getFirstLatency(monitor.id).time < currentTimeSecond - 12 * 60 * 60) {
        state.unshiftLatency(monitor.id)
      }

      // discard old incidents
      while (
        state.incidentLen(monitor.id) > 0 &&
        state.getIncident(monitor.id, 0).end &&
        state.getIncident(monitor.id, 0).end! < currentTimeSecond - 90 * 24 * 60 * 60
      ) {
        state.shiftIncident(monitor.id)
      }

      if (
        state.incidentLen(monitor.id) === 0 ||
        (state.getIncident(monitor.id, 0).start[0] > currentTimeSecond - 90 * 24 * 60 * 60 &&
          state.getIncident(monitor.id, 0).error[0] != 'dummy')
      ) {
        // put the dummy incident back
        state.unshiftIncident(monitor.id, {
          start: [currentTimeSecond - 90 * 24 * 60 * 60],
          end: currentTimeSecond - 90 * 24 * 60 * 60,
          error: ['dummy'],
        })
      }

      statusChanged ||= monitorStatusChanged
    }

    console.log(
      `statusChanged: ${statusChanged}, lastUpdate: ${state.data.lastUpdate}, currentTime: ${currentTimeSecond}`
    )
    // Update state
    // Allow for a cooldown period before writing to storage
    if (
      statusChanged ||
      currentTimeSecond - state.data.lastUpdate >=
        (workerConfig.kvWriteCooldownMinutes ?? 3) * 60 - 10 // Allow for 10 seconds of clock drift
    ) {
      console.log('Updating state...')
      state.data.lastUpdate = currentTimeSecond
      await setToStore(env, 'state', state.getCompactedStateStr())
    } else {
      console.log('Skipping state update due to cooldown period.')
    }
  },
}

export default Worker

export class RemoteChecker extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  async getLocationAndStatus(
    monitor: MonitorTarget
  ): Promise<{ location: string; status: { ping: number; up: boolean; err: string } }> {
    const colo = (await getWorkerLocation()) as string
    console.log(`Running remote checker (DurableObject) at ${colo}...`)
    const status = await getStatus(monitor)
    return {
      location: colo,
      status: status,
    }
  }

  async kill() {
    // Throwing an error in `blockConcurrencyWhile` will terminate the Durable Object instance
    // https://developers.cloudflare.com/durable-objects/api/state/#blockconcurrencywhile
    this.ctx.blockConcurrencyWhile(async () => {
      throw 'killed'
    })
  }
}
