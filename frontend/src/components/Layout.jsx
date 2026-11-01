import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

// Shared shell for every dashboard: top navbar + (responsive) sidebar + content area
export default function Layout({ title, tabs, active, onChange, children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleChange = (key) => {
    onChange(key);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar title={title} onMenu={() => setMenuOpen(true)} />
      <div className="flex">
        <Sidebar
          tabs={tabs}
          active={active}
          onChange={handleChange}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
