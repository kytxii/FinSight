import { useTheme } from "../hooks/useTheme";

export default function Footer() {
  const dark = useTheme();
  const border = dark ? "var(--dark-border)" : "var(--light-border)";
  const muted = dark
    ? "color-mix(in srgb, var(--dark-text) 45%, transparent)"
    : "color-mix(in srgb, var(--light-text) 45%, transparent)";

  return (
    <footer
      className="mt-10 px-6 py-6 border-t text-xs flex flex-col sm:flex-row items-center justify-between gap-3"
      style={{ borderColor: border, color: muted }}
    >
      <span>© {new Date().getFullYear()} FinSight. All rights reserved.</span>
      <div className="flex items-center gap-4">
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/kytxii"
          className="hover:opacity-100 transition-opacity duration-150"
          style={{ color: muted }}
        >
          GitHub
        </a>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://www.linkedin.com/in/kyle-d-tilley/"
          className="hover:opacity-100 transition-opacity duration-150"
          style={{ color: muted }}
        >
          LinkedIn
        </a>
      </div>
    </footer>
  );
}
