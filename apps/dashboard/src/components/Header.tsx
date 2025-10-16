import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Overview" },
  { to: "/factors", label: "Factor Library" }
];

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand text-white shadow"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  ].join(" ");

const Header = () => {
  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-lg font-semibold text-white">
            EF
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Emission Factors</p>
            <p className="text-xs text-slate-500">Data insights &amp; monitoring</p>
          </div>
        </div>

        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={linkClasses} end={item.to === "/"}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
