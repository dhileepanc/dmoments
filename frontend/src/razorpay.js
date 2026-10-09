let scriptPromise = null

function loadScript() {
  if (window.Razorpay) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.async = true
      s.onload = () => (window.Razorpay ? resolve() : reject(new Error('Razorpay SDK failed to load')))
      s.onerror = () => reject(new Error('Could not load Razorpay checkout. Check your internet connection.'))
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

export function startPayment({ key_id, order_id, amount, currency, name, description, email, contact }) {
  return loadScript().then(
    () =>
      new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: key_id,
          order_id,
          amount: Math.round(Number(amount) * 100),
          currency,
          name: name || 'AI Photo Platform',
          description,
          prefill: { email, contact },
          handler: (resp) => resolve(resp),
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        })
        rzp.on('payment.failed', (e) =>
          reject(new Error(e?.error?.description || 'Payment failed'))
        )
        rzp.open()
      })
  )
}

export function formatMoney(amount, currency) {
  return `${amount} ${currency}`
}