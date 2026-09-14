
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  oldPrice: number;
  emoji: string;
  color: string;
};

type CartItem = Product & {
  quantity: number;
};

const products: Product[] = [
  { id: 1, name: "Classic Sneakers", category: "Shoes", price: 2499, oldPrice: 3299, emoji: "👟", color: "#e9e5dc" },
  { id: 2, name: "Everyday Backpack", category: "Bags", price: 1899, oldPrice: 2499, emoji: "🎒", color: "#dce5e2" },
  { id: 3, name: "Minimal Watch", category: "Accessories", price: 2999, oldPrice: 3999, emoji: "⌚", color: "#e4e1eb" },
  { id: 4, name: "Cotton Overshirt", category: "Clothing", price: 1599, oldPrice: 2199, emoji: "👕", color: "#e8ded4" },
  { id: 5, name: "Wireless Headphones", category: "Tech", price: 4499, oldPrice: 5999, emoji: "🎧", color: "#dfe5ee" },
  { id: 6, name: "Everyday Sunglasses", category: "Accessories", price: 1299, oldPrice: 1799, emoji: "🕶️", color: "#e6e1d8" },
  { id: 7, name: "Relaxed T-Shirt", category: "Clothing", price: 899, oldPrice: 1299, emoji: "👚", color: "#e8e0e5" },
  { id: 8, name: "Travel Sneakers", category: "Shoes", price: 2799, oldPrice: 3499, emoji: "👞", color: "#dfe3d8" },
];

const categories = [
  "All",
  "Clothing",
  "Shoes",
  "Bags",
  "Accessories",
  "Tech",
];

const money = (value: number): string =>
  `₹${value.toLocaleString("en-IN")}`;

function HomePage() {
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [liked, setLiked] = useState<number[]>([]);
  const [notice, setNotice] = useState<string>("");

  const filteredProducts = useMemo<Product[]>(() => {
    return products.filter((product: Product) => {
      const matchesCategory =
        category === "All" || product.category === category;

      const matchesSearch = product.name
        .toLowerCase()
        .includes(query.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [category, query]);

  const cartCount: number = cart.reduce(
    (sum: number, item: CartItem) => sum + item.quantity,
    0
  );

  const subtotal: number = cart.reduce(
    (sum: number, item: CartItem) => sum + item.price * item.quantity,
    0
  );

  function addToCart(product: Product): void {
    setCart((current: CartItem[]) => {
      const existing = current.find(
        (item: CartItem) => item.id === product.id
      );

      if (existing) {
        return current.map((item: CartItem) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });

    setNotice(`${product.name} added to your cart`);
  }

  function updateQuantity(id: number, change: number): void {
    setCart((current: CartItem[]) =>
      current
        .map((item: CartItem) =>
          item.id === id
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item: CartItem) => item.quantity > 0)
    );
  }

  function toggleLike(id: number): void {
    setLiked((current: number[]) =>
      current.includes(id)
        ? current.filter((item: number) => item !== id)
        : [...current, id]
    );
  }

  function scrollToShop(): void {
    document.getElementById("shop")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  return (
    <div className="app">
      <div className="topbar">
        Free shipping on orders over ₹2,000
      </div>

      <header className="header">
        <a className="logo" href="#">
          <span>✦</span> shopora
        </a>

        <nav>
          <a href="#shop">Shop</a>
          <a href="#new">New arrivals</a>
          <a href="#offers">Offers</a>
           <Link to="/login">BonusPoints</Link>
        </nav>

        <div className="header-actions">
          <div className="search">
            <span>⌕</span>
            <input
              placeholder="Search products..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
            />
          </div>

          <button
            className="icon-btn"
            onClick={() => setCartOpen(true)}
            aria-label="Open shopping cart"
          >
            🛒
            {cartCount > 0 && <b>{cartCount}</b>}
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="new">
          <div className="hero-copy">
            <span className="eyebrow">NEW COLLECTION · 2026</span>

            <h1>
              Elevate your
              <br />
              everyday.
            </h1>

            <p>
              Thoughtfully designed essentials that bring style,
              comfort, and simplicity into your everyday life.
            </p>

            <button className="primary-btn" onClick={scrollToShop}>
              Shop collection <span>→</span>
            </button>
          </div>

          <div className="hero-art">
            <div className="art-circle" />
            <div className="art-card art-card-one">✦</div>
            <div className="art-card art-card-two">◒</div>
            <div className="art-label">
              ESSENTIAL
              <br />
              OBJECTS
            </div>
          </div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CURATED FOR YOU</span>
              <h2>Trending now</h2>
            </div>

            <span className="product-count">
              {filteredProducts.length} products
            </span>
          </div>

          <div className="category-row">
            {categories.map((item: string) => (
              <button
                key={item}
                className={
                  category === item
                    ? "category active"
                    : "category"
                }
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="product-grid">
            {filteredProducts.map((product: Product) => (
              <article className="product-card" key={product.id}>
                <div
                  className="product-image"
                  style={{ background: product.color }}
                >
                  <span className="product-emoji">
                    {product.emoji}
                  </span>

                  <button
                    className="heart-btn"
                    onClick={() => toggleLike(product.id)}
                    aria-label="Add to wishlist"
                  >
                    {liked.includes(product.id) ? "♥" : "♡"}
                  </button>

                  {product.id <= 4 && (
                    <span className="tag">NEW</span>
                  )}
                </div>

                <div className="product-info">
                  <span className="product-category">
                    {product.category}
                  </span>

                  <h3>{product.name}</h3>

                  <div className="price-row">
                    <strong>{money(product.price)}</strong>
                    <del>{money(product.oldPrice)}</del>
                  </div>

                  <button
                    className="add-btn"
                    onClick={() => addToCart(product)}
                  >
                    Add to cart <span>+</span>
                  </button>
                </div>
              </article>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="empty">
              No products found. Try another search.
            </div>
          )}
        </section>

        <section className="offer" id="offers">
          <div>
            <span className="eyebrow">LIMITED TIME OFFER</span>

            <h2>
              Good things,
              <br />
              better prices.
            </h2>

            <p>Get up to 30% off selected essentials.</p>
          </div>

          <button
            className="primary-btn"
            onClick={() => {
              setCategory("All");
              setQuery("");
              scrollToShop();
            }}
          >
            Explore offers →
          </button>
        </section>
      </main>

      <footer>
        <div className="logo">
          <span>✦</span> shopora
        </div>

        <p>Designed for everyday living.</p>
        <span>© 2026 Shopora</span>
      </footer>

      {notice && (
        <div className="toast">
          <span>✓</span>
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}

      {cartOpen && (
        <div
          className="overlay"
          onClick={() => setCartOpen(false)}
        >
          <aside
            className="cart"
            onClick={(e: React.MouseEvent<HTMLElement>) =>
              e.stopPropagation()
            }
          >
            <div className="cart-header">
              <h2>Your cart ({cartCount})</h2>

              <button onClick={() => setCartOpen(false)}>×</button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <span>🛍️</span>
                <h3>Your cart is empty</h3>
                <p>Add something you love.</p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item: CartItem) => (
                    <div className="cart-item" key={item.id}>
                      <div
                        className="cart-thumb"
                        style={{ background: item.color }}
                      >
                        {item.emoji}
                      </div>

                      <div className="cart-details">
                        <strong>{item.name}</strong>
                        <span>{money(item.price)}</span>

                        <div className="quantity">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, -1)
                            }
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            onClick={() =>
                              updateQuantity(item.id, 1)
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-total">
                  <div>
                    <span>Subtotal</span>
                    <strong>{money(subtotal)}</strong>
                  </div>

                  <small>
                    Taxes and shipping calculated at checkout.
                  </small>

                  <button
                    className="primary-btn full"
                    onClick={() =>
                      alert(
                        "Demo checkout — no payment is processed."
                      )
                    }
                  >
                    Checkout →
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default HomePage;