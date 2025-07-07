import type { ToasterProps } from "sonner"
import { Toaster as SonnerToaster } from "sonner"

/**
 * A thin shadcn-style wrapper around the `sonner` Toaster so that
 * it can be imported from `@/components/ui/sonner`.
 *
 * Usage:
 *   import { Toaster } from "@/components/ui/sonner"
 */
export function Toaster(props: ToasterProps) {
  return <SonnerToaster {...props} />
}
