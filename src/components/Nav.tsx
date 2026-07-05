import Link from "next/link";

const links = [
  { href: "/", label: "首頁" },
  { href: "/write", label: "寫作" },
  { href: "/phrasebank", label: "語料庫" },
  { href: "/progress", label: "進度" },
];

export default function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-4xl items-center gap-1 px-4 py-3">
        <Link href="/" className="mr-4 font-bold text-slate-900">
          ✍️ Writing Trainer
        </Link>
        {links.slice(1).map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
