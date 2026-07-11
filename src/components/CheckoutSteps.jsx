const STEPS = [
  { key: 'cart', label: 'Cart' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'payment', label: 'Payment' },
  { key: 'review', label: 'Review & Place Order' },
]

export default function CheckoutSteps({ current }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current)

  return (
    <ol className="checkout-steps">
      {STEPS.map((step, index) => (
        <li
          key={step.key}
          className={
            index === currentIndex ? 'checkout-step active' : index < currentIndex ? 'checkout-step done' : 'checkout-step'
          }
        >
          <span className="checkout-step-number">{index + 1}</span>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  )
}
