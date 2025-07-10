"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { PURCHASE_PACKAGES, type PurchasePackage } from "@/lib/packages"
import { useWallet } from "@solana/wallet-adapter-react"

// --- IMPORTANT ---
// Call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
// This is a public key, so it's safe to be exposed in the browser.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// NOTE: You will need to create these server actions to handle the payment lifecycle.
// import { createStripePaymentIntent, confirmStripePurchase } from '@/app/actions'

function CheckoutForm({
  selectedPackage,
  onSuccess,
}: {
  selectedPackage: PurchasePackage
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { publicKey } = useWallet()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!stripe || !elements || !publicKey) {
      toast.error("Payment service or wallet not ready. Please try again.")
      return
    }

    setIsProcessing(true)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?purchase_status=success`,
      },
      redirect: "if_required",
    })

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        toast.error(error.message)
      } else {
        toast.error("An unexpected error occurred.")
      }
      setIsProcessing(false)
      return
    }

    // If we get here, payment was successful without a redirect.
    toast.info("Payment successful! Updating credits...")

    // TODO: Call a server action to securely verify the payment on the backend
    // and grant credits to the user.
    // const result = await confirmStripePurchase(publicKey.toBase58(), selectedPackage.id)
    // if (result.success) {
    //   toast.success('Credits added successfully!')
    //   onSuccess()
    // } else {
    //   toast.error('Failed to add credits', { description: result.error })
    // }

    // For demonstration purposes:
    setTimeout(() => {
      toast.success("Credits added successfully!")
      onSuccess()
      setIsProcessing(false)
    }, 1000)
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <Button disabled={isProcessing || !stripe || !elements} className="w-full mt-4">
        {isProcessing ? "Processing..." : `Pay $${selectedPackage.price}`}
      </Button>
    </form>
  )
}

export function PurchaseCreditsWithStripe() {
  const [selectedPackage, setSelectedPackage] = useState<PurchasePackage | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (selectedPackage) {
      setIsLoading(true)
      // TODO: Create a server action that calls the Stripe API to create a
      // PaymentIntent and returns its client_secret.
      /*
      createStripePaymentIntent(selectedPackage.id).then(result => {
        if (result.success && result.clientSecret) {
          setClientSecret(result.clientSecret)
        } else {
          toast.error("Could not initialize payment.", { description: result.error })
          setSelectedPackage(null)
        }
        setIsLoading(false)
      })
      */

      // For demonstration, we'll just simulate this.
      // You MUST replace this with a real server action.
      setTimeout(() => {
        // This is a fake client secret for demonstration.
        setClientSecret(`pi_${selectedPackage.id}_secret_${Date.now()}`)
        setIsLoading(false)
      }, 500)
    }
  }, [selectedPackage])

  const handleCancel = () => {
    setSelectedPackage(null)
    setClientSecret(null)
  }

  if (selectedPackage) {
    const options = {
      clientSecret: clientSecret!,
      appearance: {
        theme: "night" as const,
        variables: {
          colorPrimary: "#00ff00",
          colorBackground: "#1c1c1c",
          colorText: "#ffffff",
        },
      },
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase {selectedPackage.name}</CardTitle>
          <CardDescription>Complete your payment with Stripe.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !clientSecret ? (
            <p>Initializing payment...</p>
          ) : (
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm selectedPackage={selectedPackage} onSuccess={handleCancel} />
            </Elements>
          )}
          <Button variant="ghost" className="w-full mt-2" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Line Credits (Card)</CardTitle>
        <CardDescription>Select a package to top up your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.values(PURCHASE_PACKAGES).map((pkg) => (
          <div
            key={pkg.id}
            className="p-4 border rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-800"
            onClick={() => setSelectedPackage(pkg)}
          >
            <div>
              <h3 className="font-bold">{pkg.name}</h3>
              <p className="text-sm text-gray-400">{pkg.lines} Lines</p>
            </div>
            <div className="text-lg font-bold">${pkg.price}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
