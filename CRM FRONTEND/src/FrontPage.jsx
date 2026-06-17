import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function FrontPage() {

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="front-page">

      <div className="front-card">

        {/* LOGO */}
        <div className="front-logo">
          <img src="./rabah-logo-blk.png" alt="logo" />
        </div>

        {/* LOADER */}
        {loading ? (

          <div className="front-loader">
            <div className="spinner"></div>
            <div className="front-loading-text">
              Loading...
            </div>
          </div>

        ) : (

          <>
            <div className="front-title">
              Welcome to Rabah CRM
            </div>

            <div className="front-subtitle">
              Manage leads, sales and inventory in one place
            </div>

            <div className="front-buttons">

              <button
                className="front-btn login"
                onClick={() => navigate("/login")}
              >
                Login
              </button>

              <button
                className="front-btn signup"
                onClick={() => navigate("/signup")}
              >
                Signup
              </button>

            </div>
          </>
        )}

      </div>

    </div>
  );
}