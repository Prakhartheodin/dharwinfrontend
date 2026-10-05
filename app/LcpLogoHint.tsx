/**
 * Early LCP asset in the server HTML so the logo is not discovered only
 * after client chrome (header/sidebar) hydrates. Visually hidden; BrandLogos
 * remains the accessible, theme-aware logo in the shell.
 */
export default function LcpLogoHint() {
  return (
    <img
      src="/assets/images/logo-140.webp"
      alt=""
      width={140}
      height={40}
      decoding="async"
      fetchPriority="high"
      className="sr-only"
      aria-hidden="true"
    />
  );
}
