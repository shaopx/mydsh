/** Electron Node-mode startup, with private shell launchers scoped to package installation. */

import { delimiter, join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

/**
 * Per-machine corporate-network defaults, read from `<DSH_HOME>/network.json`.
 * An absent file injects nothing, so a machine with direct internet keeps its
 * inherited environment unchanged; every field is optional.
 */
interface NetworkConfigFile {
  /** HTTP proxy origin applied to both proxy variables when httpsProxy is absent. */
  readonly httpProxy?: string
  /** HTTPS proxy origin; setting either proxy variable enables Node's env-proxy fetch. */
  readonly httpsProxy?: string
  /** Comma-separated hosts that bypass the proxy. */
  readonly noProxy?: string
  /** Extra CA bundle: `"packaged"` selects the shipped `resources/mitm-ca.pem`, or an absolute PEM path. */
  readonly extraCaCerts?: string
}

/** Resolve the packaged certificate path; undefined outside a packaged Electron application. */
function packagedResource(name: string): string | undefined {
  try {
    const path = join(process.resourcesPath, name)
    return existsSync(path) ? path : undefined
  } catch {
    return undefined
  }
}

/**
 * Read `<DSH_HOME>/network.json` into environment defaults. A missing file is
 * the direct-internet case and returns an empty object; a malformed file warns
 * and injects nothing rather than starting a misconfigured Host.
 * @returns proxy and trust-chain variables that a caller-provided value overrides.
 */
function readNetworkDefaults(): NodeJS.ProcessEnv {
  let raw: string
  try {
    raw = readFileSync(join(resolveDshHome(), 'network.json'), 'utf8')
  } catch {
    return {}
  }
  let parsed: NetworkConfigFile
  try {
    parsed = JSON.parse(raw) as NetworkConfigFile
  } catch (error) {
    console.warn('desktop network: ignoring malformed network.json', error)
    return {}
  }
  const env: NodeJS.ProcessEnv = {}
  const proxy = parsed.httpsProxy ?? parsed.httpProxy
  if (typeof proxy === 'string' && proxy !== '') {
    if (typeof parsed.httpProxy === 'string' && parsed.httpProxy !== '') env.HTTP_PROXY = parsed.httpProxy
    if (typeof parsed.httpsProxy === 'string' && parsed.httpsProxy !== '') env.HTTPS_PROXY = parsed.httpsProxy
    env.NODE_USE_ENV_PROXY = '1'
  }
  if (typeof parsed.noProxy === 'string' && parsed.noProxy !== '') env.NO_PROXY = parsed.noProxy
  if (typeof parsed.extraCaCerts === 'string' && parsed.extraCaCerts !== '') {
    const certificate = parsed.extraCaCerts === 'packaged'
      ? packagedResource('mitm-ca.pem')
      : existsSync(parsed.extraCaCerts) ? parsed.extraCaCerts : undefined
    if (certificate === undefined) console.warn('desktop network: network.json names a CA bundle that is missing')
    else env.NODE_EXTRA_CA_CERTS = certificate
  }
  return env
}

/**
 * Select Electron's Node mode and the shell launcher used by package scripts.
 * @param executable - Electron executable running the application.
 * @param bin - Directory containing the node shell launcher.
 * @param environment - Caller environment preserved for plugin execution.
 * @returns Environment for a Node-mode child process.
 */
export function desktopNodeEnvironment(executable: string, bin: string | undefined, environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...readNetworkDefaults(),
    ...environment,
    ELECTRON_RUN_AS_NODE: '1',
    ...(bin === undefined ? {} : { DSH_DESKTOP_NODE_EXECUTABLE: executable, PATH: `${bin}${delimiter}${environment.PATH ?? ''}` }),
  }
}
