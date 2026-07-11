import { NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useSession, signOut } from '../lib/authClient'

export default function NavBar() {
  const { cartCount } = useCart()
  const { data: session } = useSession()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <header className="navbar">
      <NavLink to="/" className="navbar-brand">
        🛒 SmartBuy
      </NavLink>
      <nav className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Shop
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
          My Orders
        </NavLink>
        <NavLink to="/cart" className={({ isActive }) => (isActive ? 'active' : '')}>
          Cart
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </NavLink>
        {session ? (
          <>
            <span className="navbar-user">Hi, {session.user.name.split(' ')[0]}</span>
            <button className="btn btn-secondary" onClick={handleSignOut}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/sign-in">Sign In</NavLink>
            <NavLink to="/sign-up" className="btn btn-primary">
              Sign Up
            </NavLink>
          </>
        )}
      </nav>
    </header>
  )
}
