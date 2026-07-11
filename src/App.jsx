import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CatalogProvider } from './context/CatalogContext'
import { CartProvider } from './context/CartContext'
import { CheckoutProvider } from './context/CheckoutContext'
import NavBar from './components/NavBar'
import RequireAuth from './components/RequireAuth'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutShippingPage from './pages/CheckoutShippingPage'
import CheckoutPaymentPage from './pages/CheckoutPaymentPage'
import CheckoutReviewPage from './pages/CheckoutReviewPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import OrdersHistoryPage from './pages/OrdersHistoryPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'

function App() {
  return (
    <CatalogProvider>
      <CartProvider>
        <CheckoutProvider>
          <BrowserRouter>
            <NavBar />
            <main>
              <Routes>
                <Route path="/" element={<ProductsPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/sign-in" element={<SignInPage />} />
                <Route path="/sign-up" element={<SignUpPage />} />
                <Route
                  path="/checkout/shipping"
                  element={
                    <RequireAuth>
                      <CheckoutShippingPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/checkout/payment"
                  element={
                    <RequireAuth>
                      <CheckoutPaymentPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/checkout/review"
                  element={
                    <RequireAuth>
                      <CheckoutReviewPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/order-confirmation/:orderId"
                  element={
                    <RequireAuth>
                      <OrderConfirmationPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <RequireAuth>
                      <OrdersHistoryPage />
                    </RequireAuth>
                  }
                />
              </Routes>
            </main>
          </BrowserRouter>
        </CheckoutProvider>
      </CartProvider>
    </CatalogProvider>
  )
}

export default App
