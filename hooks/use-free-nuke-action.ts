/**
 * A very small wrapper that lets components treat the
 * triggerFreeNukeAction server-action like a React hook.
 *
 * Usage inside a Client Component:
 *   const freeNukeAction = useFreeNukeAction()
 *   await freeNukeAction(walletAddress, sessionId)
 */
"use client"

import { triggerFreeNukeAction } from "@/app/actions"

export function useFreeNukeAction() {
  return triggerFreeNukeAction
}
