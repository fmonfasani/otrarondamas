import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/catalog">Catalog</Link>
            </li>
            <li>
              <Link to="/cart">Cart & Checkout</Link>
            </li>
          </ul>
        </nav>

        <h1>Tienda Online App</h1>

        <Routes>
          <Route path="/" element={<h2>Welcome to the Online Store</h2>} />
          <Route path="/catalog" element={<h2>Public Catalog Placeholder</h2>} />
          <Route
            path="/cart"
            element={<h2>Cart & Checkout Placeholder (Mercado Pago D-03 pending)</h2>}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
