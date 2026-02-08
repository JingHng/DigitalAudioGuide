import { useLocation, Link } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./css/Footer.css";

/**
 * Footer variants:
 * - "public": Used for both unauthenticated and regular user pages.
 * - "admin": Used for admin dashboard pages (routes under /admin).
 */
type FooterVariant = "public" | "admin";

const ADMIN_SIDEBAR_WIDTH = 260;

const Footer = () => {
  const location = useLocation();
  const { user } = useAuth() as any;

  const isAdminRoute = location.pathname.startsWith("/admin");

  const variant: FooterVariant = useMemo(() => {
    // Admin pages always use the admin footer styling.
    // Public pages (including login/register) use the public footer styling.
    return isAdminRoute ? "admin" : "public";
  }, [isAdminRoute]);

  if (variant === "admin") {
    return (
      <footer
        className="se-footer footer--admin"
        style={
          {
            // Dynamic offset values are expressed as CSS variables
            // so that the rest of the styling stays in a CSS file.
            ["--admin-sidebar-width" as any]: `${ADMIN_SIDEBAR_WIDTH}px`,
          } as React.CSSProperties
        }
        aria-label="Admin footer"
      >
        <div className="footer__container footer__container--admin">
          <div className="footer__admin-left">
            <span className="footer__admin-title">SmartExhibit Admin</span>
            <span className="footer__admin-subtitle">
              Admin Dashboard · SP INC project group 3
            </span>
          </div>

          <div className="footer__admin-right">
            <div>
              Signed in as{" "}
              <span className="footer__admin-identity">
                {user?.username || user?.email || "Admin"}
              </span>
            </div>
            <div className="footer__muted">
              {new Date().getFullYear()} © SmartExhibit
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Public footer (unauthenticated + normal user)
  return (
    <footer className="se-footer se-footer--public" aria-label="Public footer">
      <div className="footer__container">
        <div className="footer__grid">
          {/* Brand block */}
          <div className="footer__brand">
            <div className="footer__brand-title">SmartExhibit</div>
            <div className="footer__brand-desc">
              For inquiries, please contact us at<br />
              https://www.sp.edu.sg/about-sp/contact-us<br />
            </div>
            <div className="footer__brand-meta">SP INC project group 3</div>
          </div>

          {/* Spacer column (kept intentionally for balanced layout) */}
          <div className="footer__spacer" />

          {/* Quick links (right aligned) */}
          <div className="footer__links">
            <div className="footer__links-title">Explore</div>
            <div className="footer__links-list">
              <Link className="footer__link" to="/exhibitions">
                Exhibitions
              </Link>
              <Link className="footer__link" to="/badges">
                Badges
              </Link>
              <Link className="footer__link" to="/reviews">
                Reviews
              </Link>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <span>
            {new Date().getFullYear()} © SmartExhibit. All rights reserved.
          </span>
          <span>Built for SP INC · Project Group 3</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
